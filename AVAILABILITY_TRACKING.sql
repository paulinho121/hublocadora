-- ======================================================
-- AVAILABILITY TRACKING - CINEHUB ENTERPRISE
-- Cálculo Automático de Tempo de Indisponibilidade
-- ======================================================

-- 1. Adiciona coluna para rastrear o início da indisponibilidade
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'equipments' AND COLUMN_NAME = 'unavailable_since') THEN
        ALTER TABLE public.equipments ADD COLUMN unavailable_since TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Gatilho para monitorar mudanças de visibilidade (status)
CREATE OR REPLACE FUNCTION public.track_availability_duration()
RETURNS TRIGGER AS $$
DECLARE
    duration INTERVAL;
    duration_text TEXT;
BEGIN
    -- CASO 1: Item foi OCULTADO (Visível -> Oculto)
    IF (NEW.status = 'unavailable' AND (OLD.status IS NULL OR OLD.status != 'unavailable')) THEN
        NEW.unavailable_since = now();
        
        INSERT INTO public.network_logs (equipment_id, action_type, description)
        VALUES (NEW.id, 'visibility_hidden', 'Equipamento ocultado no HUB (Início de indisponibilidade externa).');
    
    -- CASO 2: Item VOLTOU (Oculto -> Visível)
    ELSIF (NEW.status != 'unavailable' AND OLD.status = 'unavailable') THEN
        IF (OLD.unavailable_since IS NOT NULL) THEN
            duration = now() - OLD.unavailable_since;
            
            -- Formata a duração para algo legível (Ex: 2 dias, 04:30:00)
            duration_text = justify_interval(duration)::text;

            INSERT INTO public.network_logs (equipment_id, action_type, description, metadata)
            VALUES (NEW.id, 'visibility_restored', 'Equipamento retornou ao HUB.', 
                    jsonb_build_object(
                        'unavailable_duration', duration_text,
                        'started_at', OLD.unavailable_since,
                        'ended_at', now()
                    ));
            
            -- Limpa o timer
            NEW.unavailable_since = NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicar o gatilho na tabela de Equipamentos
DROP TRIGGER IF EXISTS tr_track_availability_duration ON public.equipments;
CREATE TRIGGER tr_track_availability_duration
    BEFORE UPDATE ON public.equipments
    FOR EACH ROW EXECUTE FUNCTION public.track_availability_duration();
