-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V41_RETURNS_AND_EXTENSIONS
--
-- Logística reversa: o cliente, com o equipamento em mãos, pode
--   • pedir a DEVOLUÇÃO — escolhendo levar até a locadora ("dropoff") ou pedir
--     coleta ("pickup", com endereço). A locadora avança: coleta → recebido →
--     conferido (conclui a locação).
--   • pedir PRORROGAÇÃO — nova data de devolução. O banco confere se o
--     equipamento está livre nos dias extras e calcula o adicional
--     (diária × dias extras × quantidade). A locadora aprova ou recusa; ao
--     aprovar, a data e o valor do pedido são atualizados.
--
-- Também fecha uma brecha da V39: o cliente conseguia alterar os campos de
-- devolução da entrega direto pela API (ex.: marcar como "concluída").
--
-- Pré-requisitos: V39 (protect_delivery_fields, is_direct_api_call, cinehub_is_admin).
-- ==============================================================================


-- ── 1. Forma de devolução escolhida pelo cliente ─────────────────────────────
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS return_method text;
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_return_method_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_return_method_check
    CHECK (return_method IS NULL OR return_method IN ('dropoff', 'pickup'));


-- ── 2. Pedidos de prorrogação ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_extensions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id       uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    requested_by     uuid NOT NULL,
    current_end_date date NOT NULL,
    new_end_date     date NOT NULL,
    extra_days       integer NOT NULL,
    extra_amount     numeric NOT NULL,
    status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    decided_by       uuid,
    decided_at       timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_extensions_booking_idx ON public.booking_extensions (booking_id);

ALTER TABLE public.booking_extensions ENABLE ROW LEVEL SECURITY;

-- Leitura: cliente do pedido, locadora (dona / sub-locadora / quem entrega) e admin.
-- Escrita só pelas funções abaixo (sem políticas de INSERT/UPDATE).
DROP POLICY IF EXISTS "Booking_Extensions_Select" ON public.booking_extensions;
CREATE POLICY "Booking_Extensions_Select" ON public.booking_extensions
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_extensions.booking_id
          AND (b.renter_id = auth.uid()
               OR b.company_id = public.get_my_company_id()
               OR b.subrental_company_id = public.get_my_company_id()
               OR public.cinehub_is_admin())
    ));

GRANT SELECT ON public.booking_extensions TO authenticated;

-- Realtime: a tela do pedido atualiza sozinha quando a locadora responde
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'booking_extensions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_extensions;
    END IF;
END $$;


