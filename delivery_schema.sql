-- ======================================================
-- ESQUEMA DE RASTREIO DE ENTREGAS (REAL-TIME TRACKING)
-- ======================================================

-- 1. Criação da Tabela de Entregas (Deliveries)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) NOT NULL UNIQUE,
    driver_name text,
    driver_phone text,
    status text CHECK (status IN ('preparing', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'preparing',
    current_lat numeric,
    current_lng numeric,
    estimated_arrival timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar o RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
-- Usuários (Clientes ou Locadoras) podem ver a entrega,
-- se eles puderem ver a reserva a qual ela pertence.
CREATE POLICY "Users can view deliveries of their bookings" ON public.deliveries
    FOR SELECT
    USING (
        booking_id IN (
            SELECT id FROM public.bookings
            WHERE renter_id = auth.uid() 
            OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        )
    );

-- Motoristas/Locadoras podem atualizar a entrega.
-- Simplificado: Quem tem acesso à empresa pode atualizar.
CREATE POLICY "Companies can update their deliveries" ON public.deliveries
    FOR UPDATE
    USING (
        booking_id IN (
            SELECT id FROM public.bookings
            WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
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

CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE PROCEDURE update_deliveries_updated_at_column();

-- ======================================================
-- HABILITANDO O SUPABASE REALTIME
-- ======================================================
-- Precisamos habilitar o realtime (REPLICA IDENTITY) 
-- para escutar mudanças na tabela public.deliveries

ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER TABLE public.deliveries REPLICA IDENTITY FULL;
