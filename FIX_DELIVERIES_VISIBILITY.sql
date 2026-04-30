-- ==============================================================================
-- SENIOR ENGINEER FINAL RESOLUTION: MALHA DE SEGURANÇA E FLUXO HUB (V8)
-- 1. Resolve definitivamente o erro 403 (Forbidden) removendo consultas a 'auth.users'
-- 2. Utiliza auth.jwt() para obter o e-mail do usuário de forma segura no RLS
-- 3. Implementa a visibilidade multi-filial conforme o diagrama operacional
-- ==============================================================================

-- PARTE 1: Limpeza Radical de Conflitos
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'bookings', 'deliveries', 'equipments', 'companies', 'branches', 'internal_transfers'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- PARTE 2: Infraestrutura de Segurança (SECURITY DEFINER para quebrar recursão)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- PARTE 3: Políticas de Marketplace e Estrutura (Acesso Aberto para Autenticados)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow_Public_Profiles_V8" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow_Public_Companies_V8" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow_Public_Equipments_V8" ON public.equipments FOR SELECT TO authenticated USING (true);

-- PARTE 4: Política de Reservas (Bookings)
-- Correção crítica: Usando auth.jwt() ->> 'email' em vez de consultar auth.users
CREATE POLICY "Bookings_Operational_Access_V8" ON public.bookings
    FOR SELECT TO authenticated
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
    );

-- PARTE 5: Política de Logística (Deliveries)
CREATE POLICY "Deliveries_Operational_Access_V8" ON public.deliveries
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
                OR EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = b.renter_id AND p.company_id = public.get_my_company_id()
                )
            )
        )
        OR public.check_is_admin()
    );

-- PARTE 6: Transferências Internas (Movimentação entre filiais)
CREATE POLICY "Internal_Transfers_Access_V8" ON public.internal_transfers
    FOR ALL TO authenticated
    USING (
        company_id = public.get_my_company_id()
        OR requester_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (auth.jwt() ->> 'email'))
        OR source_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (auth.jwt() ->> 'email'))
        OR public.check_is_admin()
    );

-- PARTE 7: Ativação de Realtime
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'deliveries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'internal_transfers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_transfers;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'V8: Erro 403 corrigido via JWT. Malha Operacional HUB ativa.'; END $$;
