-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V35_DELIVERY_GPS_TRACKING
--
-- OBJETIVO: Rastreio ao vivo da entrega.
--   Quando a logística marca "Enviado", o celular dela passa a gravar o GPS em
--   deliveries.current_lat/current_lng, e o cliente acompanha pelo mapa via Realtime.
--
--   • dest_lat / dest_lng: coordenadas do endereço de entrega (geocodificado uma vez)
--   • location_updated_at: horário do último ponto de GPS recebido
-- ==============================================================================

ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS dest_lat numeric;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS dest_lng numeric;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- Garante que a tabela publica alterações no Realtime (o mapa do cliente depende disso)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deliveries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
    END IF;
END $$;

-- Verificação
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'deliveries'
  AND column_name IN ('current_lat', 'current_lng', 'dest_lat', 'dest_lng', 'location_updated_at');
