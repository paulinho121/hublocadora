-- ======================================================
-- FIX: ATUALIZAÇÃO DA CONSTRAINT DE STATUS DE ENTREGA
-- Adiciona o status 'confirmed' ao fluxo operacional.
-- ======================================================

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;

ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check 
    CHECK (status IN ('pending', 'picking', 'ready', 'shipped', 'delivered', 'confirmed', 'cancelled'));

-- Notificação
DO $$ BEGIN RAISE NOTICE 'Status "confirmed" adicionado com sucesso ao fluxo de entregas.'; END $$;
