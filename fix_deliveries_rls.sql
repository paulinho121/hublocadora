-- ======================================================
-- CORREÇÃO DE RLS: ENTREGAS (DELIVERIES)
-- Permite que gerentes e administradores também atualizem
-- ======================================================

DROP POLICY IF EXISTS "Companies can update their deliveries" ON public.deliveries;
CREATE POLICY "Companies can update their deliveries" ON public.deliveries
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id 
            AND (
                -- Dono da Empresa
                b.company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
                OR 
                -- Colaborador da Empresa (Gerente/Membro)
                b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
                OR 
                -- Super Admin
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

DROP POLICY IF EXISTS "Users can view deliveries of their bookings" ON public.deliveries;
CREATE POLICY "Users can view deliveries of their bookings" ON public.deliveries
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id 
            AND (
                -- Cliente (Locatário)
                b.renter_id = auth.uid() 
                OR 
                -- Dono da Empresa
                b.company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
                OR 
                -- Colaborador da Empresa
                b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
                OR 
                -- Super Admin
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );
