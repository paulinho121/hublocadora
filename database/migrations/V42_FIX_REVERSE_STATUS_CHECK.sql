-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V42_FIX_REVERSE_STATUS_CHECK
--
-- PROBLEMA: ao conferir a devolução ("Conferido — encerrar locação"), o banco
--   recusava com: new row for relation "deliveries" violates check constraint
--   "deliveries_reverse_logistics_status_check".
--   A regra que está no banco em produção não aceita 'completed' (os arquivos do
--   repositório aceitam — o banco foi alterado à parte).
--
-- SOLUÇÃO: recria a regra com todas as etapas usadas pelo app.
-- ==============================================================================

-- Prévia: a regra atual no banco
SELECT pg_get_constraintdef(oid) AS regra_atual
FROM pg_constraint
WHERE conname = 'deliveries_reverse_logistics_status_check';

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_reverse_logistics_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_reverse_logistics_status_check
    CHECK (reverse_logistics_status IS NULL OR reverse_logistics_status IN (
        'not_started', 'requested', 'collecting', 'in_transit', 'returned', 'completed', 'cancelled'
    ));

-- Conferência
SELECT pg_get_constraintdef(oid) AS regra_nova
FROM pg_constraint
WHERE conname = 'deliveries_reverse_logistics_status_check';
