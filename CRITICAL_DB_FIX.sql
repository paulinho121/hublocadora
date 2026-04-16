-- ======================================================
-- RESET E FIX: GATILHO DE E-MAIL DE RESERVA
-- ======================================================

-- 1. Atualiza a função do Trigger para usar 'renter_id'
CREATE OR REPLACE FUNCTION public.trigger_send_booking_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email text;
BEGIN
    -- CORREÇÃO: O campo na tabela bookings é 'renter_id', não 'user_id'
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.renter_id;

    IF user_email IS NOT NULL THEN
        -- Chama a função de envio via Resend que já deve existir
        PERFORM public.send_resend_email(
            user_email,
            'Reserva Confirmada — CineHub',
            '<h1>Reserva Realizada</h1><p>Sua reserva foi processada! Vá até a tela "Minhas Locações" e veja mais detalhes sobre esta reserva que tem a ID: ' || NEW.id || '</p>'
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Recria o Trigger para garantir que as alterações entrem em vigor
DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.trigger_send_booking_confirmation();


-- ======================================================
-- FIX: PERMISSÕES DE NOTIFICAÇÕES (RLS)
-- ======================================================

-- 1. Garante que RLS está ativado
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Permite que usuários vejam suas próprias notificações
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Permite que usuários marquem como lidas (update) suas notificações
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. Permite que o sistema (auth) insira notificações para os usuários
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);
