-- ======================================================
-- FINAL RECOVERY FIX: RESTAURAÇÃO DE ACESSO (V6)
-- Resolve o erro 403 (Forbidden) simplificando as políticas
-- e garantindo visibilidade total para usuários autenticados.
-- ======================================================

-- 1. Limpeza de Políticas Anteriores
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'bookings', 'deliveries', 'equipments'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. Funções de Apoio (Mais robustas)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. Políticas Simplificadas (Foco em Restaurar Operação)

-- PROFILES: Leitura aberta para autenticados (necessário para exibir nomes em listas)
CREATE POLICY "Profiles_Authenticated_Select" ON public.profiles FOR SELECT TO authenticated USING (true);

-- EQUIPMENTS: Leitura aberta (marketplace)
CREATE POLICY "Equipments_Public_Select" ON public.equipments FOR SELECT USING (true);

-- BOOKINGS: Visibilidade para Renter, Dona, Sub ou Admin
CREATE POLICY "Bookings_Visibility" ON public.bookings FOR SELECT TO authenticated
USING (
    renter_id = auth.uid() 
    OR company_id = public.get_my_company_id()
    OR subrental_company_id = public.get_my_company_id()
    OR public.check_is_admin()
);

-- DELIVERIES: Visibilidade para quem participa do pedido ou é fulfiller
CREATE POLICY "Deliveries_Visibility" ON public.deliveries FOR SELECT TO authenticated
USING (
    fulfilling_company_id = public.get_my_company_id()
    OR origin_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
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
);

-- Permissões de Escrita (Dona do pedido ou Fulfiller)
CREATE POLICY "Deliveries_Write" ON public.deliveries FOR UPDATE TO authenticated
USING (
    fulfilling_company_id = public.get_my_company_id()
    OR EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = deliveries.booking_id 
        AND (b.company_id = public.get_my_company_id() OR b.subrental_company_id = public.get_my_company_id())
    )
    OR public.check_is_admin()
);

DO $$ BEGIN RAISE NOTICE 'V6: Acesso restaurado. Políticas simplificadas ativas.'; END $$;
