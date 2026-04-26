-- ================================================================
-- FIX DEFINITIVO: APROVAÇÃO KYC DE SUBLOCADORAS
-- Execute este script inteiro no Supabase SQL Editor
-- ================================================================

-- PASSO 1: Dropar versão antiga e recriar sem updated_at
DROP FUNCTION IF EXISTS public.approve_company(UUID);

-- PASSO 2: Criar função correta (sem updated_at que não existe)
CREATE OR REPLACE FUNCTION public.approve_company(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
    v_rows INTEGER;
    v_current_role TEXT;
BEGIN
    -- Verificar se é admin
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

    -- Atualizar status da empresa (sem updated_at)
    UPDATE public.companies
    SET status = 'approved'
    WHERE id = p_company_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows = 0 THEN
        RETURN 'ERRO: UPDATE não afetou nenhuma linha. Verifique RLS na tabela companies.';
    END IF;

    -- Atualizar role do dono para rental_house (sem updated_at)
    UPDATE public.profiles
    SET role = 'rental_house'
    WHERE id = v_owner_id;

    RETURN 'OK';

EXCEPTION WHEN OTHERS THEN
    RETURN 'ERRO SQL: ' || SQLERRM;
END;
$$;

-- PASSO 3: Permissões de execução
GRANT EXECUTE ON FUNCTION public.approve_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_company(UUID) TO service_role;

-- PASSO 4: Constraint de status correta
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_status_check
    CHECK (status IN ('pending', 'approved', 'active', 'rejected', 'suspended'));

-- PASSO 5: Policy RLS para admin poder fazer UPDATE direto
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

-- PASSO 6: Confirmar que funcionou - ver empresas pendentes
SELECT id, name, status, owner_id
FROM public.companies
WHERE status = 'pending'
ORDER BY created_at DESC;
