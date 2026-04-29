-- 1. Adicionar coluna para rastrear QUEM mudou o status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_status_logs' AND column_name='changed_by') THEN
        ALTER TABLE public.inventory_status_logs ADD COLUMN changed_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Atualizar a função do trigger para ser mais inteligente e "silenciosa"
CREATE OR REPLACE FUNCTION public.close_previous_inventory_log()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
    v_reason TEXT;
BEGIN
    -- Captura o usuário atual da sessão do Supabase (se houver)
    v_changed_by := auth.uid();

    -- Se o status mudou
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- 1. Fecha o log anterior (aquele que não tem ended_at)
        UPDATE public.inventory_status_logs
        SET ended_at = timezone('utc'::text, now())
        WHERE equipment_id = NEW.id AND ended_at IS NULL;
        
        -- 2. Define o motivo com base em quem está mudando e qual o novo status
        -- Se o item está com sub-locadora e o status virou 'unavailable'
        IF (NEW.subrental_company_id IS NOT NULL AND NEW.status = 'unavailable') THEN
            v_reason := 'Locação Externa (Sub-locadora)';
        ELSIF (NEW.status = 'unavailable') THEN
            v_reason := 'Indisponível / Oculto no HUB';
        ELSIF (NEW.status = 'maintenance') THEN
            v_reason := 'Manutenção Técnica';
        ELSIF (NEW.status = 'rented') THEN
            v_reason := 'Locação via HUB';
        ELSE
            v_reason := 'Disponível no Marketplace';
        END IF;

        -- 3. Cria o novo log
        INSERT INTO public.inventory_status_logs (
            equipment_id, 
            company_id, 
            status, 
            reason,
            changed_by,
            started_at
        )
        VALUES (
            NEW.id, 
            NEW.company_id, 
            NEW.status, 
            v_reason,
            v_changed_by,
            timezone('utc'::text, now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ajustar RLS para que o Dono (Master) veja os logs de itens cedidos
DROP POLICY IF EXISTS "Donos de empresas podem ver seus logs" ON public.inventory_status_logs;

CREATE POLICY "Owners and Subrentals can view logs" ON public.inventory_status_logs
FOR SELECT USING (
    auth.uid() IN (
        -- É o dono da empresa proprietária do item
        SELECT owner_id FROM public.companies WHERE id = company_id
    ) OR auth.uid() IN (
        -- Ou é o dono da sub-locadora que está com o item
        SELECT c.owner_id 
        FROM public.companies c
        JOIN public.equipments e ON e.subrental_company_id = c.id
        WHERE e.id = equipment_id
    )
);

-- 4. Criar um comentário para auditoria
COMMENT ON TABLE public.inventory_status_logs IS 'Logs silenciosos de custódia e disponibilidade para monitoramento de locações externas.';
