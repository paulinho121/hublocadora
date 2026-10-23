-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V45_SPACED_SHOOT_DAYS
--
-- AJUSTE DA REGRA (depois da V44)
--   Os dias de gravação podem ser espaçados: ex. 26, 27 e 30.
--   - Cobra-se só os dias marcados (3 diárias no exemplo).
--   - O equipamento continua com o cliente da retirada até a devolução
--     (28 e 29 ficam ocupados, mas não são cobrados).
--
-- O QUE MUDA
--   1. bookings ganha shoot_dates (lista de datas).
--   2. O total usa a quantidade de dias marcados; shoot_start_date / shoot_end_date
--      passam a ser o primeiro e o último dia da lista (preenchidos pelo banco).
--   3. Todos os dias marcados precisam estar entre a retirada e a devolução.
--
-- Rode depois da V44. Pode rodar mais de uma vez.
-- ==============================================================================


-- ── 1. Coluna ───────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS shoot_dates date[];


-- ── 2. Total e regras de agenda (gatilho BEFORE INSERT já existente) ─────────────
CREATE OR REPLACE FUNCTION public.calculate_booking_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_daily_rate numeric;
    v_days integer;
BEGIN
    -- Diária real do equipamento no banco (ignora o valor enviado pelo app)
    SELECT daily_rate INTO v_daily_rate FROM public.equipments WHERE id = NEW.equipment_id;

    IF v_daily_rate IS NULL THEN
        RAISE EXCEPTION 'Equipamento não encontrado para cálculo de preço.';
    END IF;

    -- Dias espaçados: ordena, tira repetidos e deriva o primeiro/último dia
    IF NEW.shoot_dates IS NOT NULL AND cardinality(NEW.shoot_dates) > 0 THEN
        SELECT array_agg(DISTINCT d ORDER BY d) INTO NEW.shoot_dates FROM unnest(NEW.shoot_dates) AS d;
        NEW.shoot_start_date := NEW.shoot_dates[1];
        NEW.shoot_end_date   := NEW.shoot_dates[cardinality(NEW.shoot_dates)];
    END IF;

    IF NEW.shoot_start_date IS NOT NULL THEN
        -- Retirada e devolução só em dia útil (ISODOW 6 = sábado, 7 = domingo)
        IF EXTRACT(ISODOW FROM NEW.start_date) IN (6, 7) THEN
            RAISE EXCEPTION 'A retirada precisa ser de segunda a sexta (sábado e domingo as locadoras fecham).';
        END IF;
        IF EXTRACT(ISODOW FROM NEW.end_date) IN (6, 7) THEN
            RAISE EXCEPTION 'A devolução precisa ser de segunda a sexta (sábado e domingo as locadoras fecham).';
        END IF;
        IF NEW.shoot_start_date < NEW.start_date OR NEW.shoot_end_date > NEW.end_date THEN
            RAISE EXCEPTION 'Os dias de gravação precisam ficar entre a retirada e a devolução.';
        END IF;

        -- Cobra-se só os dias de gravação
        IF NEW.shoot_dates IS NOT NULL AND cardinality(NEW.shoot_dates) > 0 THEN
            v_days := cardinality(NEW.shoot_dates);
        ELSE
            v_days := GREATEST(NEW.shoot_end_date - NEW.shoot_start_date + 1, 1);
        END IF;
    ELSE
        -- Pedido no formato antigo: diárias da retirada à devolução
        v_days := GREATEST(NEW.end_date - NEW.start_date, 1);
    END IF;

    NEW.total_amount := v_daily_rate * v_days * GREATEST(COALESCE(NEW.quantity, 1), 1);

    RETURN NEW;
END;
$$;


-- ── 3. Conferência ──────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
  AND column_name IN ('shoot_start_date', 'shoot_end_date', 'shoot_dates');
