-- ======================================================
-- AUTOMATIZAÇÃO LOGÍSTICA (AUTO-DELIVERY CREATION)
-- ======================================================

-- Função para criar entrega automática ao aprovar reserva
CREATE OR REPLACE FUNCTION public.handle_booking_approval_logistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'approved' e ainda não existe uma entrega para essa reserva
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
        IF NOT EXISTS (SELECT 1 FROM public.deliveries WHERE booking_id = NEW.id) THEN
            INSERT INTO public.deliveries (booking_id, status)
            VALUES (NEW.id, 'pending');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger na tabela de bookings
DROP TRIGGER IF EXISTS on_booking_approved_create_delivery ON public.bookings;
CREATE TRIGGER on_booking_approved_create_delivery
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_approval_logistics();
