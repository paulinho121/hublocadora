-- ======================================================
-- FIX: INTELIGÊNCIA DE ATRIBUIÇÃO AUTOMÁTICA PARA FILIAIS (V3.5)
-- Quando um pedido externo é aprovado no HUB, o sistema localiza a filial
-- que possui estoque disponível e transfere a responsabilidade logística.
-- ======================================================

-- 1. Função de Inteligência de Atribuição (Executada ANTES da aprovação)
CREATE OR REPLACE FUNCTION public.assign_booking_branch_intelligence()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id UUID;
    v_branch_name TEXT;
BEGIN
    -- Só age se o status estiver mudando para 'approved' 
    -- E se ainda não houver uma filial ou parceiro externo definido manualmente
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
        IF NEW.origin_branch_id IS NULL AND NEW.subrental_company_id IS NULL THEN
            
            -- Busca a filial da mesma empresa que tem o maior estoque disponível do item
            SELECT es.branch_id, b.name INTO v_branch_id, v_branch_name
            FROM public.equipment_stock es
            JOIN public.branches b ON es.branch_id = b.id
            WHERE es.equipment_id = NEW.equipment_id
              AND b.company_id = NEW.company_id
              AND es.quantity >= NEW.quantity
              AND b.status = 'active'
            ORDER BY es.quantity DESC
            LIMIT 1;

            -- Se encontrou uma filial apta, atribui ao pedido
            IF v_branch_id IS NOT NULL THEN
                NEW.origin_branch_id := v_branch_id;
                
                -- Log de Auditoria da Atribuição Inteligente
                INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
                VALUES (NEW.equipment_id, NEW.id, 'auto_branch_assignment', 
                        'ATRIBUIÇÃO INTELIGENTE: Pedido direcionado para a filial ' || v_branch_name || ' (Estoque Detectado).');
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que o trigger BEFORE UPDATE exista
DROP TRIGGER IF EXISTS tr_assign_booking_branch_intelligence ON public.bookings;
CREATE TRIGGER tr_assign_booking_branch_intelligence
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.assign_booking_branch_intelligence();


-- 2. Atualização da Função de Logística (Executada APÓS a aprovação)
-- Esta função cria a entrega baseada no origin_branch_id que foi setado no passo anterior
CREATE OR REPLACE FUNCTION public.handle_booking_approval_logistics()
RETURNS TRIGGER AS $$
DECLARE
    v_target_company_id UUID;
    v_target_branch_id UUID;
BEGIN
    -- Só age se o status for 'approved'
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
        
        -- Pega o que está definido no booking (setado manualmente ou via inteligência acima)
        v_target_company_id := NEW.subrental_company_id;
        v_target_branch_id := NEW.origin_branch_id;
        
        -- Fallback: Se ainda estiver vazio (nenhuma filial interna tem estoque), 
        -- busca sub-locação configurada no equipamento (parceiro externo)
        IF v_target_company_id IS NULL AND v_target_branch_id IS NULL THEN
            SELECT subrental_company_id INTO v_target_company_id
            FROM public.equipments
            WHERE id = NEW.equipment_id;
        END IF;

        -- Criação ou Sincronização da Entrega
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
                floor(random() * 9000 + 1000)::text
            );
        ELSE
            -- Se a entrega já existe (ex: re-aprovação), sincroniza o responsável e gera o token se estiver vazio
            UPDATE public.deliveries 
            SET fulfilling_company_id = v_target_company_id,
                origin_branch_id = v_target_branch_id,
                delivery_token = COALESCE(delivery_token, floor(random() * 9000 + 1000)::text),
                subrental_status = CASE 
                    WHEN v_target_company_id IS NOT NULL THEN 'pending'
                    WHEN v_target_branch_id IS NOT NULL THEN 'accepted'
                    ELSE NULL 
                END
            WHERE booking_id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria o trigger AFTER UPDATE
DROP TRIGGER IF EXISTS on_booking_approved_create_delivery ON public.bookings;
CREATE TRIGGER on_booking_approved_create_delivery
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_approval_logistics();

-- 3. Notificação no console do Supabase
DO $$ BEGIN RAISE NOTICE 'Inteligência Logística V3.5 aplicada: Atribuição automática por estoque em filiais habilitada.'; END $$;
