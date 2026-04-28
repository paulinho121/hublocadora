-- ==========================================
-- CORREÇÃO DE PERMISSÕES FINANCEIRAS (RLS)
-- Liberar acesso para Sub-locadoras verem bookings atribuídos
-- ==========================================

-- 1. Atualizar a política de BOOKINGS
-- Agora permite: Cliente, Dono da Reserva OU Sub-locadora designada
DROP POLICY IF EXISTS "Booking Policy V4" ON public.bookings;
DROP POLICY IF EXISTS "Tenant Booking Isolation" ON public.bookings;

CREATE POLICY "Booking_Full_Access_V6_Financial" ON public.bookings
    FOR ALL 
    TO authenticated
    USING (
        -- 1. É o cliente que reservou
        renter_id = auth.uid() 
        -- 2. É o dono da locadora que recebeu o pedido original (Master)
        OR company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        -- 3. É a sub-locadora designada para realizar a entrega (Novo!)
        OR id IN (
            SELECT booking_id FROM public.deliveries 
            WHERE fulfilling_company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        )
        -- 4. É um administrador do sistema
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 2. Garantir que a política de DELIVERIES também cubra o acesso financeiro
DROP POLICY IF EXISTS "Delivery Access V3" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries_Full_Access_V5" ON public.deliveries;

CREATE POLICY "Deliveries_Financial_Access_V6" ON public.deliveries
    FOR ALL 
    TO authenticated
    USING (
        -- Dono da empresa que faz a entrega
        fulfilling_company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        -- Ou dono da empresa que recebeu o pedido original
        OR booking_id IN (
            SELECT id FROM public.bookings 
            WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        )
        -- Ou administrador
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Habilitar RLS nas tabelas (por segurança, caso estejam desativadas)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Notificação de conclusão
COMMENT ON POLICY "Booking_Full_Access_V6_Financial" ON public.bookings IS 'Permite acesso financeiro e operacional para Master e Sub-locadoras.';
