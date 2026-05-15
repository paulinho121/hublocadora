-- ==============================================================================
-- CINEHUB: PRODUCTION RESET SCRIPT
-- ==============================================================================
-- Este script realiza a limpeza completa do banco de dados para entrada em produção.
-- REGRAS:
-- 1. Preserva o Super Usuário: paulofernandoautomacao@gmail.com
-- 2. Remove todos os outros usuários (Auth e Profiles)
-- 3. Remove todos os valores de teste (Reservas, Entregas, Pagamentos, Logs)
-- 4. Remove todos os equipamentos (Luminárias) e seus estoques atribuídos
-- 5. Remove todas as empresas e filiais de teste (exceto a empresa do Master)
-- ==============================================================================

DO $$
DECLARE
    v_super_user_email text := 'paulofernandoautomacao@gmail.com';
    v_super_user_id uuid;
    v_master_company_id uuid;
BEGIN
    -- 1. IDENTIFICAR O SUPER USUÁRIO
    SELECT id INTO v_super_user_id FROM auth.users WHERE email = v_super_user_email;
    
    IF v_super_user_id IS NULL THEN
        RAISE EXCEPTION 'ERRO: Super Usuário (%) não encontrado. Por favor, crie o usuário primeiro ou verifique o e-mail.', v_super_user_email;
    END IF;

    -- 2. IDENTIFICAR A EMPRESA MASTER (Vinculada ao Super Usuário)
    SELECT company_id INTO v_master_company_id FROM public.profiles WHERE id = v_super_user_id;

    -- 3. LIMPAR DADOS TRANSACIONAIS (Logística, Financeiro, Reservas)
    RAISE NOTICE 'Limpando dados transacionais e logs...';
    
    -- Tabelas de Logística e Rastreamento
    TRUNCATE TABLE public.delivery_secrets CASCADE;
    TRUNCATE TABLE public.deliveries CASCADE;
    TRUNCATE TABLE public.logistics_tracking CASCADE;
    TRUNCATE TABLE public.network_logs CASCADE;
    TRUNCATE TABLE public.internal_transfers CASCADE;
    
    -- Tabelas de Negócio
    TRUNCATE TABLE public.payments CASCADE;
    TRUNCATE TABLE public.financial_transactions CASCADE;
    TRUNCATE TABLE public.reviews CASCADE;
    TRUNCATE TABLE public.notifications CASCADE;
    TRUNCATE TABLE public.favorites CASCADE;
    TRUNCATE TABLE public.bookings CASCADE;

    -- 4. LIMPAR EQUIPAMENTOS E ATRIBUIÇÕES (LUMINÁRIAS)
    RAISE NOTICE 'Limpando inventário e atribuições de estoque...';
    TRUNCATE TABLE public.equipment_stock CASCADE;
    DELETE FROM public.equipments; -- Remove todas as luminárias de teste

    -- 5. LIMPAR FILIAIS E UNIDADES
    RAISE NOTICE 'Limpando unidades e filiais...';
    DELETE FROM public.branches;

    -- 6. LIMPAR PERFIS DE USUÁRIO (Exceto Super Usuário)
    RAISE NOTICE 'Limpando perfis de usuários de teste...';
    DELETE FROM public.profiles WHERE id != v_super_user_id;
    
    -- Garantir que o Super Usuário tenha cargo de Admin
    UPDATE public.profiles SET role = 'admin' WHERE id = v_super_user_id;

    -- 7. LIMPAR EMPRESAS (Exceto Empresa Master)
    RAISE NOTICE 'Limpando empresas de teste...';
    IF v_master_company_id IS NOT NULL THEN
        DELETE FROM public.companies WHERE id != v_master_company_id;
        UPDATE public.companies SET status = 'active' WHERE id = v_master_company_id;
    ELSE
        DELETE FROM public.companies;
    END IF;

    -- 8. LIMPAR USUÁRIOS DE AUTENTICAÇÃO E SESSÕES (Exceto Super Usuário)
    RAISE NOTICE 'Limpando usuários e sessões da camada Auth...';
    
    -- Forçar logout deletando sessões e tokens de atualização
    DELETE FROM auth.sessions WHERE user_id != v_super_user_id;
    DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id != v_super_user_id);

    -- Deletar os usuários
    DELETE FROM auth.users WHERE id != v_super_user_id;

    -- 9. MANTER CATEGORIAS (Opcional - Mantemos pois são dados de base)
    -- As categorias foram mantidas para não quebrar a estrutura do marketplace.

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '   BANCO DE DADOS PREPARADO PARA PRODUÇÃO COM SUCESSO   ';
    RAISE NOTICE '   Super Usuário Preservado: %', v_super_user_email;
    RAISE NOTICE '=======================================================';

END $$;
