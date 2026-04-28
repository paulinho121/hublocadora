-- ======================================================
-- BRIDGE PERMISSIONS: ACESSO PARA SUB-LOCADORAS (FORNECEDORES EXTERNOS)
-- Este script permite que empresas que receberam uma atribuição de entrega
-- consigam ver os detalhes da reserva, equipamento e cliente.
-- ======================================================

-- 1. Permitir que fornecedores vejam a Reserva (Booking) vinculada à entrega
DROP POLICY IF EXISTS "View assigned bookings for delivery" ON public.bookings;
CREATE POLICY "View assigned bookings for delivery" ON public.bookings
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT booking_id FROM public.deliveries 
    WHERE fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR renter_id = auth.uid()
);

-- 2. Permitir que fornecedores vejam o Equipamento vinculado à entrega
DROP POLICY IF EXISTS "View assigned equipments for delivery" ON public.equipments;
CREATE POLICY "View assigned equipments for delivery" ON public.equipments
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT equipment_id FROM public.bookings 
    WHERE id IN (
      SELECT booking_id FROM public.deliveries 
      WHERE fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  )
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. Permitir que fornecedores vejam o Perfil do Cliente vinculado à entrega
DROP POLICY IF EXISTS "View assigned renter profiles for delivery" ON public.profiles;
CREATE POLICY "View assigned renter profiles for delivery" ON public.profiles
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT renter_id FROM public.bookings 
    WHERE id IN (
      SELECT booking_id FROM public.deliveries 
      WHERE fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  )
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR id = auth.uid()
);

-- 4. Ajustar permissão de UPDATE na tabela de entregas para o fornecedor
DROP POLICY IF EXISTS "Update assigned deliveries" ON public.deliveries;
CREATE POLICY "Update assigned deliveries" ON public.deliveries
FOR UPDATE TO authenticated
USING (
  fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
);
