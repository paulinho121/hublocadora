-- Migration: V19_INVENTORY_SYNC_LOGIC
-- Descrição: Automatiza a mudança de status do equipamento e adiciona suporte a serial number nas entregas.

-- 1. Adicionar suporte a Serial Number no rastreio da entrega
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- 2. Função de sincronização
CREATE OR REPLACE FUNCTION public.handle_booking_inventory_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Se o pedido foi APROVADO, marcamos o equipamento como 'rented' (ocupado no HUB)
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        UPDATE public.equipments 
        SET status = 'rented' 
        WHERE id = NEW.equipment_id;
        
        -- Log de rede
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (NEW.equipment_id, NEW.id, 'STATUS_CHANGE', 'Equipamento marcado como locado após aprovação do pedido.');
    END IF;

    -- 2. Se o pedido foi FINALIZADO (entregue e conferido), devolvemos para 'available'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.equipments 
        SET status = 'available' 
        WHERE id = NEW.equipment_id;

        -- Log de rede
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (NEW.equipment_id, NEW.id, 'STATUS_CHANGE', 'Equipamento devolvido ao inventário disponível.');
    END IF;

    -- 3. Se o pedido foi CANCELADO, liberamos o item imediatamente
    IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
        UPDATE public.equipments 
        SET status = 'available' 
        WHERE id = NEW.equipment_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger: Vincular a função à tabela de bookings
DROP TRIGGER IF EXISTS trg_booking_inventory_sync ON public.bookings;
CREATE TRIGGER trg_booking_inventory_sync
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_booking_inventory_sync();
