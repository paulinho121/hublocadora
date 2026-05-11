-- ======================================================
-- SETUP: LOGÍSTICA REVERSA (FLUXO DE RETORNO)
-- Implementa campos para gerenciar a devolução do equipamento
-- do cliente para a origem (Hub ou Filial).
-- ======================================================

-- 1. Adicionar colunas de retorno na tabela de entregas
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS reverse_logistics_status TEXT 
    CHECK (reverse_logistics_status IN ('not_started', 'requested', 'collecting', 'in_transit', 'returned', 'cancelled')) 
    DEFAULT 'not_started';

-- Endereço/Filial de devolução (Caso seja diferente da origem)
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS reverse_logistics_address TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS reverse_logistics_branch_id UUID REFERENCES public.branches(id);

-- Dados do motorista de coleta (Retorno)
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS reverse_driver_name TEXT;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS reverse_driver_phone TEXT;

-- Token de segurança específico para a devolução
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS reverse_token TEXT DEFAULT floor(random() * 9000 + 1000)::text;

-- 2. Trigger para inicializar o endereço de devolução como sendo o endereço da filial de origem
CREATE OR REPLACE FUNCTION public.handle_reverse_logistics_setup()
RETURNS TRIGGER AS $$
DECLARE
    v_origin_address TEXT;
BEGIN
    -- Se estivermos definindo uma filial de origem e o endereço de retorno estiver vazio
    IF (NEW.origin_branch_id IS NOT NULL AND NEW.reverse_logistics_address IS NULL) THEN
        SELECT address || ', ' || city || ' - ' || state INTO v_origin_address
        FROM public.branches WHERE id = NEW.origin_branch_id;
        
        NEW.reverse_logistics_address := v_origin_address;
        NEW.reverse_logistics_branch_id := NEW.origin_branch_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_setup_reverse_logistics ON public.deliveries;
CREATE TRIGGER tr_setup_reverse_logistics
BEFORE INSERT OR UPDATE OF origin_branch_id ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION public.handle_reverse_logistics_setup();

-- 3. Atualizar registros existentes (Opcional)
UPDATE public.deliveries d
SET reverse_logistics_branch_id = d.origin_branch_id,
    reverse_logistics_address = (SELECT address || ', ' || city FROM public.branches b WHERE b.id = d.origin_branch_id)
WHERE d.origin_branch_id IS NOT NULL AND d.reverse_logistics_branch_id IS NULL;

-- Notificação
DO $$ BEGIN RAISE NOTICE 'Sistema de Logística Reversa (V1.0) instalado com sucesso.'; END $$;
