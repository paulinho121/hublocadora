-- ======================================================
-- SUPER FIX: FLUXO DE APROVAÇÃO COM FEEDBACK REAL
-- ======================================================

-- 1. Garante que o tipo de dado e constraint estão perfeitos
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_status_check 
CHECK (status IN ('pending', 'approved', 'active', 'rejected', 'suspended'));

-- 2. Nova RPC que RETORNA TEXTO informando o que aconteceu
-- Se retornar 'OK', funcionou. Se não, dirá o erro.
DROP FUNCTION IF EXISTS public.approve_company(UUID);
CREATE OR REPLACE FUNCTION public.approve_company(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_owner_id UUID;
    v_rows_affected INTEGER;
BEGIN
    -- 1. Log de início
    RAISE NOTICE 'Iniciando aprovação para a empresa %', p_company_id;

    -- 2. Verifica Admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN 'ERRO: Você não tem permissão de administrador (role=admin).';
    END IF;

    -- 3. Verifica se a empresa existe
    SELECT owner_id INTO v_owner_id FROM public.companies WHERE id = p_company_id;
    IF v_owner_id IS NULL THEN
        RETURN 'ERRO: Empresa não encontrada com o ID ' || p_company_id;
    END IF;

    -- 4. Tenta o UPDATE
    UPDATE public.companies
    SET status = 'approved'
    WHERE id = p_company_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected = 0 THEN
        RETURN 'ERRO: O comando UPDATE não afetou nenhuma linha. Verifique RLS.';
    END IF;

    -- 5. Atualiza o Dono
    UPDATE public.profiles
    SET role = 'rental_house'
    WHERE id = v_owner_id;

    RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERRO SQL: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Forçar aprovação das que estão travadas agora mesmo
UPDATE public.companies SET status = 'approved' WHERE name IN ('Locadora de teste A', 'Cine Fort', 'Teste externo 121');
