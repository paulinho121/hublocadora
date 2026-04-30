-- ======================================================
-- FIX: INTELIGÊNCIA LOGÍSTICA DE SUB-LOCAÇÃO (V2.1)
-- Garante que pedidos de sub-locação cheguem ao parceiro
-- E gera o Token de Segurança de 4 dígitos
-- ======================================================

-- 1. GARANTIR COLUNAS NECESSÁRIAS
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS subrental_company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS origin_branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS delivery_token TEXT DEFAULT floor(random() * 9000 + 1000)::text;

CREATE OR REPLACE FUNCTION public.handle_booking_approval_logistics()
RETURNS TRIGGER AS $$
DECLARE
    v_target_company_id UUID;
    v_target_branch_id UUID;
BEGIN
    -- 1. Verifica se o status mudou para 'approved'
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
        
        -- 2. Define quem vai entregar: 
        v_target_company_id := NEW.subrental_company_id;
        v_target_branch_id := NEW.origin_branch_id;
        
        -- Se nada foi definido manualmente, busca consignação no equipamento
        IF v_target_company_id IS NULL AND v_target_branch_id IS NULL THEN
            SELECT subrental_company_id INTO v_target_company_id
            FROM public.equipments
            WHERE id = NEW.equipment_id;
        END IF;

        -- 3. Se ainda não existe uma entrega para essa reserva, cria uma
        IF NOT EXISTS (SELECT 1 FROM public.deliveries WHERE booking_id = NEW.id) THEN
            INSERT INTO public.deliveries (
                booking_id, 
                status, 
                fulfilling_company_id, 
                origin_branch_id,
                subrental_status,
                delivery_token
            )
            VALUES (
                NEW.id, 
                'pending', 
                v_target_company_id,
                v_target_branch_id, 
                CASE 
                    WHEN v_target_company_id IS NOT NULL THEN 'pending' -- Parceiro externo precisa aceitar
                    WHEN v_target_branch_id IS NOT NULL THEN 'accepted' -- Filial interna já nasce aceito
                    ELSE NULL 
                END,
                floor(random() * 9000 + 1000)::text -- Gera o Token de 4 dígitos
            );
        ELSE
            -- 4. Se a entrega já existe, sincroniza o responsável e gera o token se estiver vazio
            UPDATE public.deliveries 
            SET fulfilling_company_id = v_target_company_id,
                origin_branch_id = v_target_branch_id,
                delivery_token = COALESCE(delivery_token, floor(random() * 9000 + 1000)::text),
                subrental_status = CASE 
                    WHEN v_target_company_id IS NOT NULL THEN 'pending'
                    WHEN v_target_branch_id IS NOT NULL THEN 'accepted'
                    ELSE NULL 
                END
            WHERE booking_id = NEW.id AND (fulfilling_company_id IS NULL OR origin_branch_id IS NULL);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reinicializa o trigger
DROP TRIGGER IF EXISTS on_booking_approved_create_delivery ON public.bookings;
CREATE TRIGGER on_booking_approved_create_delivery
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_approval_logistics();

-- Notificação
DO $$ BEGIN RAISE NOTICE 'Gatilho logístico V2.1 atualizado: suporte a Token de 4 dígitos habilitado.'; END $$;
