-- ======================================================
-- FIX: PERMISSÕES DE ENTREGA PARA SUB-LOCADORAS
-- Permite que sub-locadoras vejam e gerenciem pedidos atribuídos a elas
-- ======================================================

-- 1. Garantir que a coluna fulfilling_company_id exista
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS fulfilling_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS subrental_status TEXT DEFAULT NULL;

-- 2. Atualizar Políticas de RLS da tabela deliveries
DROP POLICY IF EXISTS "Delivery Access" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view deliveries of their bookings" ON public.deliveries;
DROP POLICY IF EXISTS "Companies can update their deliveries" ON public.deliveries;

-- Política abrangente: Renter vê, Master vê, Sub-locadora vê, Admin vê
CREATE POLICY "Delivery Comprehensive Access" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id 
            AND (
                b.renter_id = auth.uid() 
                OR b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
            )
        )
        OR fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id 
            AND (
                b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
            )
        )
        OR fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Garantir que o Realtime está habilitado para a tabela deliveries
-- Isso é crucial para as mensagens de "Novo Pedido" funcionarem de imediato
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
  END IF;
END $$;
