-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V36_FIX_DOUBLE_STOCK_DEDUCTION
--
-- PROBLEMA: Item com 6 unidades, cliente aluga 3 → item aparece INDISPONÍVEL.
-- CAUSA: O estoque era descontado duas vezes.
--   1. O trigger da V24 (handle_booking_inventory_sync) subtrai a quantidade de
--      equipments.stock_quantity quando a reserva é aprovada (6 → 3).
--   2. O app (marketplace, detalhes, checkout) trata stock_quantity como o TOTAL
--      de unidades e desconta as reservas por data (3 − 3 = 0 → indisponível).
--   Além disso, a baixa da V24 acontece na aprovação, mesmo que a locação seja
--   só no mês seguinte — o item ficava "ocupado" desde já.
--
-- SOLUÇÃO: stock_quantity passa a ser SEMPRE o total de unidades da locadora.
--   A disponibilidade é calculada só pelas reservas que se sobrepõem às datas
--   (como o app já faz). O trigger continua registrando o histórico em
--   network_logs, mas não mexe mais no estoque nem no status do equipamento.
--   Por fim, devolve ao estoque as unidades já descontadas pelas reservas atuais.
-- ==============================================================================


-- ── 1. Prévia: o que será devolvido ao estoque ───────────────────────────────
SELECT e.name,
       e.stock_quantity               AS estoque_atual,
       SUM(b.quantity)                AS a_devolver,
       e.stock_quantity + SUM(b.quantity) AS estoque_corrigido
FROM public.bookings b
JOIN public.equipments e ON e.id = b.equipment_id
WHERE b.status IN ('approved', 'active')
GROUP BY e.id, e.name, e.stock_quantity
ORDER BY e.name;


-- ── 2. Trigger: só registra histórico, sem alterar estoque ───────────────────
CREATE OR REPLACE FUNCTION public.handle_booking_inventory_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'approved' OR NEW.status = 'active')
       AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'active')) THEN
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (NEW.equipment_id, NEW.id, 'BOOKING_APPROVED',
                NEW.quantity || ' unidade(s) reservada(s) de ' || NEW.start_date || ' a ' || NEW.end_date || '.');
    END IF;

    IF NEW.status = 'completed' AND (OLD.status = 'approved' OR OLD.status = 'active') THEN
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (NEW.equipment_id, NEW.id, 'BOOKING_COMPLETED',
                NEW.quantity || ' unidade(s) devolvida(s) após conclusão da locação.');
    END IF;

    IF NEW.status = 'cancelled' AND (OLD.status = 'approved' OR OLD.status = 'active') THEN
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (NEW.equipment_id, NEW.id, 'BOOKING_CANCELLED',
                NEW.quantity || ' unidade(s) liberada(s) pelo cancelamento do pedido.');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 3. Devolve ao estoque o que a V24 descontou das reservas atuais ──────────
DO $$
DECLARE
    r record;
    v_branch_id uuid;
BEGIN
    FOR r IN
        SELECT b.equipment_id, b.company_id, b.origin_branch_id, b.quantity
        FROM public.bookings b
        WHERE b.status IN ('approved', 'active')
    LOOP
        UPDATE public.equipments
        SET stock_quantity = stock_quantity + r.quantity
        WHERE id = r.equipment_id;

        -- Mesma regra de filial usada pela V24 na baixa
        v_branch_id := r.origin_branch_id;
        IF v_branch_id IS NULL THEN
            SELECT id INTO v_branch_id FROM public.branches
            WHERE company_id = r.company_id AND is_main = true LIMIT 1;
        END IF;

        IF v_branch_id IS NOT NULL THEN
            UPDATE public.equipment_stock
            SET quantity = quantity + r.quantity
            WHERE equipment_id = r.equipment_id AND branch_id = v_branch_id;
        END IF;
    END LOOP;

    -- Equipamentos marcados como 'rented' pela V19/V24 voltam a 'available'
    UPDATE public.equipments SET status = 'available' WHERE status = 'rented';
END $$;


-- ── 4. Conferência ───────────────────────────────────────────────────────────
SELECT name, stock_quantity, status FROM public.equipments ORDER BY name;
