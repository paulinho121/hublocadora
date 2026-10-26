-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V46_RENTAL_CONTRACTS
--
-- CONTRATO DE LOCAÇÃO ASSINADO PELAS DUAS PARTES
--   1. A locadora aprova o pedido (todos os itens dela respondidos) →
--      o banco gera o contrato com os dados finais (itens, retirada, gravação,
--      devolução e valores). Um contrato por pedido e por locadora.
--   2. O cliente lê e assina (aceite eletrônico: nome, CPF/CNPJ, data/hora, IP,
--      aparelho e o hash SHA-256 do texto exato que leu).
--   3. A locadora contra-assina o mesmo texto (o hash precisa bater).
--   4. Enquanto faltar assinatura, o equipamento não sai: a entrega não passa
--      para "em trânsito"/"entregue" e o pedido não fica "em andamento".
--
--   Se a locadora alterar datas, quantidade ou valor de um item aprovado (ou um
--   item for recusado/cancelado), o contrato em aberto é anulado e um novo é
--   gerado para as duas partes assinarem de novo.
--
--   Pedidos já aprovados antes desta migração não exigem contrato
--   (bookings.contract_required = false). Pedidos novos e os ainda pendentes, sim.
--
-- Rode depois da V45. Pode rodar mais de uma vez.
-- ==============================================================================


-- ── 1. Pedidos: exige contrato? ───────────────────────────────────────────────
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contract_required boolean NOT NULL DEFAULT false;
-- Daqui em diante, todo pedido novo exige contrato
ALTER TABLE public.bookings ALTER COLUMN contract_required SET DEFAULT true;
-- Os que ainda aguardam aprovação também
UPDATE public.bookings SET contract_required = true WHERE status = 'pending' AND contract_required = false;


-- ── 2. Tabela de contratos ────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.rental_contract_seq;

