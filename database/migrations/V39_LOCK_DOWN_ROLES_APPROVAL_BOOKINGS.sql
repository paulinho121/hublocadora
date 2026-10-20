-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V39_LOCK_DOWN_ROLES_APPROVAL_BOOKINGS
--
-- Varredura de RLS (políticas reais do banco). Corrige o que permitia a uma
-- locadora/usuário logado agir além do que deveria:
--
--   1. PERFIS: profiles_update deixa o usuário alterar qualquer coluna do
--      próprio perfil → podia virar admin (role) ou se "mudar" para a empresa
--      de um concorrente (company_id) e ganhar acesso a tudo dela.
--   2. EMPRESAS: o dono podia aprovar a própria empresa (status), ou já criá-la
--      aprovada, pulando a análise do admin.
--   3. EMPRESAS: "Companies_Select_V1" (USING true) expunha todas as empresas,
--      inclusive pendentes/suspensas.
--   4. EQUIPAMENTOS: itens de empresas não aprovadas apareciam no marketplace.
--   5. RESERVAS: o locatário podia criar a reserva já aprovada, apontar outra
--      locadora como dona, e depois alterar status (auto-aprovar), quantidade,
--      datas e valor.
--   6. ENTREGAS: o locatário podia alterar qualquer campo da entrega; a locadora
--      podia marcar "entregue" sem o token do cliente.
--   7. ESTOQUE POR FILIAL: "Users can view equipment stock for their company"
--      (USING true) mostrava o estoque de todas as locadoras.
--
-- Como funciona: gatilhos BEFORE INSERT/UPDATE (SECURITY INVOKER). Só valem
-- para chamadas diretas da API (current_user = authenticated/anon). Dentro de
-- funções SECURITY DEFINER do próprio sistema (approve_company,
-- verify_delivery_token, accept_branch_invite, handle_new_user...) o
-- current_user é o dono do banco, então elas não são afetadas.
-- ==============================================================================


-- ── Helpers ──────────────────────────────────────────────────────────────────
-- Chamada direta pela API (e não de dentro de uma função do sistema)
CREATE OR REPLACE FUNCTION public.is_direct_api_call()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT current_user IN ('authenticated', 'anon');
$$;

-- Checagem de admin que não depende de RLS em profiles
CREATE OR REPLACE FUNCTION public.cinehub_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_direct_api_call() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cinehub_is_admin() TO anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 1. PERFIS: role e company_id protegidos
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- precisa ver o current_user de quem chamou (ver is_direct_api_call)
SET search_path = public
AS $$
DECLARE
    v_email text := auth.jwt() ->> 'email';
    v_old_role text := CASE WHEN TG_OP = 'UPDATE' THEN OLD.role ELSE 'client' END;
    v_old_company uuid := CASE WHEN TG_OP = 'UPDATE' THEN OLD.company_id ELSE NULL END;
BEGIN
    IF NOT public.is_direct_api_call() OR public.cinehub_is_admin() THEN
        RETURN NEW;
    END IF;

    -- ROLE: nunca admin; branch_manager/rental_house só com vínculo real
    IF NEW.role IS DISTINCT FROM v_old_role THEN
        IF NEW.role = 'branch_manager'
           AND EXISTS (SELECT 1 FROM public.branches WHERE manager_email = v_email) THEN
            NULL; -- aceitar convite de filial
        ELSIF NEW.role = 'rental_house'
           AND EXISTS (SELECT 1 FROM public.companies
                       WHERE owner_id = auth.uid() AND status IN ('approved', 'active')) THEN
            NULL; -- dono de empresa já aprovada
        ELSE
            NEW.role := v_old_role; -- ignora a mudança (não quebra telas que enviam role)
        END IF;
    END IF;

    -- COMPANY_ID: só a própria empresa ou a empresa da filial que gerencia
    IF NEW.company_id IS DISTINCT FROM v_old_company AND NEW.company_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.company_id AND owner_id = auth.uid())
           AND NOT EXISTS (SELECT 1 FROM public.branches WHERE company_id = NEW.company_id AND manager_email = v_email) THEN
            RAISE EXCEPTION 'Você não pode se vincular a esta empresa.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. EMPRESAS: status, dono e empresa-mãe só pelo admin
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.protect_company_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- precisa ver o current_user de quem chamou (ver is_direct_api_call)
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_direct_api_call() OR public.cinehub_is_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.status := 'pending';
        NEW.parent_company_id := NULL;
        NEW.owner_id := auth.uid();
    ELSE
        NEW.status := OLD.status;
        NEW.parent_company_id := OLD.parent_company_id;
        NEW.owner_id := OLD.owner_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_company_fields ON public.companies;
CREATE TRIGGER trg_protect_company_fields
    BEFORE INSERT OR UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.protect_company_fields();


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. EMPRESAS: leitura só de aprovadas/ativas (ou da própria / admin)
--    (as colunas privadas já estão protegidas pela V38)
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Companies_Select_V1"  ON public.companies;
DROP POLICY IF EXISTS "Companies_Select_V12" ON public.companies;
DROP POLICY IF EXISTS "Companies_Select_V2"  ON public.companies;

