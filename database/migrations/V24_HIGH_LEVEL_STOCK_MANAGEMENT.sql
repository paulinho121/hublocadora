-- Migration: V24_HIGH_LEVEL_STOCK_MANAGEMENT
-- Descrição: Gestão de estoque de ponta (real-time). Subtrai a quantidade locada na aprovação do pedido e devolve no retorno/cancelamento.

CREATE OR REPLACE FUNCTION public.handle_booking_inventory_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id uuid;
    v_new_stock int;
BEGIN
    -- 1. IDENTIFICAR FILIAL DE ORIGEM
    -- Se o pedido tem filial definida, usamos ela. Caso contrário, usamos a Sede Principal da locadora.
    IF NEW.origin_branch_id IS NOT NULL THEN
        v_branch_id := NEW.origin_branch_id;
    ELSE
        SELECT id INTO v_branch_id 
        FROM public.branches 
        WHERE company_id = NEW.company_id AND is_main = true 
        LIMIT 1;
    END IF;

    -- 2. SE O PEDIDO FOI APROVADO (status = 'approved' ou 'active') E ANTES NÃO ESTAVA
    IF (NEW.status = 'approved' OR NEW.status = 'active') 
       AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'active')) THEN
        
        -- A. DAR BAIXA NO ESTOQUE GLOBAL (equipments)
        UPDATE public.equipments 
        SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity) 
        WHERE id = NEW.equipment_id
        RETURNING stock_quantity INTO v_new_stock;
        
        -- Atualizar status do equipamento dinamicamente se zerou o estoque
        UPDATE public.equipments 
        SET status = CASE 
            WHEN stock_quantity = 0 THEN 'rented'::text 
            WHEN status NOT IN ('unavailable', 'maintenance') THEN 'available'::text
            ELSE status
        END
        WHERE id = NEW.equipment_id;

        -- B. DAR BAIXA NO ESTOQUE DA FILIAL (equipment_stock)
        IF v_branch_id IS NOT NULL THEN
            UPDATE public.equipment_stock 
            SET quantity = GREATEST(0, quantity - NEW.quantity) 
            WHERE equipment_id = NEW.equipment_id AND branch_id = v_branch_id;
        END IF;

        -- C. REGISTRAR LOG DE MOVIMENTAÇÃO DE ESTOQUE
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (
            NEW.equipment_id, 
            NEW.id, 
            'STOCK_DECREASE', 
            'Baixa automática de ' || NEW.quantity || ' unidade(s) no estoque após aprovação da reserva.'
        );
    END IF;

    -- 3. SE O PEDIDO FOI FINALIZADO/DEVOLVIDO (status = 'completed') E ANTES ESTAVA APROVADO/ATIVO
    IF NEW.status = 'completed' AND (OLD.status = 'approved' OR OLD.status = 'active') THEN
        
        -- A. ADICIONAR DE VOLTA AO ESTOQUE GLOBAL (equipments)
        UPDATE public.equipments 
        SET stock_quantity = stock_quantity + NEW.quantity 
        WHERE id = NEW.equipment_id;
        
        -- Restaurar status para disponível se não estiver em manutenção ou indisponível
        UPDATE public.equipments 
        SET status = CASE 
            WHEN status NOT IN ('unavailable', 'maintenance') THEN 'available'::text
            ELSE status
        END
        WHERE id = NEW.equipment_id;
        
        -- B. ADICIONAR DE VOLTA AO ESTOQUE DA FILIAL (equipment_stock)
        IF v_branch_id IS NOT NULL THEN
            INSERT INTO public.equipment_stock (equipment_id, branch_id, quantity, updated_at)
            VALUES (NEW.equipment_id, v_branch_id, NEW.quantity, now())
            ON CONFLICT (equipment_id, branch_id) 
            DO UPDATE SET quantity = equipment_stock.quantity + NEW.quantity, updated_at = now();
        END IF;

        -- C. REGISTRAR LOG DE MOVIMENTAÇÃO DE ESTOQUE
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (
            NEW.equipment_id, 
            NEW.id, 
            'STOCK_INCREASE', 
            'Retorno automático de ' || NEW.quantity || ' unidade(s) ao estoque após conclusão e devolução da locação.'
        );
    END IF;

    -- 4. SE O PEDIDO FOI CANCELADO (status = 'cancelled') E ANTES JÁ ESTAVA APROVADO/ATIVO (então já tinha dado baixa)
    IF NEW.status = 'cancelled' AND (OLD.status = 'approved' OR OLD.status = 'active') THEN
        
        -- A. ADICIONAR DE VOLTA AO ESTOQUE GLOBAL (equipments)
        UPDATE public.equipments 
        SET stock_quantity = stock_quantity + NEW.quantity 
        WHERE id = NEW.equipment_id;
        
        -- Restaurar status para disponível se não estiver em manutenção ou indisponível
        UPDATE public.equipments 
        SET status = CASE 
            WHEN status NOT IN ('unavailable', 'maintenance') THEN 'available'::text
            ELSE status
        END
        WHERE id = NEW.equipment_id;
        
        -- B. ADICIONAR DE VOLTA AO ESTOQUE DA FILIAL (equipment_stock)
        IF v_branch_id IS NOT NULL THEN
            INSERT INTO public.equipment_stock (equipment_id, branch_id, quantity, updated_at)
            VALUES (NEW.equipment_id, v_branch_id, NEW.quantity, now())
            ON CONFLICT (equipment_id, branch_id) 
            DO UPDATE SET quantity = equipment_stock.quantity + NEW.quantity, updated_at = now();
        END IF;

        -- C. REGISTRAR LOG DE MOVIMENTAÇÃO DE ESTOQUE
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (
            NEW.equipment_id, 
            NEW.id, 
            'STOCK_INCREASE', 
            'Retorno automático de ' || NEW.quantity || ' unidade(s) ao estoque devido ao cancelamento do pedido aprovado.'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a trigger esteja vinculada à tabela de bookings
DROP TRIGGER IF EXISTS trg_booking_inventory_sync ON public.bookings;
CREATE TRIGGER trg_booking_inventory_sync
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_booking_inventory_sync();