CREATE TABLE IF NOT EXISTS public.rental_contracts (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                     text NOT NULL UNIQUE,
    project_id               uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    company_id               uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    renter_id                uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_ids              uuid[] NOT NULL,
    -- Dados do pedido no momento da geração (o texto é montado a partir deles)
    data                     jsonb NOT NULL,
    template_version         text NOT NULL DEFAULT 'v1',
    status                   text NOT NULL DEFAULT 'awaiting_renter'
                             CHECK (status IN ('awaiting_renter', 'awaiting_company', 'signed', 'void')),
    -- Texto exato assinado (gravado na assinatura do cliente) e o hash dele
    content                  text,
    content_hash             text,
    -- Cliente
    renter_signed_at         timestamptz,
    renter_signer_id         uuid,
    renter_signer_name       text,
    renter_signer_document   text,
    renter_ip                text,
    renter_user_agent        text,
    -- Locadora
    company_signed_at        timestamptz,
    company_signer_id        uuid,
    company_signer_name      text,
    company_signer_document  text,
    company_ip               text,
    company_user_agent       text,
    void_reason              text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rental_contracts_booking_ids_idx ON public.rental_contracts USING gin (booking_ids);
CREATE INDEX IF NOT EXISTS rental_contracts_company_idx ON public.rental_contracts (company_id);
CREATE INDEX IF NOT EXISTS rental_contracts_renter_idx ON public.rental_contracts (renter_id);

-- Leitura: o cliente, a locadora (ou gerente de filial dela) e o admin.
-- Escrita: só pelas funções abaixo (não há política de INSERT/UPDATE/DELETE).
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rental_Contracts_Select" ON public.rental_contracts;
CREATE POLICY "Rental_Contracts_Select" ON public.rental_contracts
    FOR SELECT TO authenticated
    USING (
        renter_id = auth.uid()
        OR company_id = public.get_my_company_id()
        OR public.is_branch_manager_of(company_id)
        OR public.cinehub_is_admin()
    );

GRANT SELECT ON public.rental_contracts TO authenticated;

-- Realtime: as duas partes veem a assinatura da outra sem recarregar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rental_contracts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_contracts;
    END IF;
END $$;


-- ── 3. Geração do contrato ────────────────────────────────────────────────────
-- Contrato assinado que cobre este pedido?
CREATE OR REPLACE FUNCTION public.booking_contract_signed(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.rental_contracts
        WHERE status = 'signed' AND p_booking_id = ANY (booking_ids)
    );
$$;

GRANT EXECUTE ON FUNCTION public.booking_contract_signed(uuid) TO authenticated;

-- Anula os contratos em aberto (ou assinados, antes da retirada) que cobrem o pedido
CREATE OR REPLACE FUNCTION public.void_booking_contracts(p_booking_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.rental_contracts
    SET status = 'void', void_reason = p_reason, updated_at = now()
    WHERE status <> 'void' AND p_booking_id = ANY (booking_ids);
END;
$$;

-- Gera o contrato do pedido (grupo = project_id, ou o próprio item) para uma locadora,
-- quando todos os itens dela já foram respondidos e há itens aprovados que exigem contrato.
CREATE OR REPLACE FUNCTION public.ensure_rental_contract(p_group_key uuid, p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ids uuid[];
    v_existing uuid;
    v_first record;
    v_company record;
    v_renter record;
    v_project_name text;
    v_items jsonb;
    v_total numeric;
    v_id uuid;
BEGIN
    -- Ainda há item aguardando resposta da locadora: espera
    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE COALESCE(project_id, id) = p_group_key AND company_id = p_company_id AND status = 'pending'
    ) THEN
        RETURN NULL;
    END IF;

    SELECT array_agg(id ORDER BY created_at, id) INTO v_ids
    FROM public.bookings
    WHERE COALESCE(project_id, id) = p_group_key AND company_id = p_company_id
      AND status = 'approved' AND contract_required;

    IF v_ids IS NULL THEN
        RETURN NULL;
    END IF;

    -- Já existe um contrato válido com exatamente estes itens
    SELECT id INTO v_existing FROM public.rental_contracts
    WHERE status <> 'void' AND booking_ids @> v_ids AND booking_ids <@ v_ids
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
        RETURN v_existing;
    END IF;

    -- Os contratos antigos destes itens deixam de valer
    UPDATE public.rental_contracts
    SET status = 'void', void_reason = 'Pedido alterado: um novo contrato foi gerado.', updated_at = now()
    WHERE status <> 'void' AND booking_ids && v_ids;

    SELECT * INTO v_first FROM public.bookings WHERE id = v_ids[1];
    SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
    SELECT p.full_name, p.email, c.name AS company_name, c.document AS company_document
      INTO v_renter
      FROM public.profiles p
      LEFT JOIN public.companies c ON c.id = p.company_id
     WHERE p.id = v_first.renter_id;
    SELECT name INTO v_project_name FROM public.projects WHERE id = v_first.project_id;

    SELECT jsonb_agg(jsonb_build_object(
               'booking_id',   b.id,
               'name',         e.name,
               'brand',        e.brand,
               'quantity',     COALESCE(b.quantity, 1),
               'daily_rate',   e.daily_rate,
               'pickup_date',  b.start_date,
               'return_date',  b.end_date,
               'shoot_dates',  COALESCE(to_jsonb(b.shoot_dates), '[]'::jsonb),
               'shoot_start',  b.shoot_start_date,
               'shoot_end',    b.shoot_end_date,
               'total',        b.total_amount
           ) ORDER BY b.created_at, b.id),
           SUM(b.total_amount)
      INTO v_items, v_total
      FROM public.bookings b
      JOIN public.equipments e ON e.id = b.equipment_id
     WHERE b.id = ANY (v_ids);

    INSERT INTO public.rental_contracts (code, project_id, company_id, renter_id, booking_ids, data)
    VALUES (
        'CT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rental_contract_seq')::text, 5, '0'),
        v_first.project_id,
        p_company_id,
        v_first.renter_id,
        v_ids,
        jsonb_build_object(
            'project_name',     NULLIF(v_project_name, 'Projeto via HUB'),
            'company', jsonb_build_object(
                'name',         v_company.name,
                'document',     v_company.document,
                'address',      concat_ws(', ',
                                    NULLIF(concat_ws(' ', v_company.address_street, v_company.address_number), ''),
                                    v_company.address_complement, v_company.address_neighborhood,
                                    NULLIF(concat_ws(' - ', v_company.address_city, v_company.address_state), ''),
                                    v_company.address_zip),
                'city',         v_company.address_city,
                'state',        v_company.address_state
            ),
            'renter', jsonb_build_object(
                'name',         v_renter.full_name,
                'email',        v_renter.email,
                'company_name', v_renter.company_name,
                'company_document', v_renter.company_document
            ),
            'pickup_date',      (SELECT MIN(start_date) FROM public.bookings WHERE id = ANY (v_ids)),
            'return_date',      (SELECT MAX(end_date) FROM public.bookings WHERE id = ANY (v_ids)),
            'delivery_method',  v_first.delivery_method,
            'delivery_address', v_first.delivery_address,
            'items',            v_items,
            'total',            v_total,
            'generated_at',     now()
        )
    )
    RETURNING id INTO v_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_first.renter_id, 'Contrato para assinar',
            v_company.name || ' aprovou seu pedido. Leia e assine o contrato para liberar a retirada/entrega.',
            'booking');

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_rental_contract(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_booking_contracts(uuid, text) FROM PUBLIC;


-- ── 4. Gatilhos nos pedidos ───────────────────────────────────────────────────
-- Antes: contract_required só muda pelo admin; "em andamento" exige contrato assinado
CREATE OR REPLACE FUNCTION public.enforce_booking_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- precisa ver o current_user de quem chamou (ver is_direct_api_call)
SET search_path = public
AS $$
BEGIN
    IF public.cinehub_is_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF public.is_direct_api_call() THEN
            NEW.contract_required := true;
        END IF;
        RETURN NEW;
    END IF;

    IF public.is_direct_api_call() THEN
        NEW.contract_required := OLD.contract_required;
    END IF;

    IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active'
       AND NEW.contract_required AND NOT public.booking_contract_signed(NEW.id) THEN
        RAISE EXCEPTION 'O contrato de locação ainda não foi assinado pelo cliente e pela locadora.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_contract ON public.bookings;
CREATE TRIGGER trg_enforce_booking_contract
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_contract();

-- Depois: gera, anula ou refaz o contrato conforme o pedido muda
CREATE OR REPLACE FUNCTION public.sync_booking_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_changed boolean;
BEGIN
    IF NOT NEW.contract_required OR OLD.status NOT IN ('pending', 'approved') THEN
        RETURN NEW; -- depois da retirada, mudanças seguem pela prorrogação/devolução
    END IF;

    v_changed := NEW.start_date IS DISTINCT FROM OLD.start_date
              OR NEW.end_date IS DISTINCT FROM OLD.end_date
              OR NEW.shoot_dates IS DISTINCT FROM OLD.shoot_dates
              OR NEW.quantity IS DISTINCT FROM OLD.quantity
              OR NEW.total_amount IS DISTINCT FROM OLD.total_amount;

    IF NEW.status IN ('rejected', 'cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM public.void_booking_contracts(NEW.id, 'Item recusado ou cancelado: um novo contrato foi gerado.');
    ELSIF NEW.status = 'approved' AND OLD.status = 'approved' AND v_changed THEN
        PERFORM public.void_booking_contracts(NEW.id, 'Pedido alterado: um novo contrato foi gerado.');
    ELSIF NOT (NEW.status = 'approved' AND OLD.status = 'pending') THEN
        RETURN NEW;
    END IF;

    PERFORM public.ensure_rental_contract(COALESCE(NEW.project_id, NEW.id), NEW.company_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_contract ON public.bookings;
CREATE TRIGGER trg_sync_booking_contract
    AFTER UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.sync_booking_contract();


-- ── 5. Entregas: o equipamento só sai com o contrato assinado ─────────────────
CREATE OR REPLACE FUNCTION public.enforce_delivery_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('shipped', 'delivered', 'confirmed')
       AND NOT public.cinehub_is_admin()
       AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = NEW.booking_id AND b.contract_required)
       AND NOT public.booking_contract_signed(NEW.booking_id) THEN
        RAISE EXCEPTION 'O equipamento só pode sair depois que o cliente e a locadora assinarem o contrato.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_delivery_contract ON public.deliveries;
CREATE TRIGGER trg_enforce_delivery_contract
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.enforce_delivery_contract();


-- ── 6. Assinatura ─────────────────────────────────────────────────────────────
-- O cliente assina primeiro (grava o texto exato); a locadora contra-assina o mesmo texto.
CREATE OR REPLACE FUNCTION public.sign_rental_contract(
    p_contract_id uuid,
    p_signer_name text,
    p_signer_document text,
    p_content text,
    p_user_agent text DEFAULT NULL
)
RETURNS public.rental_contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_c public.rental_contracts;
    v_headers json;
    v_ip text;
    v_doc text := regexp_replace(COALESCE(p_signer_document, ''), '\D', '', 'g');
    v_name text := btrim(COALESCE(p_signer_name, ''));
    v_hash text;
    v_is_provider boolean;
BEGIN
    SELECT * INTO v_c FROM public.rental_contracts WHERE id = p_contract_id FOR UPDATE;
    IF v_c.id IS NULL THEN
        RAISE EXCEPTION 'Contrato não encontrado.';
    END IF;
    IF v_c.status = 'void' THEN
        RAISE EXCEPTION 'Este contrato foi substituído por uma versão nova. Atualize a página.';
    END IF;
    IF v_c.status = 'signed' THEN
        RAISE EXCEPTION 'Este contrato já foi assinado pelas duas partes.';
    END IF;
    IF length(v_name) < 5 OR position(' ' IN v_name) = 0 THEN
        RAISE EXCEPTION 'Informe o nome completo de quem está assinando.';
    END IF;
    IF length(v_doc) NOT IN (11, 14) THEN
        RAISE EXCEPTION 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
    END IF;
    IF COALESCE(length(p_content), 0) < 200 THEN
        RAISE EXCEPTION 'Texto do contrato inválido. Atualize a página e tente de novo.';
    END IF;

    v_hash := encode(sha256(convert_to(p_content, 'UTF8')), 'hex');

    -- IP de quem chamou (repassado pelo gateway do Supabase)
    BEGIN
        v_headers := current_setting('request.headers', true)::json;
        v_ip := COALESCE(
            NULLIF(v_headers ->> 'cf-connecting-ip', ''),
            NULLIF(btrim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), ''),
            NULLIF(v_headers ->> 'x-real-ip', '')
        );
    EXCEPTION WHEN others THEN
        v_ip := NULL;
    END;

    v_is_provider := v_c.company_id = public.get_my_company_id() OR public.is_branch_manager_of(v_c.company_id);

    IF v_c.status = 'awaiting_renter' THEN
        IF v_c.renter_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'O cliente assina primeiro; depois a locadora contra-assina.';
        END IF;

        UPDATE public.rental_contracts SET
            status = 'awaiting_company',
            content = p_content,
            content_hash = v_hash,
            renter_signed_at = now(),
            renter_signer_id = auth.uid(),
            renter_signer_name = v_name,
            renter_signer_document = v_doc,
            renter_ip = v_ip,
            renter_user_agent = left(p_user_agent, 400),
            updated_at = now()
        WHERE id = v_c.id
        RETURNING * INTO v_c;

        PERFORM public.notify_booking_company(v_c.booking_ids[1], 'Contrato assinado pelo cliente',
            'O cliente assinou o contrato ' || v_c.code || '. Contra-assine para liberar a saída do equipamento.', 'booking');

    ELSE -- awaiting_company
        IF NOT v_is_provider THEN
            RAISE EXCEPTION 'Só a locadora pode contra-assinar este contrato.';
        END IF;
        IF v_hash IS DISTINCT FROM v_c.content_hash THEN
            RAISE EXCEPTION 'O texto do contrato não confere com o assinado pelo cliente. Atualize a página.';
        END IF;

        UPDATE public.rental_contracts SET
            status = 'signed',
            company_signed_at = now(),
            company_signer_id = auth.uid(),
            company_signer_name = v_name,
            company_signer_document = v_doc,
            company_ip = v_ip,
            company_user_agent = left(p_user_agent, 400),
            updated_at = now()
        WHERE id = v_c.id
        RETURNING * INTO v_c;

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (v_c.renter_id, 'Contrato assinado',
                'A locadora contra-assinou o contrato ' || v_c.code || '. A retirada/entrega está liberada.', 'booking');
    END IF;

    RETURN v_c;
END;
$$;

REVOKE ALL ON FUNCTION public.sign_rental_contract(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_rental_contract(uuid, text, text, text, text) TO authenticated;


-- ── 7. Pedidos aprovados pendentes de contrato (gerados agora) ────────────────
-- Itens que já exigem contrato e foram aprovados antes desta migração rodar
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT DISTINCT COALESCE(project_id, id) AS group_key, company_id
        FROM public.bookings
        WHERE status = 'approved' AND contract_required
    LOOP
        PERFORM public.ensure_rental_contract(r.group_key, r.company_id);
    END LOOP;
END $$;


-- ── 8. Conferência ──────────────────────────────────────────────────────────────
SELECT
    (SELECT count(*) FROM public.bookings WHERE contract_required) AS pedidos_com_contrato,
    (SELECT count(*) FROM public.rental_contracts)                  AS contratos;
