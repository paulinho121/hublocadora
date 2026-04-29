-- ================================================================
-- FINANCIAL VISIBILITY - SOLUÇÃO DEFINITIVA
-- Garante que sub-locadoras vejam seus ganhos sem erro 500
-- e sem vazar dados de outros tenants
-- ================================================================

-- PASSO 1: Funções auxiliares com SECURITY DEFINER (evitam recursão e erro 500)
-- ================================================================

-- Retorna o company_id do usuário logado (sem acionar RLS)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário logado é dono da empresa do booking
CREATE OR REPLACE FUNCTION public.i_own_booking(b_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = b_id AND company_id = public.get_my_company_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário logado é o fulfiller (sub-locadora) do booking
CREATE OR REPLACE FUNCTION public.i_fulfill_booking(b_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deliveries 
    WHERE booking_id = b_id AND fulfilling_company_id = public.get_my_company_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica se o usuário logado é o renter do booking
CREATE OR REPLACE FUNCTION public.i_rented_booking(b_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings WHERE id = b_id AND renter_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- PASSO 2: Política para BOOKINGS
-- ================================================================
-- Remove políticas conflitantes antigas
DROP POLICY IF EXISTS "Booking_Financial_Visibility_V1" ON public.bookings;
DROP POLICY IF EXISTS "Booking_Final_Stabilized_V8" ON public.bookings;
DROP POLICY IF EXISTS "Booking Policy V4" ON public.bookings;
DROP POLICY IF EXISTS "Booking_Definitive_V1" ON public.bookings;

-- Nova política que usa as funções SECURITY DEFINER (sem recursão)
CREATE POLICY "Booking_Definitive_V1" ON public.bookings
    FOR ALL TO authenticated
    USING (
        public.i_rented_booking(id)          -- Sou o locatário
        OR public.i_own_booking(id)           -- Sou o dono do equipamento
        OR public.i_fulfill_booking(id)       -- Sou a sub-locadora designada
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        public.i_own_booking(id)
        OR public.i_fulfill_booking(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- PASSO 3: Política para DELIVERIES
-- ================================================================
-- Remove políticas conflitantes antigas
DROP POLICY IF EXISTS "Delivery Comprehensive Access" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery_Subrental_Visibility_V2" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery_Definitive_V1" ON public.deliveries;

-- Nova política usando funções SECURITY DEFINER
CREATE POLICY "Delivery_Definitive_V1" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        fulfilling_company_id = public.get_my_company_id()
        OR public.i_own_booking(booking_id)
        OR public.i_rented_booking(booking_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        fulfilling_company_id = public.get_my_company_id()
        OR public.i_own_booking(booking_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- PASSO 4: Verificação final
-- ================================================================
-- Confirma que RLS está ativo nas duas tabelas
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Lista as políticas ativas para confirmar
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('bookings', 'deliveries')
ORDER BY tablename, policyname;
