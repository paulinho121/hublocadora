-- ======================================================
-- V18: RPC approve_company (SECURITY DEFINER)
-- Permite que o admin aprove uma locadora pendente,
-- atualizando companies.status e profiles.role.
-- ======================================================

-- Garante o constraint correto de status
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_status_check
  CHECK (status IN ('pending', 'approved', 'active', 'rejected', 'suspended'));

-- Cria/substitui a função RPC
DROP FUNCTION IF EXISTS public.approve_company(UUID);
CREATE OR REPLACE FUNCTION public.approve_company(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_owner_id UUID;
    v_rows_affected INTEGER;
BEGIN
    -- 1. Verifica se quem chama é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN 'ERRO: Você não tem permissão de administrador (role=admin).';
    END IF;

    -- 2. Busca o dono da empresa
    SELECT owner_id INTO v_owner_id
    FROM public.companies
    WHERE id = p_company_id;

    IF v_owner_id IS NULL THEN
        RETURN 'ERRO: Empresa não encontrada com o ID ' || p_company_id;
    END IF;

    -- 3. Aprova a empresa
    UPDATE public.companies
    SET status = 'approved'
    WHERE id = p_company_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
        RETURN 'ERRO: O UPDATE não afetou nenhuma linha. Verifique as políticas RLS.';
    END IF;

    -- 4. Promove o dono para rental_house
    UPDATE public.profiles
    SET role = 'rental_house'
    WHERE id = v_owner_id;

    RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERRO SQL: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante que apenas usuários autenticados podem executar
REVOKE ALL ON FUNCTION public.approve_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_company(UUID) TO authenticated;
