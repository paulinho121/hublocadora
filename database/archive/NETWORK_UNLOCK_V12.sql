-- ==============================================================================
-- CINEHUB NETWORK UNLOCK: LIBERAÇÃO DE REDE (V12)
-- ==============================================================================
-- Este script remove os bloqueios que impediam filiais de receber pedidos
-- e unifica a lógica de permissões para donos de empresa e gerentes de unidade.
-- ==============================================================================

-- 1. ATUALIZAÇÃO DA FUNÇÃO DE IDENTIFICAÇÃO DE EMPRESA
-- Agora reconhece gerentes de filial como membros da empresa
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
    DECLARE
        comp_id uuid;
    BEGIN
        -- 1. Tenta pelo profile (Dono/Admin)
        SELECT company_id INTO comp_id FROM public.profiles WHERE id = auth.uid();
        
        -- 2. Se não encontrou, tenta pela filial (Gerente de Unidade)
        IF comp_id IS NULL THEN
            SELECT company_id INTO comp_id 
            FROM public.branches 
            WHERE manager_email = auth.jwt() ->> 'email' 
            LIMIT 1;
        END IF;
        
        RETURN comp_id;
    END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. FUNÇÃO PARA IDENTIFICAR A FILIAL DO USUÁRIO
CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS uuid AS $$
    SELECT id FROM public.branches 
    WHERE manager_email = auth.jwt() ->> 'email' 
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. CORREÇÃO DE ACESSO À LOGÍSTICA (DELIVERIES)
-- Permite que gerentes de unidade vejam e gerenciem entregas da sua unidade
CREATE OR REPLACE FUNCTION public.check_delivery_access(b_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.deliveries d
    LEFT JOIN public.companies c ON d.fulfilling_company_id = c.id
    LEFT JOIN public.branches br ON d.origin_branch_id = br.id
    WHERE d.booking_id = b_id 
    AND (
        c.owner_id = auth.uid() 
        OR br.manager_email = auth.jwt() ->> 'email'
        OR d.fulfilling_company_id = public.get_my_company_id()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. ATUALIZAÇÃO DAS POLÍTICAS DE REDE (BRANCHES & STOCK)
DROP POLICY IF EXISTS "Branches_Select_V11" ON public.branches;
DROP POLICY IF EXISTS "Branches_Modify_V11" ON public.branches;

CREATE POLICY "Branches_Network_Access_V12" ON public.branches
    FOR ALL TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        OR manager_email = auth.jwt() ->> 'email'
        OR public.check_is_admin()
    );

-- Garantir que o estoque seja visível para toda a rede (para transferências internas)
DROP POLICY IF EXISTS "Acesso ao estoque baseado na empresa" ON public.equipment_stock;
CREATE POLICY "Stock_Network_Access_V12" ON public.equipment_stock
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.branches b 
            WHERE b.id = equipment_stock.branch_id 
            AND b.company_id = public.get_my_company_id()
        )
        OR public.check_is_admin()
    );

-- 5. LIBERAÇÃO AUTOMÁTICA DE STATUS
-- Garante que todas as filiais existentes e novas estejam ATIVAS para operar
UPDATE public.branches SET status = 'active' WHERE status = 'invited';
ALTER TABLE public.branches ALTER COLUMN status SET DEFAULT 'active';

-- 6. RE-ESTABILIZAÇÃO DE BOOKINGS & DELIVERIES COM NOVA LÓGICA
DROP POLICY IF EXISTS "Booking_Final_Stabilized_V8" ON public.bookings;
CREATE POLICY "Booking_Network_Access_V12" ON public.bookings
    FOR ALL TO authenticated
    USING (
        renter_id = auth.uid() 
        OR company_id = public.get_my_company_id()
        OR public.check_delivery_access(id)
        OR public.check_is_admin()
    );

DROP POLICY IF EXISTS "Deliveries_Final_Stabilized_V8" ON public.deliveries;
CREATE POLICY "Deliveries_Network_Access_V12" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        fulfilling_company_id = public.get_my_company_id()
        OR origin_branch_id = public.get_my_branch_id()
        OR public.check_booking_ownership(booking_id)
        OR public.check_renter_access(booking_id)
        OR public.check_is_admin()
    );

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'CINEHUB NETWORK UNLOCK (V12): Rede liberada. Filiais agora podem receber e gerenciar pedidos plenamente.'; END $$;
