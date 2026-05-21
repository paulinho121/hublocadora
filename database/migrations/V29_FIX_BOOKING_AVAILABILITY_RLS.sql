-- Migration: V29_FIX_BOOKING_AVAILABILITY_RLS
-- Descrição: Corrige dupla locação na mesma data.
--
-- PROBLEMA: A política RLS "Bookings_Select" restringe cada usuário a ver apenas
-- suas próprias reservas. Isso faz com que um novo usuário (locatário) não consiga
-- ver reservas ativas de outros usuários ao verificar disponibilidade — resultando
-- em dupla locação do mesmo equipamento na mesma data.
--
-- SOLUÇÃO: Funções SECURITY DEFINER que retornam apenas dados de disponibilidade
-- (sem PII/dados sensíveis) para consultas públicas de ocupação de agenda.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. get_equipment_occupied_dates
--    Retorna as janelas de tempo ocupadas de um equipamento.
--    Usada pelo modal de reserva rápida para bloquear datas conflitantes.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_equipment_occupied_dates(UUID);

CREATE OR REPLACE FUNCTION public.get_equipment_occupied_dates(p_equipment_id UUID)
RETURNS TABLE (
    start_date TEXT,
    end_date   TEXT,
    quantity   INTEGER,
    status     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.start_date::TEXT,
        b.end_date::TEXT,
        b.quantity,
        b.status::TEXT
    FROM public.bookings b
    WHERE b.equipment_id = p_equipment_id
      AND b.status IN ('pending', 'approved', 'active');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_equipment_occupied_dates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_occupied_dates(UUID) TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_marketplace_active_bookings
--    Retorna todas as reservas ativas/pendentes/aprovadas para exibição de
--    disponibilidade no marketplace (sem dados sensíveis do locatário).
--    Inclui 'pending' para que itens com reserva pendente apareçam como LOCADO.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_marketplace_active_bookings(TEXT);

CREATE OR REPLACE FUNCTION public.get_marketplace_active_bookings(p_from_date TEXT)
RETURNS TABLE (
    equipment_id UUID,
    quantity     INTEGER,
    start_date   TEXT,
    end_date     TEXT,
    status       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.equipment_id,
        b.quantity,
        b.start_date::TEXT,
        b.end_date::TEXT,
        b.status::TEXT
    FROM public.bookings b
    WHERE b.status IN ('active', 'approved', 'pending')
      AND b.end_date >= p_from_date::DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_active_bookings(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_active_bookings(TEXT) TO anon;