-- ── 3. Helpers ───────────────────────────────────────────────────────────────
-- Avisa o dono da locadora do pedido
CREATE OR REPLACE FUNCTION public.notify_booking_company(p_booking_id uuid, p_title text, p_message text, p_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT c.owner_id, p_title, p_message, p_type
    FROM public.bookings b
    JOIN public.companies c ON c.id = b.company_id
    WHERE b.id = p_booking_id AND c.owner_id IS NOT NULL;
END;
$$;

-- O usuário logado é a locadora (ou admin) deste pedido?
CREATE OR REPLACE FUNCTION public.is_booking_provider(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.cinehub_is_admin() OR EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = p_booking_id
          AND (b.company_id = public.get_my_company_id()
               OR b.subrental_company_id = public.get_my_company_id())
    );
$$;

REVOKE ALL ON FUNCTION public.notify_booking_company(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_booking_provider(uuid) TO authenticated;


-- ── 4. Devolução: pedido do cliente ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_booking_return(p_booking_id uuid, p_method text, p_address text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking record;
    v_delivery record;
BEGIN
    IF p_method NOT IN ('dropoff', 'pickup') THEN
        RAISE EXCEPTION 'Forma de devolução inválida.';
    END IF;
    IF p_method = 'pickup' AND COALESCE(trim(p_address), '') = '' THEN
        RAISE EXCEPTION 'Informe o endereço para a coleta.';
    END IF;

    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF v_booking.id IS NULL OR v_booking.renter_id <> auth.uid() THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;
    IF v_booking.status <> 'active' THEN
        RAISE EXCEPTION 'A devolução pode ser pedida depois que você recebe o equipamento.';
    END IF;

    SELECT * INTO v_delivery FROM public.deliveries
    WHERE booking_id = p_booking_id ORDER BY created_at DESC LIMIT 1;
    IF v_delivery.id IS NULL THEN
        RAISE EXCEPTION 'Entrega não encontrada para este pedido.';
    END IF;
    IF COALESCE(v_delivery.reverse_logistics_status, 'not_started') NOT IN ('not_started', 'cancelled') THEN
        RAISE EXCEPTION 'A devolução deste pedido já foi solicitada.';
    END IF;

    UPDATE public.deliveries
    SET reverse_logistics_status = 'requested',
        return_method = p_method,
        reverse_logistics_address = CASE WHEN p_method = 'pickup' THEN trim(p_address) ELSE NULL END,
        updated_at = now()
    WHERE id = v_delivery.id;

    PERFORM public.notify_booking_company(
        p_booking_id,
        'Devolução solicitada',
        CASE WHEN p_method = 'pickup'
             THEN 'O cliente pediu a coleta do equipamento em: ' || trim(p_address)
             ELSE 'O cliente vai levar o equipamento até a locadora.' END,
        'logistics'
    );
END;
$$;

-- Cliente desiste da devolução enquanto a locadora ainda não começou
CREATE OR REPLACE FUNCTION public.cancel_booking_return(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = p_booking_id AND renter_id = auth.uid()) THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    UPDATE public.deliveries
    SET reverse_logistics_status = 'not_started', return_method = NULL,
        reverse_logistics_address = NULL, updated_at = now()
    WHERE booking_id = p_booking_id AND reverse_logistics_status = 'requested';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A devolução já está em andamento e não pode ser cancelada.';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_booking_return(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_return(uuid) TO authenticated;


-- ── 5. Prorrogação ───────────────────────────────────────────────────────────
-- Há unidades livres de (start, end] para este pedido, ignorando ele mesmo?
CREATE OR REPLACE FUNCTION public.extension_is_available(p_booking_id uuid, p_from date, p_to date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM generate_series(p_from, p_to, interval '1 day') AS d(day)
        CROSS JOIN public.bookings me
        JOIN public.equipments e ON e.id = me.equipment_id
        WHERE me.id = p_booking_id
          AND me.quantity + COALESCE((
                SELECT SUM(o.quantity) FROM public.bookings o
                WHERE o.equipment_id = me.equipment_id
                  AND o.id <> me.id
                  AND o.status IN ('pending', 'approved', 'active')
                  AND d.day::date BETWEEN o.start_date AND o.end_date
              ), 0) > e.stock_quantity
    );
$$;

CREATE OR REPLACE FUNCTION public.request_booking_extension(p_booking_id uuid, p_new_end_date date)
RETURNS public.booking_extensions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking record;
    v_rate numeric;
    v_days integer;
    v_row public.booking_extensions;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF v_booking.id IS NULL OR v_booking.renter_id <> auth.uid() THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;
    IF v_booking.status NOT IN ('approved', 'active') THEN
        RAISE EXCEPTION 'Só é possível prorrogar pedidos aprovados ou em andamento.';
    END IF;
    IF p_new_end_date <= v_booking.end_date THEN
        RAISE EXCEPTION 'A nova data precisa ser depois de %.', to_char(v_booking.end_date, 'DD/MM');
    END IF;
    IF EXISTS (SELECT 1 FROM public.booking_extensions WHERE booking_id = p_booking_id AND status = 'pending') THEN
        RAISE EXCEPTION 'Já existe um pedido de prorrogação aguardando a locadora.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.deliveries WHERE booking_id = p_booking_id
               AND COALESCE(reverse_logistics_status, 'not_started') NOT IN ('not_started', 'cancelled')) THEN
        RAISE EXCEPTION 'A devolução já foi solicitada. Cancele-a para prorrogar.';
    END IF;
    IF NOT public.extension_is_available(p_booking_id, v_booking.end_date + 1, p_new_end_date) THEN
        RAISE EXCEPTION 'O equipamento não está disponível em todos os dias até %.', to_char(p_new_end_date, 'DD/MM');
    END IF;

    SELECT daily_rate INTO v_rate FROM public.equipments WHERE id = v_booking.equipment_id;
    v_days := p_new_end_date - v_booking.end_date;

    INSERT INTO public.booking_extensions
        (booking_id, requested_by, current_end_date, new_end_date, extra_days, extra_amount)
    VALUES
        (p_booking_id, auth.uid(), v_booking.end_date, p_new_end_date, v_days,
         v_rate * v_days * GREATEST(COALESCE(v_booking.quantity, 1), 1))
    RETURNING * INTO v_row;

    PERFORM public.notify_booking_company(
        p_booking_id,
        'Pedido de prorrogação',
        'O cliente pediu para estender a locação até ' || to_char(p_new_end_date, 'DD/MM') ||
        ' (+' || v_days || ' diária' || CASE WHEN v_days > 1 THEN 's' ELSE '' END || ').',
        'booking'
    );

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_booking_extension(p_extension_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ext public.booking_extensions;
    v_booking record;
BEGIN
    SELECT * INTO v_ext FROM public.booking_extensions WHERE id = p_extension_id;
    IF v_ext.id IS NULL OR NOT public.is_booking_provider(v_ext.booking_id) THEN
        RAISE EXCEPTION 'Pedido de prorrogação não encontrado.';
    END IF;
    IF v_ext.status <> 'pending' THEN
        RAISE EXCEPTION 'Este pedido de prorrogação já foi respondido.';
    END IF;

    SELECT * INTO v_booking FROM public.bookings WHERE id = v_ext.booking_id;

    IF p_approve THEN
        -- Algo pode ter sido reservado nesse meio-tempo: confere de novo
        IF v_booking.end_date <> v_ext.current_end_date
           OR NOT public.extension_is_available(v_booking.id, v_ext.current_end_date + 1, v_ext.new_end_date) THEN
            RAISE EXCEPTION 'O equipamento não está mais disponível nesses dias. Recuse a prorrogação.';
        END IF;

        UPDATE public.bookings
        SET end_date = v_ext.new_end_date,
            total_amount = COALESCE(total_amount, 0) + v_ext.extra_amount
        WHERE id = v_booking.id;
    END IF;

    UPDATE public.booking_extensions
    SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
        decided_by = auth.uid(), decided_at = now()
    WHERE id = p_extension_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        v_booking.renter_id,
        CASE WHEN p_approve THEN 'Prorrogação aprovada' ELSE 'Prorrogação recusada' END,
        CASE WHEN p_approve
             THEN 'Sua locação foi estendida até ' || to_char(v_ext.new_end_date, 'DD/MM') || '.'
             ELSE 'A locadora não aprovou a prorrogação até ' || to_char(v_ext.new_end_date, 'DD/MM') || '.' END,
        'booking'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking_extension(p_extension_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.booking_extensions
    SET status = 'cancelled', decided_at = now()
    WHERE id = p_extension_id AND status = 'pending' AND requested_by = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido de prorrogação não encontrado ou já respondido.';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.extension_is_available(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_booking_extension(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_booking_extension(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_extension(uuid) TO authenticated;


-- ── 6. Trava das entregas: inclui os campos de devolução ─────────────────────
-- Cliente não altera devolução direto (só pelas funções acima). Locadora só
-- avança a devolução na ordem: pedida → coleta → recebida → conferida.
CREATE OR REPLACE FUNCTION public.protect_delivery_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- precisa ver o current_user de quem chamou (ver is_direct_api_call)
SET search_path = public
AS $$
DECLARE
    v_my_company uuid := public.get_my_company_id();
    v_email text := auth.jwt() ->> 'email';
    v_booking record;
    v_is_provider boolean;
BEGIN
    IF NOT public.is_direct_api_call() OR public.cinehub_is_admin() THEN
        RETURN NEW;
    END IF;

    SELECT company_id, subrental_company_id, renter_id INTO v_booking
    FROM public.bookings WHERE id = OLD.booking_id;

    v_is_provider := (v_my_company IS NOT NULL AND (
            OLD.fulfilling_company_id = v_my_company
            OR v_booking.company_id = v_my_company
            OR v_booking.subrental_company_id = v_my_company
            OR EXISTS (SELECT 1 FROM public.branches b
                       WHERE b.id = OLD.origin_branch_id AND b.company_id = v_my_company)))
        OR EXISTS (SELECT 1 FROM public.branches b
                   WHERE b.id = OLD.origin_branch_id AND b.manager_email = v_email);

    -- Campos fixos
    NEW.booking_id := OLD.booking_id;
    NEW.delivery_token := OLD.delivery_token;
    NEW.return_method := OLD.return_method;

    IF v_is_provider THEN
        -- "Entregue" só com o token do cliente (RPC verify_delivery_token);
        -- "Recebido e conferido" é confirmação do locatário.
        IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('delivered', 'confirmed')
           AND v_booking.renter_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Use o token do cliente para confirmar a entrega.';
        END IF;

        IF NEW.reverse_logistics_status IS DISTINCT FROM OLD.reverse_logistics_status AND NOT (
            (OLD.reverse_logistics_status = 'requested'  AND NEW.reverse_logistics_status IN ('collecting', 'returned'))
            OR (OLD.reverse_logistics_status IN ('collecting', 'in_transit') AND NEW.reverse_logistics_status = 'returned')
            OR (OLD.reverse_logistics_status = 'returned' AND NEW.reverse_logistics_status = 'completed')
        ) THEN
            RAISE EXCEPTION 'Etapa de devolução inválida: % → %', OLD.reverse_logistics_status, NEW.reverse_logistics_status;
        END IF;
        RETURN NEW;
    END IF;

    -- Locatário: só confirma o recebimento; o resto da entrega fica como está
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'delivered' AND NEW.status = 'confirmed') THEN
        RAISE EXCEPTION 'Alteração de status não permitida: % → %', OLD.status, NEW.status;
    END IF;

    NEW.fulfilling_company_id := OLD.fulfilling_company_id;
    NEW.origin_branch_id := OLD.origin_branch_id;
    NEW.driver_name := OLD.driver_name;
    NEW.driver_phone := OLD.driver_phone;
    NEW.current_lat := OLD.current_lat;
    NEW.current_lng := OLD.current_lng;
    NEW.dest_lat := OLD.dest_lat;
    NEW.dest_lng := OLD.dest_lng;
    NEW.location_updated_at := OLD.location_updated_at;
    NEW.estimated_arrival := OLD.estimated_arrival;
    NEW.subrental_status := OLD.subrental_status;
    -- Devolução: só pelas funções request/cancel_booking_return
    NEW.reverse_logistics_status := OLD.reverse_logistics_status;
    NEW.reverse_logistics_address := OLD.reverse_logistics_address;
    NEW.reverse_logistics_branch_id := OLD.reverse_logistics_branch_id;
    NEW.reverse_driver_name := OLD.reverse_driver_name;
    NEW.reverse_driver_phone := OLD.reverse_driver_phone;
    NEW.reverse_token := OLD.reverse_token;

    RETURN NEW;
END;
$$;


-- ── 7. Conferência ───────────────────────────────────────────────────────────
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('request_booking_return', 'cancel_booking_return', 'request_booking_extension',
                       'decide_booking_extension', 'cancel_booking_extension', 'extension_is_available')
ORDER BY routine_name;
