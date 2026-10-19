-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V34_ADMIN_GET_ALL_BOOKINGS_RPC
--
-- PROBLEMA: Admin vê 0 transações no dashboard mesmo após V33.
-- CAUSA: check_is_admin() não é SECURITY DEFINER, causando avaliação
--        recursiva de RLS em profiles que retorna falso para o admin.
--
-- SOLUÇÃO: Função RPC SECURITY DEFINER que bypassa RLS completamente,
--          igual ao padrão já usado em admin_get_all_profiles().
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_get_all_bookings()
RETURNS TABLE (
    id                  uuid,
    created_at          timestamptz,
    updated_at          timestamptz,
    equipment_id        uuid,
    company_id          uuid,
    renter_id           uuid,
    start_date          date,
    end_date            date,
    quantity            integer,
    total_amount        numeric,
    status              text,
    notes               text,
    delivery_method     text,
    delivery_address    text,
    delivery_contact    text,
    equipment_name      text,
    equipment_category  text,
    company_name        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar todos os pedidos.';
    END IF;

    RETURN QUERY
    SELECT
        b.id,
        b.created_at,
        b.updated_at,
        b.equipment_id,
        b.company_id,
        b.renter_id,
        b.start_date,
        b.end_date,
        b.quantity,
        b.total_amount,
        b.status::text,
        b.notes,
        b.delivery_method,
        b.delivery_address,
        b.delivery_contact,
        e.name   AS equipment_name,
        e.category AS equipment_category,
        c.name   AS company_name
    FROM public.bookings b
    LEFT JOIN public.equipments e ON e.id = b.equipment_id
    LEFT JOIN public.companies  c ON c.id = b.company_id
    ORDER BY b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_bookings() TO authenticated;
