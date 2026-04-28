-- ==========================================
-- CORREÇÃO DEFINITIVA DE RLS (FIM DO ERRO 500)
-- Quebrando a referência circular entre Bookings e Deliveries
-- ==========================================

-- 1. Criar função auxiliar para verificar acesso à entrega (Ignora RLS circular)
CREATE OR REPLACE FUNCTION public.check_delivery_access(b_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Verifica se o usuário atual é o responsável pela entrega (fulfilling_company)
  RETURN EXISTS (
    SELECT 1 FROM public.deliveries d
    JOIN public.companies c ON d.fulfilling_company_id = c.id
    WHERE d.booking_id = b_id AND c.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar função auxiliar para verificar acesso ao booking (Ignora RLS circular)
CREATE OR REPLACE FUNCTION public.check_booking_ownership(b_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Verifica se o usuário atual é o dono da empresa que criou o booking
  RETURN EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.companies c ON b.company_id = c.id
    WHERE b.id = b_id AND c.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar política de BOOKINGS
DROP POLICY IF EXISTS "Booking_Full_Access_V6_Financial" ON public.bookings;
DROP POLICY IF EXISTS "Booking Policy V4" ON public.bookings;

CREATE POLICY "Booking_Final_Stabilized_V7" ON public.bookings
    FOR ALL TO authenticated
    USING (
        renter_id = auth.uid() 
        OR company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        OR public.check_delivery_access(id) -- Usa a função para quebrar o loop
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Atualizar política de DELIVERIES
DROP POLICY IF EXISTS "Deliveries_Financial_Access_V6" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Access V3" ON public.deliveries;

CREATE POLICY "Deliveries_Final_Stabilized_V7" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        fulfilling_company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        OR public.check_booking_ownership(booking_id) -- Usa a função para quebrar o loop
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. Garantir RLS ativa
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

COMMENT ON FUNCTION public.check_delivery_access IS 'Quebra a recursividade de RLS para acesso a entregas.';
COMMENT ON FUNCTION public.check_booking_ownership IS 'Quebra a recursividade de RLS para acesso a reservas.';
