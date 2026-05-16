-- Migration: V21_LOGISTICS_FIX_DUPLICATION_AND_TOKEN
-- Descrição: Resolve duplicação de entregas e garante a geração/visibilidade do token de segurança.

-- 1. Limpeza de triggers antigos/duplicados para evitar execução redundante
DROP TRIGGER IF EXISTS on_booking_approved_create_delivery ON public.bookings;
DROP TRIGGER IF EXISTS trg_on_booking_approved ON public.bookings;
DROP TRIGGER IF EXISTS tr_on_booking_approved ON public.bookings;

-- 2. Garantir que a coluna de token exista na tabela de entregas para redundância (UI compatibility)
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS delivery_token TEXT;

-- 3. Função de Orquestração Robusta
CREATE OR REPLACE FUNCTION public.orchestrate_fulfillment(p_booking_id uuid)
RETURNS void AS $$
DECLARE
    v_booking_record record;
    v_delivery_id uuid;
    v_token text;
BEGIN
    -- Bloqueio preventivo para evitar concorrência no mesmo booking
    -- (Opcional, mas o check NOT EXISTS abaixo já resolve a maioria dos casos)
    
    -- 1. Verificar se já existe uma entrega para este booking (EVITA DUPLICAÇÃO)
    IF EXISTS (SELECT 1 FROM public.deliveries WHERE booking_id = p_booking_id) THEN
        RETURN;
    END IF;

    -- 2. Buscar dados da reserva
    SELECT b.id, b.quantity, b.company_id, b.equipment_id 
    INTO v_booking_record
    FROM public.bookings b
    WHERE b.id = p_booking_id;

    IF v_booking_record.id IS NULL THEN
        RETURN;
    END IF;

    -- 3. Gerar o Token de 4 dígitos
    v_token := lpad(floor(random() * 10000)::text, 4, '0');

    -- 4. Criar a Entrega Principal
    INSERT INTO public.deliveries (
        booking_id, 
        fulfilling_company_id, 
        quantity, 
        fulfillment_type, 
        status,
        delivery_token
    )
    VALUES (
        v_booking_record.id, 
        v_booking_record.company_id, 
        v_booking_record.quantity, 
        'primary', 
        'pending',
        v_token
    )
    RETURNING id INTO v_delivery_id;
    
    -- 5. Salvar na tabela de segredos (para compatibilidade com a função de verificação RPC)
    -- Usamos ON CONFLICT DO NOTHING para segurança extra
    INSERT INTO public.delivery_secrets (delivery_id, token, type) 
    VALUES (v_delivery_id, v_token, 'collection')
    ON CONFLICT (delivery_id) DO UPDATE SET token = v_token;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Recriar o Trigger Único e Oficial
CREATE TRIGGER trg_on_booking_approved
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
    EXECUTE FUNCTION public.handle_booking_approval();

-- 5. Atualizar entregas existentes que estão sem token (Correção de dados legados)
UPDATE public.deliveries d
SET delivery_token = s.token
FROM public.delivery_secrets s
WHERE d.id = s.delivery_id AND d.delivery_token IS NULL;

-- Se ainda houver entregas sem nenhum token em lugar nenhum, gera agora
DO $$
DECLARE
    r record;
    v_new_token text;
BEGIN
    FOR r IN SELECT id FROM public.deliveries WHERE delivery_token IS NULL LOOP
        v_new_token := lpad(floor(random() * 10000)::text, 4, '0');
        UPDATE public.deliveries SET delivery_token = v_new_token WHERE id = r.id;
        INSERT INTO public.delivery_secrets (delivery_id, token, type) 
        VALUES (r.id, v_new_token, 'collection')
        ON CONFLICT DO NOTHING;
    END FOR;
END;
$$;

-- 6. Atualizar Políticas de Segurança (RLS) para visibilidade do token
DROP POLICY IF EXISTS "Delivery_Secrets_Renter" ON public.delivery_secrets;
CREATE POLICY "Delivery_Secrets_Renter" ON public.delivery_secrets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.deliveries d
            JOIN public.bookings b ON d.booking_id = b.id
            LEFT JOIN public.profiles p ON b.renter_id = p.id
            WHERE d.id = delivery_secrets.delivery_id 
            AND (
                b.renter_id = auth.uid() -- O próprio locatário
                OR b.company_id = public.get_my_company_id() -- O dono do equipamento (Fulfiller)
                OR p.company_id = public.get_my_company_id() -- Alguém da empresa que alugou
                OR public.check_is_admin() -- Admin master
            )
        )
    );
