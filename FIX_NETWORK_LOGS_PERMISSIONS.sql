-- ======================================================
-- FIX: PERMISSÕES DE LOGS DE REDE (NETWORK LOGS)
-- Resolve o erro 42501 (RLS) ao aprovar pedidos
-- ======================================================

-- 1. Atualizar a função de log para SECURITY DEFINER
-- Isso garante que o sistema possa escrever logs independentemente das permissões do usuário logado
CREATE OR REPLACE FUNCTION public.log_booking_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (NEW.equipment_id, NEW.id, 'rental_approved', 'Reserva aprovada e enviada para processamento.');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir políticas de RLS para INSERT na tabela network_logs
-- Mesmo com SECURITY DEFINER, é boa prática ter as políticas explícitas
DROP POLICY IF EXISTS "System can insert logs" ON public.network_logs;
CREATE POLICY "System can insert logs" ON public.network_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

-- 3. Atualizar a função de estoque para garantir consistência
CREATE OR REPLACE FUNCTION public.handle_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    item_name TEXT;
BEGIN
    -- Busca o nome do equipamento para o log
    SELECT name INTO item_name FROM public.equipments WHERE id = NEW.equipment_id;

    -- CASO 1: Reserva APROVADA ou EM TRÂNSITO (Baixa de Estoque)
    IF (NEW.status IN ('approved', 'picked_up', 'in_transit') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'picked_up', 'in_transit'))) THEN
        UPDATE public.equipments
        SET stock_quantity = stock_quantity - 1 
        WHERE id = NEW.equipment_id;

        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description, metadata)
        VALUES (NEW.equipment_id, NEW.id, 'stock_out', 'Saída de estoque automática por reserva: ' || NEW.id, 
                jsonb_build_object('item', item_name));
    
    -- CASO 2: Reserva FINALIZADA ou CANCELADA (Retorno de Estoque)
    ELSIF (NEW.status IN ('completed', 'returned', 'cancelled') AND OLD.status IN ('approved', 'picked_up', 'in_transit')) THEN
        UPDATE public.equipments
        SET stock_quantity = stock_quantity + 1
        WHERE id = NEW.equipment_id;

        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description, metadata)
        VALUES (NEW.equipment_id, NEW.id, 'stock_in', 'Retorno de estoque automático: ' || NEW.status, 
                jsonb_build_object('item', item_name));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Garantir que as tabelas tenham RLS habilitado e GRANTs corretos
ALTER TABLE public.network_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.network_logs TO authenticated;
GRANT ALL ON public.network_logs TO service_role;
