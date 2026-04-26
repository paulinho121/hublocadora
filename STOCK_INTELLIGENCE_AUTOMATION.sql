-- ======================================================
-- STOCK INTELLIGENCE AUTOMATION - CINEHUB ENTERPRISE
-- Automação de Baixa e Retorno de Estoque e Logs de Auditoria
-- ======================================================

-- 1. Função para gerenciar o estoque baseado no status da reserva
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
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.equipment_id;

        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description, metadata)
        VALUES (NEW.equipment_id, NEW.id, 'stock_out', 'Saída de estoque automática por reserva: ' || NEW.id, 
                jsonb_build_object('prev_stock', (SELECT stock_quantity + NEW.quantity FROM public.equipments WHERE id = NEW.equipment_id), 'quantity', NEW.quantity));
    
    -- CASO 2: Reserva FINALIZADA, DEVOLVIDA ou CANCELADA após ter sido aprovada (Retorno de Estoque)
    ELSIF (NEW.status IN ('completed', 'returned', 'cancelled') AND OLD.status IN ('approved', 'picked_up', 'in_transit')) THEN
        UPDATE public.equipments
        SET stock_quantity = stock_quantity + NEW.quantity
        WHERE id = NEW.equipment_id;

        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description, metadata)
        VALUES (NEW.equipment_id, NEW.id, 'stock_in', 'Retorno de estoque automático: ' || NEW.status, 
                jsonb_build_object('prev_stock', (SELECT stock_quantity - NEW.quantity FROM public.equipments WHERE id = NEW.equipment_id), 'quantity', NEW.quantity));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Gatilho para a tabela de Bookings
DROP TRIGGER IF EXISTS tr_handle_stock_movement ON public.bookings;
CREATE TRIGGER tr_handle_stock_movement
    AFTER UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.handle_stock_movement();

-- 3. Função para Locação Externa (Fora do HUB)
-- Permite que locadoras registrem saídas manuais para manter o inventário real
CREATE OR REPLACE FUNCTION public.register_external_rental(
    p_equipment_id UUID, 
    p_quantity INTEGER, 
    p_reason TEXT,
    p_operator_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- 1. Diminui o estoque
    UPDATE public.equipments
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_equipment_id;

    -- 2. Gera o log de auditoria específico
    INSERT INTO public.network_logs (equipment_id, action_type, description, metadata)
    VALUES (p_equipment_id, 'external_rental', 'LOCAÇÃO FORA DO HUB: ' || p_reason, 
            jsonb_build_object('operator', p_operator_id, 'quantity', p_quantity));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
