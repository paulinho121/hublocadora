-- ======================================================
-- ESQUEMA DE RASTREIO DE ENTREGAS (REAL-TIME TRACKING)
-- PROFISSIONALIZAÇÃO ESTILO IFOOD
-- ======================================================

-- 1. Criação da Tabela de Entregas (Deliveries) se não existir
CREATE TABLE IF NOT EXISTS public.deliveries (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) NOT NULL UNIQUE,
    driver_name text,
    driver_phone text,
    -- Status mapeados: 
    -- 'pending' (Recebido), 'picking' (Em Separação), 'ready' (Pronto para Coleta), 
    -- 'shipped' (Em Trânsito), 'delivered' (Entregue), 'cancelled' (Cancelado)
    status text CHECK (status IN ('pending', 'picking', 'ready', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
    current_lat numeric,
    current_lng numeric,
    estimated_arrival timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Upgrade status constraint if needed
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check 
    CHECK (status IN ('pending', 'picking', 'ready', 'shipped', 'delivered', 'cancelled'));

-- 2. Habilitar o RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
DROP POLICY IF EXISTS "Users can view deliveries of their bookings" ON public.deliveries;
CREATE POLICY "Users can view deliveries of their bookings" ON public.deliveries
    FOR SELECT
    USING (
        booking_id IN (
            SELECT id FROM public.bookings
            WHERE renter_id = auth.uid() 
            OR company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Companies can update their deliveries" ON public.deliveries;
CREATE POLICY "Companies can update their deliveries" ON public.deliveries
    FOR UPDATE
    USING (
        booking_id IN (
            SELECT id FROM public.bookings
            WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Companies can insert deliveries" ON public.deliveries;
CREATE POLICY "Companies can insert deliveries" ON public.deliveries
    FOR INSERT
    WITH CHECK (
        booking_id IN (
            SELECT id FROM public.bookings
            WHERE company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        )
    );

-- 4. Função para Update At automático
CREATE OR REPLACE FUNCTION update_deliveries_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE PROCEDURE update_deliveries_updated_at_column();

-- ======================================================
-- HABILITANDO O SUPABASE REALTIME
-- ======================================================
-- Garante que o Realtime está ativo para a tabela
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

ALTER TABLE public.deliveries REPLICA IDENTITY FULL;
