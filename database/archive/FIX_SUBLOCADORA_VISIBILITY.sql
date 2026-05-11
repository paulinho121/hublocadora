-- ======================================================
-- FIX FINAL: VISIBILIDADE DE RESERVAS PARA SUB-LOCADORAS
-- ======================================================

-- 1. Cria função auxiliar de verificação
CREATE OR REPLACE FUNCTION public.is_subrental_provider(booking_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.deliveries 
        WHERE booking_id = booking_uuid 
        AND fulfilling_company_id = public.get_my_company_id()
    );
$$;

-- 2. Atualiza a política da tabela Bookings
DROP POLICY IF EXISTS "Booking Policy V4" ON public.bookings;
DROP POLICY IF EXISTS "Booking Policy V5" ON public.bookings;

CREATE POLICY "Booking Policy V5" ON public.bookings
    FOR ALL 
    TO authenticated
    USING (
        renter_id = auth.uid() 
        OR company_id = public.get_my_company_id()
        OR public.is_subrental_provider(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        renter_id = auth.uid() 
        OR company_id = public.get_my_company_id()
        OR public.is_subrental_provider(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Atualiza a política da tabela Deliveries
DROP POLICY IF EXISTS "Delivery Access V3" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Access V4" ON public.deliveries;

CREATE POLICY "Delivery Access V4" ON public.deliveries
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
        OR public.i_rented_booking(booking_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
