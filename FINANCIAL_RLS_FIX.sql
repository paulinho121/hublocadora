-- ======================================================
-- FINANCIAL RLS FIX: VISIBILIDADE PARA SUB-LOCADORAS
-- Garante que parceiros vejam os valores financeiros de pedidos atribuídos
-- ======================================================

-- 1. Função robusta para verificar acesso ao pedido via entrega
-- SECURITY DEFINER para ignorar RLS circular
CREATE OR REPLACE FUNCTION public.check_delivery_access_v2(b_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE d.booking_id = b_id 
    AND d.fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar política de BOOKINGS
-- Permite que a sub-locadora veja o pedido (e seu valor) se ela for a encarregada da entrega
DROP POLICY IF EXISTS "Booking_Final_Stabilized_V8" ON public.bookings;
DROP POLICY IF EXISTS "Booking Policy V4" ON public.bookings;

CREATE POLICY "Booking_Financial_Visibility_V1" ON public.bookings
    FOR ALL TO authenticated
    USING (
        renter_id = auth.uid() 
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR public.check_delivery_access_v2(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        renter_id = auth.uid() 
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR public.check_delivery_access_v2(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Garantir que a sub-locadora veja os detalhes da entrega
DROP POLICY IF EXISTS "Delivery Comprehensive Access" ON public.deliveries;
CREATE POLICY "Delivery_Subrental_Visibility_V2" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        booking_id IN (SELECT id FROM public.bookings WHERE renter_id = auth.uid())
        OR fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR booking_id IN (SELECT id FROM public.bookings WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Criar política para a tabela de transações financeiras (se existir e estiver sendo usada)
-- Garante que ambos vejam o registro da divisão de lucros
DROP POLICY IF EXISTS "Partners select own transactions" ON public.financial_transactions;
CREATE POLICY "Financial_Transactions_Visibility_V1" ON public.financial_transactions
    FOR SELECT TO authenticated
    USING (
        master_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR partner_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
