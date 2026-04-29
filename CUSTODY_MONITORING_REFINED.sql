-- ======================================================
-- REFINED CUSTODY MONITORING - SILENT LOGS
-- Monitoramento automático de tempo de indisponibilidade (Sub-locação)
-- ======================================================

-- 1. Garantir que a coluna de timestamp existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'equipments' AND COLUMN_NAME = 'unavailable_since') THEN
        ALTER TABLE public.equipments ADD COLUMN unavailable_since TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Função de trigger aprimorada para logs de custódia
CREATE OR REPLACE FUNCTION public.track_availability_duration()
RETURNS TRIGGER AS $$
DECLARE
    duration INTERVAL;
    duration_text TEXT;
    v_operator_id UUID;
BEGIN
    v_operator_id := auth.uid();

    -- CASO 1: Item foi OCULTADO (Visível -> Oculto)
    IF (NEW.status = 'unavailable' AND (OLD.status IS NULL OR OLD.status != 'unavailable')) THEN
        NEW.unavailable_since = now();
        
        INSERT INTO public.network_logs (
            equipment_id, 
            action_type, 
            description, 
            origin_company_id, 
            destination_company_id,
            metadata
        )
        VALUES (
            NEW.id, 
            'visibility_hidden', 
            'Equipamento ocultado no HUB (Início de indisponibilidade externa).',
            NEW.company_id, -- Dono original
            NEW.subrental_company_id, -- Quem está com a custódia
            jsonb_build_object(
                'operator_id', v_operator_id,
                'is_subrental_custody', NEW.subrental_company_id IS NOT NULL
            )
        );
    
    -- CASO 2: Item VOLTOU (Oculto -> Visível)
    ELSIF (NEW.status != 'unavailable' AND OLD.status = 'unavailable') THEN
        IF (OLD.unavailable_since IS NOT NULL) THEN
            duration = now() - OLD.unavailable_since;
            duration_text := justify_interval(duration)::text;

            INSERT INTO public.network_logs (
                equipment_id, 
                action_type, 
                description,
                origin_company_id,
                destination_company_id,
                metadata
            )
            VALUES (
                NEW.id, 
                'visibility_restored', 
                'Equipamento retornou ao HUB.',
                NEW.company_id,
                NEW.subrental_company_id,
                jsonb_build_object(
                    'unavailable_duration', duration_text,
                    'started_at', OLD.unavailable_since,
                    'ended_at', now(),
                    'operator_id', v_operator_id,
                    'is_subrental_custody', NEW.subrental_company_id IS NOT NULL
                )
            );
            
            -- Limpa o timer
            NEW.unavailable_since = NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar o trigger
DROP TRIGGER IF EXISTS tr_track_availability_duration ON public.equipments;
CREATE TRIGGER tr_track_availability_duration
    BEFORE UPDATE ON public.equipments
    FOR EACH ROW EXECUTE FUNCTION public.track_availability_duration();

-- 4. Ajustar RLS de network_logs para garantir que o Master veja tudo de seu interesse
-- (Já existe uma política de Admin, mas se o Master não for SuperAdmin, ele precisa ver via IDs de empresa)
DROP POLICY IF EXISTS "Partners select own logs" ON public.network_logs;
CREATE POLICY "Visibility logs access" ON public.network_logs
FOR SELECT USING (
    auth.uid() IN (SELECT owner_id FROM public.companies WHERE id = origin_company_id) -- Master (Dono)
    OR auth.uid() IN (SELECT owner_id FROM public.companies WHERE id = destination_company_id) -- Sub-locadora (Custódia)
);

-- 5. Comentário para documentação
COMMENT ON FUNCTION public.track_availability_duration() IS 'Calcula silenciosamente o tempo que um item fica fora do HUB quando sob custódia de terceiros.';
