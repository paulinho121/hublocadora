-- Migration: V27_ADMIN_GET_ALL_PROFILES
-- Cria função RPC com SECURITY DEFINER para admin listar todos os perfis,
-- contornando as políticas RLS da tabela profiles.

CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
    id        uuid,
    email     text,
    full_name text,
    role      text,
    company_id uuid,
    created_at timestamptz,
    updated_at timestamptz,
    company_name text
) AS $$
BEGIN
    -- Verificar se o chamador é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar todos os perfis.';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.full_name,
        p.role::text,
        p.company_id,
        p.created_at,
        p.updated_at,
        c.name AS company_name
    FROM public.profiles p
    LEFT JOIN public.companies c ON c.id = p.company_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_get_all_profiles() TO authenticated;
