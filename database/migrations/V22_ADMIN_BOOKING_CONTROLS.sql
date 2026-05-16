-- Migration: V22_ADMIN_BOOKING_CONTROLS
-- Descrição: Permite que Super Usuários (Admins) editem e excluam pedidos.

-- 1. Garantir ON DELETE CASCADE para facilitar a exclusão de pedidos
-- Nota: Supabase requer recriação de constraints se não houver CASCADE

DO $$ 
BEGIN
    -- Bookings -> Deliveries
    ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_booking_id_fkey;
    ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_booking_id_fkey 
        FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

    -- Bookings -> Payments
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_booking_id_fkey;
    ALTER TABLE public.payments ADD CONSTRAINT payments_booking_id_fkey 
        FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

    -- Bookings -> Logistics Tracking
    ALTER TABLE public.logistics_tracking DROP CONSTRAINT IF EXISTS logistics_tracking_booking_id_fkey;
    ALTER TABLE public.logistics_tracking ADD CONSTRAINT logistics_tracking_booking_id_fkey 
        FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
END $$;

-- 2. Atualizar Políticas de RLS para Bookings
DROP POLICY IF EXISTS "Bookings_Update_Admin" ON public.bookings;
CREATE POLICY "Bookings_Update_Admin" ON public.bookings
    FOR UPDATE TO authenticated
    USING (public.check_is_admin());

DROP POLICY IF EXISTS "Bookings_Delete_Admin" ON public.bookings;
CREATE POLICY "Bookings_Delete_Admin" ON public.bookings
    FOR DELETE TO authenticated
    USING (public.check_is_admin());

-- 3. Atualizar Políticas de RLS para Deliveries
DROP POLICY IF EXISTS "Deliveries_Delete_Admin" ON public.deliveries;
CREATE POLICY "Deliveries_Delete_Admin" ON public.deliveries
    FOR DELETE TO authenticated
    USING (public.check_is_admin());

-- 4. Atualizar Políticas de RLS para Delivery Secrets
DROP POLICY IF EXISTS "Delivery_Secrets_Admin" ON public.delivery_secrets;
CREATE POLICY "Delivery_Secrets_Admin" ON public.delivery_secrets
    FOR ALL TO authenticated
    USING (public.check_is_admin());

-- 5. Função RPC para Exclusão Atômica (Segurança extra)
CREATE OR REPLACE FUNCTION public.admin_delete_booking(p_booking_id uuid)
RETURNS void AS $$
BEGIN
    -- Verificar se é admin
    IF NOT public.check_is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem excluir pedidos.';
    END IF;

    -- Excluir o pedido (O cascade cuidará de deliveries, payments, etc)
    DELETE FROM public.bookings WHERE id = p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
