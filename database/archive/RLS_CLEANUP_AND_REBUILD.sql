-- ================================================================
-- LIMPEZA E RECONSTRUÇÃO DEFINITIVA DAS POLÍTICAS RLS
-- Remove TODAS as políticas conflitantes e cria apenas as necessárias
-- Seguro contra: Erro 500, Recursão, Vazamento entre Tenants
-- ================================================================

-- ================================================================
-- PARTE 1: REMOVER TODAS AS POLÍTICAS ANTIGAS (bookings + deliveries)
-- ================================================================

-- Bookings - remover tudo
DROP POLICY IF EXISTS "Booking_Definitive_V1" ON public.bookings;
DROP POLICY IF EXISTS "Booking_Financial_Visibility_V1" ON public.bookings;
DROP POLICY IF EXISTS "Booking_Final_Stabilized_V8" ON public.bookings;
DROP POLICY IF EXISTS "Booking_Insert_Safe" ON public.bookings;
DROP POLICY IF EXISTS "Booking_Select_Final" ON public.bookings;
DROP POLICY IF EXISTS "Booking_Update_Safe" ON public.bookings;
DROP POLICY IF EXISTS "Booking Policy V4" ON public.bookings;
DROP POLICY IF EXISTS "Bookings_Tenant_Insert" ON public.bookings;
DROP POLICY IF EXISTS "Bookings_Tenant_Isolation" ON public.bookings;
DROP POLICY IF EXISTS "Bookings_Update_Owner" ON public.bookings;
DROP POLICY IF EXISTS "Logistics_Bookings_Insert" ON public.bookings;
DROP POLICY IF EXISTS "Logistics_Bookings_Update" ON public.bookings;
DROP POLICY IF EXISTS "Tenant_Insert_Bookings_Final" ON public.bookings;
DROP POLICY IF EXISTS "Tenant_Isolation_Bookings" ON public.bookings;
-- Extras que possam existir
DROP POLICY IF EXISTS "Users can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Companies can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Companies can manage bookings" ON public.bookings;

-- Deliveries - remover tudo
DROP POLICY IF EXISTS "Delivery_Definitive_V1" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery_Subrental_Visibility_V2" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Comprehensive Access" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries_Final_Stabilized_V8" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries_Network_Access" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries_Network_Update" ON public.deliveries;
DROP POLICY IF EXISTS "Logistics_Deliveries_Delete" ON public.deliveries;
DROP POLICY IF EXISTS "Logistics_Deliveries_Insert_Final" ON public.deliveries;
DROP POLICY IF EXISTS "Master_can_assign_deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Tenant_Isolation_Deliveries" ON public.deliveries;
-- Extras
DROP POLICY IF EXISTS "Users can view deliveries of their bookings" ON public.deliveries;
DROP POLICY IF EXISTS "Companies can update their deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Companies can insert deliveries" ON public.deliveries;


-- ================================================================
-- PARTE 2: FUNÇÕES AUXILIARES (SECURITY DEFINER = sem recursão e sem erro 500)
-- ================================================================

-- Retorna o company_id do usuário logado sem acionar RLS
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário é o dono do pedido
CREATE OR REPLACE FUNCTION public.i_own_booking(b_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = b_id AND company_id = public.get_my_company_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário é a sub-locadora designada
CREATE OR REPLACE FUNCTION public.i_fulfill_booking(b_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deliveries 
    WHERE booking_id = b_id AND fulfilling_company_id = public.get_my_company_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário é o locatário
CREATE OR REPLACE FUNCTION public.i_rented_booking(b_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings WHERE id = b_id AND renter_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ================================================================
-- PARTE 3: CRIAR POLÍTICAS LIMPAS E DEFINITIVAS
-- ================================================================

-- BOOKINGS: Uma única política ALL (cobre SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Booking_Master_V1" ON public.bookings
    FOR ALL TO authenticated
    USING (
        public.i_rented_booking(id)    -- Sou o locatário
        OR public.i_own_booking(id)    -- Sou o dono do equipamento
        OR public.i_fulfill_booking(id) -- Sou a sub-locadora designada
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        public.i_own_booking(id)
        OR public.i_rented_booking(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- DELIVERIES: Uma única política ALL
CREATE POLICY "Delivery_Master_V1" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        fulfilling_company_id = public.get_my_company_id()
        OR public.i_own_booking(booking_id)
        OR public.i_rented_booking(booking_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        public.i_own_booking(booking_id)
        OR fulfilling_company_id = public.get_my_company_id()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Garante que RLS está ativo
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;


-- ================================================================
-- VERIFICAÇÃO: Deve retornar apenas 2 políticas
-- ================================================================
SELECT tablename, policyname, cmd, permissive
FROM pg_policies 
WHERE tablename IN ('bookings', 'deliveries')
ORDER BY tablename, policyname;
