-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V38_COMPANIES_PRIVACY
--
-- PROBLEMA 1 (LGPD): qualquer pessoa, mesmo sem login, lia TODAS as colunas das
--   locadoras aprovadas/ativas: CPF/CNPJ, chave PIX, dados bancários, dados
--   fiscais, telefone e endereço completo. Locadoras logadas também viam os
--   dados das concorrentes. RLS filtra linhas, não colunas.
--
-- SOLUÇÃO: privilégio por coluna. anon/authenticated só leem as colunas
--   públicas (nome, logo, cidade, UF, status...). As colunas privadas são lidas
--   pela função get_company_private (dono da empresa ou admin) e
--   admin_get_companies_private (admin). Escrita (INSERT/UPDATE) não muda.
--
-- PROBLEMA 2: admin_get_all_bookings (V34) falhava sempre com
--   "column reference id is ambiguous" (conflito com a coluna de saída "id")
--   e, depois disso, falharia por ler bookings.updated_at, que não existe.
--
-- PROBLEMA 3: CPF/CNPJ duplicado não era bloqueado (checagem no navegador
--   não enxergava empresas de outros usuários). Agora: índice único.
-- ==============================================================================


-- ── 1. Colunas públicas de companies ─────────────────────────────────────────
REVOKE SELECT ON public.companies FROM anon, authenticated;
GRANT SELECT (
    id, owner_id, name, description, logo_url,
    address_city, address_state, state_uf,
    status, created_at, parent_company_id
) ON public.companies TO anon, authenticated;


-- ── 2. Colunas privadas: só para o dono (ou membro) da empresa e admin ───────
CREATE OR REPLACE FUNCTION public.get_company_private(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'document',             c.document,
        'phone',                c.phone,
        'address_street',       c.address_street,
        'address_number',       c.address_number,
        'address_complement',   c.address_complement,
        'address_neighborhood', c.address_neighborhood,
        'address_zip',          c.address_zip,
        'financial_config',     c.financial_config
    )
    INTO v_result
    FROM public.companies c
    WHERE c.id = p_company_id
      AND (c.owner_id = auth.uid()
           OR c.id = public.get_my_company_id()
           OR public.check_is_admin());

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_private(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_private(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_get_companies_private()
RETURNS TABLE (
    company_id           uuid,
    document             text,
    phone                text,
    address_street       text,
    address_number       text,
    address_complement   text,
    address_neighborhood text,
    address_zip          text,
    financial_config     jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores.';
    END IF;

    RETURN QUERY
    SELECT c.id, c.document::text, c.phone::text, c.address_street::text, c.address_number::text,
           c.address_complement::text, c.address_neighborhood::text, c.address_zip::text,
           c.financial_config::jsonb
    FROM public.companies c;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_companies_private() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_companies_private() TO authenticated;


-- ── 3. Corrige admin_get_all_bookings (coluna "id" ambígua) ──────────────────
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
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar todos os pedidos.';
    END IF;

    -- bookings não tem updated_at: devolve created_at para manter o formato esperado pelo app
    RETURN QUERY
    SELECT
        b.id,
        b.created_at::timestamptz,
        b.created_at::timestamptz,
        b.equipment_id,
        b.company_id,
        b.renter_id,
        b.start_date::date,
        b.end_date::date,
        b.quantity::integer,
        b.total_amount::numeric,
        b.status::text,
        b.notes::text,
        b.delivery_method::text,
        b.delivery_address::text,
        b.delivery_contact::text,
        e.name::text,
        e.category::text,
        c.name::text
    FROM public.bookings b
    LEFT JOIN public.equipments e ON e.id = b.equipment_id
    LEFT JOIN public.companies  c ON c.id = b.company_id
    ORDER BY b.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_bookings() TO authenticated;


-- ── 4. CPF/CNPJ único (compara só os dígitos: "123.456..." = "123456...") ────
--   Antes a checagem era feita no navegador e não enxergava empresas de outros
--   usuários (RLS), então duplicatas passavam.
CREATE UNIQUE INDEX IF NOT EXISTS companies_document_digits_key
    ON public.companies ((regexp_replace(document, '\D', '', 'g')))
    WHERE document IS NOT NULL AND document <> '';


-- ── 5. Conferência: colunas que anon consegue ler em companies ───────────────
SELECT column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'companies'
  AND grantee = 'anon' AND privilege_type = 'SELECT'
ORDER BY column_name;