CREATE POLICY "Companies_Select_V2" ON public.companies
    FOR SELECT TO public
    USING (
        status IN ('approved', 'active')
        OR (auth.uid() IS NOT NULL AND (
            owner_id = auth.uid()
            OR id = public.get_my_company_id()
            OR parent_company_id = public.get_my_company_id()
            OR public.is_branch_manager_of(id)
            OR public.cinehub_is_admin()
        ))
    );


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. EQUIPAMENTOS: marketplace só mostra itens de empresas aprovadas
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Equipments_Select_V2" ON public.equipments;

CREATE POLICY "Equipments_Select_V2" ON public.equipments
    FOR SELECT TO public
    USING (
        (status <> 'unavailable' AND EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = equipments.company_id AND c.status IN ('approved', 'active')
        ))
        OR (auth.uid() IS NOT NULL AND (
            company_id = public.get_my_company_id()
            OR EXISTS (
                SELECT 1 FROM public.companies c
                WHERE c.id = equipments.company_id
                  AND c.parent_company_id = public.get_my_company_id()
            )
            OR public.is_branch_manager_of(company_id)
            OR public.cinehub_is_admin()
        ))
    );


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RESERVAS
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.protect_booking_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- precisa ver o current_user de quem chamou (ver is_direct_api_call)
SET search_path = public
AS $$
DECLARE
    v_my_company uuid := public.get_my_company_id();
    v_is_provider boolean;
BEGIN
    IF NOT public.is_direct_api_call() OR public.cinehub_is_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Toda reserva nasce pendente, da locadora dona do equipamento, para quem a criou
        NEW.status := 'pending';
        NEW.renter_id := auth.uid();
        NEW.subrental_company_id := NULL;
        SELECT company_id INTO NEW.company_id FROM public.equipments WHERE id = NEW.equipment_id;
        IF NEW.company_id IS NULL THEN
            RAISE EXCEPTION 'Equipamento não encontrado.';
        END IF;
        RETURN NEW;
    END IF;

    -- Campos que identificam a reserva nunca mudam pela API
    NEW.renter_id := OLD.renter_id;
    NEW.company_id := OLD.company_id;
    NEW.equipment_id := OLD.equipment_id;

    v_is_provider := v_my_company IS NOT NULL AND (
        OLD.company_id = v_my_company
        OR OLD.subrental_company_id = v_my_company
        OR (OLD.origin_branch_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.branches b
            WHERE b.id = OLD.origin_branch_id AND b.company_id = v_my_company))
    ) OR (OLD.origin_branch_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.branches b
            WHERE b.id = OLD.origin_branch_id AND b.manager_email = (auth.jwt() ->> 'email')));

    IF v_is_provider THEN
        RETURN NEW; -- a locadora gerencia a própria reserva (aprovar, editar, concluir)
    END IF;

    -- Locatário: não altera valores, quantidades nem datas…
    NEW.total_amount := OLD.total_amount;
    NEW.quantity := OLD.quantity;
    NEW.start_date := OLD.start_date;
    NEW.end_date := OLD.end_date;
    NEW.subrental_company_id := OLD.subrental_company_id;
    NEW.origin_branch_id := OLD.origin_branch_id;

    -- …e só faz estas transições de status
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (NEW.status = 'cancelled' AND OLD.status IN ('pending', 'approved'))
        OR (NEW.status = 'active' AND OLD.status = 'approved')      -- confirmou o recebimento
        OR (NEW.status = 'completed' AND OLD.status = 'active')     -- devolução concluída
    ) THEN
        RAISE EXCEPTION 'Alteração de status não permitida: % → %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_booking_fields ON public.bookings;
CREATE TRIGGER trg_protect_booking_fields
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.protect_booking_fields();


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. ENTREGAS
-- ══════════════════════════════════════════════════════════════════════════════
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

    IF v_is_provider THEN
        -- "Entregue" só com o token do cliente (RPC verify_delivery_token);
        -- "Recebido e conferido" é confirmação do locatário.
        IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('delivered', 'confirmed')
           AND v_booking.renter_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Use o token do cliente para confirmar a entrega.';
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

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_delivery_fields ON public.deliveries;
CREATE TRIGGER trg_protect_delivery_fields
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.protect_delivery_fields();


-- ══════════════════════════════════════════════════════════════════════════════
-- 7. ESTOQUE POR FILIAL: remove a leitura aberta a todos os logados
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view equipment stock for their company" ON public.equipment_stock;


-- ── Conferência ──────────────────────────────────────────────────────────────
SELECT event_object_table AS tabela, trigger_name, action_timing, string_agg(event_manipulation, ', ') AS eventos
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_protect_%'
GROUP BY 1, 2, 3
ORDER BY 1;
