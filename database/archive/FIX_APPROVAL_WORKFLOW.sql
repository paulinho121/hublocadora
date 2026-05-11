-- ======================================================
-- CORREÇÃO DEFINITIVA: FLUXO DE APROVAÇÃO (KYC)
-- ======================================================

-- 1. Garante que a coluna status existe e tem todos os valores permitidos
DO $$ 
BEGIN 
    -- Adiciona a coluna se não existir
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE public.companies ADD COLUMN status text DEFAULT 'pending';
    END IF;
END $$;

-- 2. Atualiza o constraint de check para incluir 'approved' e 'active'
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_status_check 
CHECK (status IN ('pending', 'approved', 'active', 'rejected', 'suspended'));

-- 3. Recria a RPC de aprovação com maior robustez
-- Ela agora também atualiza o role do proprietário para 'rental_house'
CREATE OR REPLACE FUNCTION public.approve_company(p_company_id UUID)
RETURNS VOID AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- Verifica se quem está chamando é um admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem aprovar empresas.';
    END IF;

    -- Busca o dono da empresa
    SELECT owner_id INTO v_owner_id FROM public.companies WHERE id = p_company_id;

    -- Atualiza o status da empresa para 'approved'
    UPDATE public.companies
    SET status = 'approved'
    WHERE id = p_company_id;

    -- Se encontrarmos o dono, atualizamos o role dele para 'rental_house'
    -- Isso garante que ele tenha as permissões corretas no sistema
    IF v_owner_id IS NOT NULL THEN
        UPDATE public.profiles
        SET role = 'rental_house'
        WHERE id = v_owner_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Forçar atualização das empresas que estão no limbo (opcional mas ajuda o usuário)
-- Se elas já foram "aprovadas" no passado mas o status não mudou, isso resolve
UPDATE public.companies 
SET status = 'approved' 
WHERE status = 'pending' AND (name ILIKE '%TESTE%' OR name = 'Cine Fort');
