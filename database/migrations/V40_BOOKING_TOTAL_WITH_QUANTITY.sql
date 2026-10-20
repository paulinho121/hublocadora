-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V40_BOOKING_TOTAL_WITH_QUANTITY
--
-- PROBLEMA: calculate_booking_total (gatilho BEFORE INSERT em bookings) gravava
--   total = diária × dias, ignorando a quantidade. Uma reserva de 3 unidades por
--   2 dias a R$ 100 aparecia como R$ 600 no app e era gravada como R$ 200.
--
-- SOLUÇÃO: total = diária × dias × quantidade (mesma conta que o app mostra).
--   Continua valendo só na criação da reserva: depois disso a locadora pode
--   ajustar o valor manualmente na edição do pedido (descontos etc.).
-- ==============================================================================


-- ── 1. Prévia: reservas em aberto com mais de 1 unidade (gravadas com valor de 1) ──
SELECT b.id,
       e.name                                   AS equipamento,
       b.quantity                               AS qtd,
       b.start_date, b.end_date, b.status,
       b.total_amount                           AS total_gravado,
       b.total_amount * b.quantity              AS total_corrigido
FROM public.bookings b
JOIN public.equipments e ON e.id = b.equipment_id
WHERE b.quantity > 1
  AND b.status IN ('pending', 'approved', 'active')
ORDER BY b.created_at DESC;


-- ── 2. Gatilho corrigido ─────────────────────────────────────────────────────
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

    -- Número de diárias (mínimo 1), igual ao app
    v_days := GREATEST(NEW.end_date - NEW.start_date, 1);

    NEW.total_amount := v_daily_rate * v_days * GREATEST(COALESCE(NEW.quantity, 1), 1);

    RETURN NEW;
END;
$$;


-- ── 3. OPCIONAL: corrigir as reservas em aberto listadas na prévia ───────────
-- Multiplica o total gravado pela quantidade. Só rode se a prévia mostrar
-- reservas e nenhuma delas tiver tido o valor ajustado à mão pela locadora.
-- Para rodar, tire os "--" das 4 linhas abaixo.
--
-- UPDATE public.bookings
-- SET total_amount = total_amount * quantity
-- WHERE quantity > 1
--   AND status IN ('pending', 'approved', 'active');
