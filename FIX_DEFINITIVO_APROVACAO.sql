-- ================================================================
-- FIX FINAL: APROVAÇÃO KYC - COM row_security = off
-- Execute este script no Supabase SQL Editor
-- ================================================================

-- PASSO 1: Dropar versão antiga
DROP FUNCTION IF EXISTS public.approve_company(UUID);

-- PASSO 2: Recriar com row_security = off (bypassa RLS de verdade)
CREATE OR REPLACE FUNCTION public.approve_company(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_owner_id UUID;
    v_rows INTEGER;
    v_current_role TEXT;
BEGIN
    -- Verificar se quem chama é admin
    SELECT role INTO v_current_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_current_role IS DISTINCT FROM 'admin' THEN
        RETURN 'ERRO: Sem permissão. Role atual: ' || COALESCE(v_current_role, 'NULL');
    END IF;

    -- Buscar owner da empresa
    SELECT owner_id INTO v_owner_id
    FROM public.companies
    WHERE id = p_company_id;

    IF v_owner_id IS NULL THEN
        RETURN 'ERRO: Empresa não encontrada com ID ' || p_company_id::text;
    END IF;

    -- Atualizar status da empresa (RLS desligado via SET row_security = off)
    UPDATE public.companies
    SET status = 'approved'
    WHERE id = p_company_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows = 0 THEN
        RETURN 'ERRO: UPDATE não afetou nenhuma linha mesmo com row_security=off.';
    END IF;

    -- Atualizar role do dono para rental_house
    UPDATE public.profiles
    SET role = 'rental_house'
    WHERE id = v_owner_id;

    RETURN 'OK';

EXCEPTION WHEN OTHERS THEN
    RETURN 'ERRO SQL: ' || SQLERRM;
END;
$$;

-- PASSO 3: Permissões
GRANT EXECUTE ON FUNCTION public.approve_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_company(UUID) TO service_role;

-- PASSO 4: Policy RLS para admin poder fazer UPDATE direto (fallback do frontend)
DROP POLICY IF EXISTS "Admins can update any company" ON public.companies;
CREATE POLICY "Admins can update any company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- PASSO 5: APROVAR AS 3 EMPRESAS PENDENTES AGORA MESMO (fix imediato)
UPDATE public.companies
SET status = 'approved'
WHERE name IN ('Locadora de teste A', 'Cine Fort', 'Teste externo 121')
  AND status = 'pending';

-- PASSO 6: Atualizar o role dos donos também
UPDATE public.profiles
SET role = 'rental_house'
WHERE id IN (
    SELECT owner_id FROM public.companies
    WHERE name IN ('Locadora de teste A', 'Cine Fort', 'Teste externo 121')
)
AND role != 'admin';

-- PASSO 7: Confirmar resultado
SELECT c.name, c.status, p.role as owner_role
FROM public.companies c
LEFT JOIN public.profiles p ON p.id = c.owner_id
WHERE c.name IN ('Locadora de teste A', 'Cine Fort', 'Teste externo 121');
