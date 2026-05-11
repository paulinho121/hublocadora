-- Tabela para rastrear histórico de disponibilidade (Relatórios e Logs)
CREATE TABLE IF NOT EXISTS public.inventory_status_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_id UUID REFERENCES public.equipments(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    status TEXT NOT NULL,
    reason TEXT, -- Ex: 'Aluguel Externo', 'Manutenção', 'HUB Reservation'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.inventory_status_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Donos de empresas podem ver seus logs" ON public.inventory_status_logs 
FOR SELECT USING (
  auth.uid() IN (SELECT owner_id FROM public.companies WHERE id = company_id)
);

-- Trigger para fechar o log anterior automaticamente quando o status muda
CREATE OR REPLACE FUNCTION public.close_previous_inventory_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Fecha o log anterior (aquele que não tem ended_at)
        UPDATE public.inventory_status_logs
        SET ended_at = timezone('utc'::text, now())
        WHERE equipment_id = NEW.id AND ended_at IS NULL;
        
        -- Cria o novo log
        INSERT INTO public.inventory_status_logs (equipment_id, company_id, status, reason)
        VALUES (
            NEW.id, 
            NEW.company_id, 
            NEW.status, 
            CASE 
                WHEN NEW.status = 'unavailable' THEN 'Aluguel Externo'
                WHEN NEW.status = 'maintenance' THEN 'Manutenção'
                WHEN NEW.status = 'rented' THEN 'Reserva HUB'
                ELSE 'Disponível'
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_inventory_status_log
AFTER UPDATE OF status ON public.equipments
FOR EACH ROW
EXECUTE FUNCTION public.close_previous_inventory_log();
