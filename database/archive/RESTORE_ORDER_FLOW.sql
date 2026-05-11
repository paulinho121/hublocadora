-- ==============================================================================
-- SUPER ENGINEER FINAL RESTORATION: FLUXO DE PEDIDOS E SEGURANÇA (V10)
-- 1. Restaura permissão de INSERÇÃO em Bookings (Criação de novos pedidos)
-- 2. Restaura permissão de ESCRITA em Companies/Branches/Equipments (Setup e Gestão)
-- 3. Mantém isolamento de Tenants e Visibilidade de Filiais (Branch Managers)
-- 4. Corrige o erro 403 ao tentar reservar ou configurar empresa
-- ==============================================================================

-- PARTE 0: Sincronização de Esquema (Garantir colunas críticas)
DO $$ 
BEGIN 
    -- Garantir notes em bookings
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'bookings' AND COLUMN_NAME = 'notes') THEN
        ALTER TABLE public.bookings ADD COLUMN notes TEXT;
    END IF;
    
    -- Garantir company_id em profiles
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'company_id') THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
    END IF;

    -- Garantir status em companies
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE public.companies ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- PARTE 1: Infraestrutura de Segurança (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- PARTE 2: Limpeza Radical de Conflitos (Tabelas Core)
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'bookings', 'deliveries', 'equipments', 'companies', 'branches', 'internal_transfers'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- PARTE 3: Políticas de Acesso Sistêmico (V10)

-- 3.1 PROFILES (Visibilidade Total + Escrita no Próprio)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles_Access_V10" ON public.profiles FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (id = auth.uid() OR public.check_is_admin());

-- 3.2 COMPANIES (Visibilidade Total + Escrita do Dono)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies_Access_V10" ON public.companies FOR ALL TO authenticated
    USING (true)
    WITH CHECK (owner_id = auth.uid() OR public.check_is_admin());

-- 3.3 EQUIPMENTS (Visibilidade Total + Escrita da Locadora)
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipments_Access_V10" ON public.equipments FOR ALL TO authenticated
    USING (true)
    WITH CHECK (company_id = public.get_my_company_id() OR public.check_is_admin());

-- 3.4 BRANCHES (Visibilidade Total + Escrita da Empresa Mãe)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branches_Access_V10" ON public.branches FOR ALL TO authenticated
    USING (true)
    WITH CHECK (company_id = public.get_my_company_id() OR public.check_is_admin());

-- 3.5 BOOKINGS (O CORAÇÃO DO FIX - Restaura o INSERT)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookings_Access_V10" ON public.bookings
    FOR ALL TO authenticated
    USING (
        renter_id = auth.uid() 
        OR company_id = public.get_my_company_id()
        OR subrental_company_id = public.get_my_company_id()
        OR origin_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (auth.jwt() ->> 'email'))
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = bookings.renter_id AND p.company_id = public.get_my_company_id()
        )
        OR public.check_is_admin()
    )
    WITH CHECK (
        renter_id = auth.uid() 
        OR company_id = public.get_my_company_id()
        OR subrental_company_id = public.get_my_company_id()
        OR public.check_is_admin()
    );

-- 3.6 DELIVERIES (Logística Multi-Tenant)
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deliveries_Access_V10" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        fulfilling_company_id = public.get_my_company_id()
        OR origin_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (auth.jwt() ->> 'email'))
        OR EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = deliveries.booking_id 
            AND (
                b.renter_id = auth.uid() 
                OR b.company_id = public.get_my_company_id()
                OR b.subrental_company_id = public.get_my_company_id()
            )
        )
        OR public.check_is_admin()
    )
    WITH CHECK (true);

-- 3.7 INTERNAL TRANSFERS
ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transfers_Access_V10" ON public.internal_transfers
    FOR ALL TO authenticated
    USING (
        company_id = public.get_my_company_id()
        OR requester_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (auth.jwt() ->> 'email'))
        OR source_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (auth.jwt() ->> 'email'))
        OR public.check_is_admin()
    )
    WITH CHECK (company_id = public.get_my_company_id() OR public.check_is_admin());

-- PARTE 4: Reload Schema Cache
NOTIFY pgrst, 'reload schema';

DO $$ BEGIN RAISE NOTICE 'V10: Fluxo de criação de pedidos e configuração de empresas RESTAURADO.'; END $$;
