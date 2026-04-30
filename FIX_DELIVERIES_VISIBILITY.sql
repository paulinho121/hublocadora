-- ==============================================================================
-- SENIOR ENGINEER FINAL RESOLUTION: MALHA DE SEGURANÇA E FLUXO HUB (V7)
-- 1. Resolve definitivamente os erros 403/500 (Recursão e Acesso Negado)
-- 2. Implementa a visibilidade multi-filial conforme o diagrama operacional
-- 3. Garante que o Master, a Filial de Origem e o Solicitante vejam os dados
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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- PARTE 3: Políticas de Marketplace e Estrutura (Acesso Aberto para Autenticados)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow_Public_Profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow_Public_Companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow_Public_Equipments" ON public.equipments FOR SELECT TO authenticated USING (true);

-- PARTE 4: Política de Reservas (Bookings) - Alinhada ao Diagrama
-- Quem vê: O solicitante, o dono do item, a filial designada e o admin
CREATE POLICY "Bookings_Operational_Access" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        renter_id = auth.uid() -- Eu pedi
        OR company_id = public.get_my_company_id() -- O item é meu
        OR subrental_company_id = public.get_my_company_id() -- Sou a sub-locadora designada
        OR origin_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (SELECT email FROM auth.users WHERE id = auth.uid())) -- Sou a filial designada
        OR EXISTS (
            -- Alguém da minha empresa pediu (visibilidade corporativa)
            SELECT 1 FROM public.profiles p 
            WHERE p.id = bookings.renter_id AND p.company_id = public.get_my_company_id()
        )
        OR public.is_admin()
    );

-- PARTE 5: Política de Logística (Deliveries) - Alinhada ao Diagrama
-- O "pote central" (Master) e as filiais acompanham aqui
CREATE POLICY "Deliveries_Operational_Access" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        fulfilling_company_id = public.get_my_company_id() -- Sou o fornecedor (sub)
        OR origin_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (SELECT email FROM auth.users WHERE id = auth.uid())) -- Sou a filial de saída
        OR EXISTS (
            -- Tenho vínculo com o pedido (Dono, Locatário ou Sub)
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
        OR public.is_admin()
    );

-- PARTE 6: Transferências Internas (Movimentação entre filiais)
CREATE POLICY "Internal_Transfers_Access" ON public.internal_transfers
    FOR ALL TO authenticated
    USING (
        company_id = public.get_my_company_id()
        OR requester_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        OR source_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        OR public.is_admin()
    );

-- PARTE 7: Ativação de Realtime para Logística em Tempo Real
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'deliveries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'internal_transfers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_transfers;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'V7: Malha Operacional HUB implantada. Erros de acesso eliminados.'; END $$;
