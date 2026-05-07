-- ==============================================================
-- ROLLBACK BANCO DE DADOS: RESTAURAR ESTADO DE ONTEM À NOITE
-- Execute este script no Supabase → SQL Editor
-- ==============================================================

-- 1. REMOVE TRIGGERS CRIADOS HOJE
DROP TRIGGER IF EXISTS on_booking_approved_create_delivery ON public.bookings;

-- 2. REMOVE FUNÇÕES MODIFICADAS HOJE
DROP FUNCTION IF EXISTS public.handle_booking_approval_logistics() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_company_id() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.approve_company(UUID) CASCADE;

-- 3. RESTAURA AS FUNÇÕES ORIGINAIS (V11 - DE ONTEM)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 4. REMOVE TODAS AS POLÍTICAS MODIFICADAS HOJE
DROP POLICY IF EXISTS "Profiles_Select_V11" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Modify_V11" ON public.profiles;
DROP POLICY IF EXISTS "Companies_Select_V11" ON public.companies;
DROP POLICY IF EXISTS "Companies_Modify_V11" ON public.companies;
DROP POLICY IF EXISTS "Equipments_Select_V11" ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Modify_V11" ON public.equipments;
DROP POLICY IF EXISTS "Branches_Select_V11" ON public.branches;
DROP POLICY IF EXISTS "Branches_Modify_V11" ON public.branches;
DROP POLICY IF EXISTS "Bookings_Master_Policy" ON public.bookings;
DROP POLICY IF EXISTS "Deliveries_Master_Policy" ON public.deliveries;
DROP POLICY IF EXISTS "Transfers_Master_Policy" ON public.internal_transfers;

-- 5. RESTAURA AS POLÍTICAS ORIGINAIS (V11 - DE ONTEM)

-- PROFILES
CREATE POLICY "Profiles_Select_V11" ON public.profiles FOR SELECT TO authenticated
    USING (
        id = auth.uid() 
        OR company_id = public.get_my_company_id()
        OR public.check_is_admin()
    );

CREATE POLICY "Profiles_Modify_V11" ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.check_is_admin())
    WITH CHECK (id = auth.uid() OR public.check_is_admin());

-- COMPANIES
CREATE POLICY "Companies_Select_V11" ON public.companies FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Companies_Modify_V11" ON public.companies FOR ALL TO authenticated
    USING (owner_id = auth.uid() OR public.check_is_admin())
    WITH CHECK (owner_id = auth.uid() OR public.check_is_admin());

-- EQUIPMENTS
CREATE POLICY "Equipments_Select_V11" ON public.equipments FOR SELECT TO authenticated
    USING (
        status != 'unavailable' 
        OR company_id = public.get_my_company_id() 
        OR public.check_is_admin()
        OR EXISTS (
            SELECT 1 FROM public.branches 
            WHERE company_id = equipments.company_id 
            AND manager_email = (auth.jwt() ->> 'email')
        )
    );

CREATE POLICY "Equipments_Modify_V11" ON public.equipments FOR ALL TO authenticated
    USING (company_id = public.get_my_company_id() OR public.check_is_admin())
    WITH CHECK (company_id = public.get_my_company_id() OR public.check_is_admin());

-- BRANCHES
CREATE POLICY "Branches_Select_V11" ON public.branches FOR SELECT TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        OR manager_email = (auth.jwt() ->> 'email')
        OR public.check_is_admin()
    );

CREATE POLICY "Branches_Modify_V11" ON public.branches FOR ALL TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        OR public.check_is_admin()
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        OR public.check_is_admin()
    );

-- BOOKINGS
CREATE POLICY "Bookings_Master_Policy" ON public.bookings FOR ALL TO authenticated
    USING (
        public.check_is_admin()
        OR company_id = public.get_my_company_id()
        OR renter_id = auth.uid()
        OR subrental_company_id = public.get_my_company_id()
        OR origin_branch_id IN (
            SELECT id FROM public.branches 
            WHERE company_id = public.get_my_company_id() 
            OR manager_email = (auth.jwt() ->> 'email')
        )
    );

-- DELIVERIES
CREATE POLICY "Deliveries_Master_Policy" ON public.deliveries FOR ALL TO authenticated
    USING (
        public.check_is_admin()
        OR fulfilling_company_id = public.get_my_company_id()
        OR origin_branch_id IN (
            SELECT id FROM public.branches 
            WHERE company_id = public.get_my_company_id() 
            OR manager_email = (auth.jwt() ->> 'email')
        )
        OR booking_id IN (
            SELECT id FROM public.bookings 
            WHERE company_id = public.get_my_company_id() 
            OR renter_id = auth.uid()
        )
    );

-- 6. FINALIZAÇÃO
NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'ROLLBACK CONCLUÍDO: Banco restaurado ao estado de ontem à noite (V11).'; END $$;
