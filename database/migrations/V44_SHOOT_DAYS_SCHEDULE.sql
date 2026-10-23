-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V44_SHOOT_DAYS_SCHEDULE
--
-- NOVA REGRA DO NEGÓCIO
--   O cliente escolhe: dia da RETIRADA → dias de GRAVAÇÃO → dia da DEVOLUÇÃO.
--   Ex.: retira qui 29/10, grava sex 30 e sáb 31, devolve seg 02/11.
--
--   - Cobra-se só os dias de gravação (primeiro e último incluídos): 2 diárias.
--   - O equipamento fica ocupado da retirada à devolução (start_date → end_date).
--   - Retirada e devolução só de segunda a sexta (locadoras fecham sábado e domingo).
--     Gravar no fim de semana pode.
--
-- O QUE MUDA NO BANCO
--   1. bookings ganha shoot_start_date / shoot_end_date (pedidos antigos ficam vazios).
--   2. O cálculo do total passa a usar os dias de gravação, quando houver.
--   3. Pedido novo com retirada ou devolução no fim de semana é recusado.
--   4. Prorrogação não pode terminar no sábado ou domingo.
--
-- Pode rodar mais de uma vez.
-- ==============================================================================


-- ── 1. Colunas ──────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS shoot_start_date date;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS shoot_end_date   date;

-- Gravação dentro do período em que o equipamento está com o cliente
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_shoot_within_rental;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_shoot_within_rental CHECK (
    shoot_start_date IS NULL
    OR (
        shoot_end_date IS NOT NULL
        AND shoot_end_date   >= shoot_start_date
        AND shoot_start_date >= start_date
        AND shoot_end_date   <= end_date
    )
);


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

    IF NEW.shoot_start_date IS NOT NULL THEN
        -- Agenda nova: retirada e devolução só em dia útil (ISODOW 6 = sábado, 7 = domingo)
        IF EXTRACT(ISODOW FROM NEW.start_date) IN (6, 7) THEN
            RAISE EXCEPTION 'A retirada precisa ser de segunda a sexta (sábado e domingo as locadoras fecham).';
        END IF;
        IF EXTRACT(ISODOW FROM NEW.end_date) IN (6, 7) THEN
            RAISE EXCEPTION 'A devolução precisa ser de segunda a sexta (sábado e domingo as locadoras fecham).';
        END IF;

        -- Cobra-se só os dias de gravação, contando o primeiro e o último
        v_days := GREATEST(NEW.shoot_end_date - NEW.shoot_start_date + 1, 1);
    ELSE
        -- Pedido no formato antigo: diárias da retirada à devolução
        v_days := GREATEST(NEW.end_date - NEW.start_date, 1);
    END IF;

    NEW.total_amount := v_daily_rate * v_days * GREATEST(COALESCE(NEW.quantity, 1), 1);

    RETURN NEW;
END;
$$;


-- ── 3. Prorrogação: a nova devolução também precisa ser em dia útil ──────────────
CREATE OR REPLACE FUNCTION public.request_booking_extension(p_booking_id uuid, p_new_end_date date)
RETURNS public.booking_extensions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking record;
    v_rate numeric;
    v_days integer;
    v_row public.booking_extensions;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF v_booking.id IS NULL OR v_booking.renter_id <> auth.uid() THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;
    IF v_booking.status NOT IN ('approved', 'active') THEN
        RAISE EXCEPTION 'Só é possível prorrogar pedidos aprovados ou em andamento.';
    END IF;
    IF p_new_end_date <= v_booking.end_date THEN
        RAISE EXCEPTION 'A nova data precisa ser depois de %.', to_char(v_booking.end_date, 'DD/MM');
    END IF;
    IF EXTRACT(ISODOW FROM p_new_end_date) IN (6, 7) THEN
        RAISE EXCEPTION 'A devolução precisa ser de segunda a sexta (sábado e domingo as locadoras fecham).';
    END IF;
    IF EXISTS (SELECT 1 FROM public.booking_extensions WHERE booking_id = p_booking_id AND status = 'pending') THEN
        RAISE EXCEPTION 'Já existe um pedido de prorrogação aguardando a locadora.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.deliveries WHERE booking_id = p_booking_id
               AND COALESCE(reverse_logistics_status, 'not_started') NOT IN ('not_started', 'cancelled')) THEN
        RAISE EXCEPTION 'A devolução já foi solicitada. Cancele-a para prorrogar.';
    END IF;
    IF NOT public.extension_is_available(p_booking_id, v_booking.end_date + 1, p_new_end_date) THEN
        RAISE EXCEPTION 'O equipamento não está disponível em todos os dias até %.', to_char(p_new_end_date, 'DD/MM');
    END IF;

    SELECT daily_rate INTO v_rate FROM public.equipments WHERE id = v_booking.equipment_id;
    v_days := p_new_end_date - v_booking.end_date;

    INSERT INTO public.booking_extensions
        (booking_id, requested_by, current_end_date, new_end_date, extra_days, extra_amount)
    VALUES
        (p_booking_id, auth.uid(), v_booking.end_date, p_new_end_date, v_days,
         v_rate * v_days * GREATEST(COALESCE(v_booking.quantity, 1), 1))
    RETURNING * INTO v_row;

    PERFORM public.notify_booking_company(
        p_booking_id,
        'Pedido de prorrogação',
        'O cliente pediu para estender a locação até ' || to_char(p_new_end_date, 'DD/MM') ||
        ' (+' || v_days || ' diária' || CASE WHEN v_days > 1 THEN 's' ELSE '' END || ').',
        'booking'
    );

    RETURN v_row;
END;
$$;


-- ── 4. Conferência ──────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
  AND column_name IN ('shoot_start_date', 'shoot_end_date');
