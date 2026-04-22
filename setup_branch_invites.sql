-- Função para buscar os detalhes do convite de forma segura (sem autenticação)
CREATE OR REPLACE FUNCTION public.get_branch_by_token(p_token text)
RETURNS json AS $$
DECLARE
    v_branch record;
BEGIN
    SELECT id, name, company_id, manager_email INTO v_branch 
    FROM public.branches 
    WHERE invite_token = p_token AND status = 'invited';
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_branch);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aceitar o convite, vinculando o usuário à empresa
CREATE OR REPLACE FUNCTION public.accept_branch_invite(p_token text)
RETURNS boolean AS $$
DECLARE
    v_branch record;
BEGIN
    -- Encontrar a branch pelo token
    SELECT * INTO v_branch FROM public.branches WHERE invite_token = p_token AND status = 'invited';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Convite inválido ou já utilizado.';
    END IF;

    -- Atualizar o perfil do usuário recém-criado para pertencer à empresa e ser locadora
    UPDATE public.profiles
    SET company_id = v_branch.company_id,
        role = 'rental_house'
    WHERE id = auth.uid();

    -- Atualizar o status da branch para active
    UPDATE public.branches
    SET status = 'active'
    WHERE id = v_branch.id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
