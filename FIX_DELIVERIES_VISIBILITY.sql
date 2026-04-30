-- ======================================================
-- FIX: VISIBILIDADE COMPARTILHADA DE LOGÍSTICA (V3)
-- Garante que filiais e membros da mesma empresa vejam
-- todos os fluxos (pedidos, reservas e perfis) da organização.
-- ======================================================

-- 1. RLS: PERFIS (PROFILES)
-- Permite que membros da mesma empresa vejam os perfis uns dos outros
DROP POLICY IF EXISTS "Profiles Company Access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles SELECT" ON public.profiles;
CREATE POLICY "Profiles Company Access" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR role = 'rental_house'
        OR auth.uid() = id
        OR public.is_admin()
    );

-- 2. RLS: RESERVAS (BOOKINGS)
-- Permite que membros da mesma empresa vejam as reservas da empresa
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings Company Access" ON public.bookings;
CREATE POLICY "Bookings Company Access" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        renter_id = auth.uid() 
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = bookings.renter_id 
            AND p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
        OR subrental_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR public.is_admin()
    );

-- 3. RLS: ENTREGAS (DELIVERIES)
-- Permite que membros da mesma empresa vejam os fluxos logísticos
DROP POLICY IF EXISTS "Delivery Full Access Policy" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Comprehensive Access" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view deliveries of their bookings" ON public.deliveries;
DROP POLICY IF EXISTS "Companies can update their deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Companies can view their own deliveries" ON public.deliveries;

CREATE POLICY "Deliveries Shared Access" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            LEFT JOIN public.profiles p ON b.renter_id = p.id
            WHERE b.id = deliveries.booking_id 
            AND (
                b.renter_id = auth.uid() 
                OR p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
                OR b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
                OR b.subrental_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
            )
        )
        OR fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR origin_branch_id IN (SELECT id FROM public.branches WHERE manager_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        OR public.is_admin()
    );

-- 4. FUNÇÃO AUXILIAR (Se não existir)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN RAISE NOTICE 'V3: Malha de visibilidade organizacional restaurada.'; END $$;
