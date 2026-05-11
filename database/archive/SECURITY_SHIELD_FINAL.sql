-- ==============================================================================
-- CINEHUB SECURITY SHIELD: BLINDAGEM FINAL (V11)
-- ==============================================================================
-- Este script corrige falhas críticas de segurança que permitiam deleção de dados
-- por usuários não autorizados e vazamento de informações pessoais (LGPD).
-- ==============================================================================

-- 1. INFRAESTRUTURA DE SEGURANÇA (SECURITY DEFINER)
-- Funções auxiliares para evitar recursão circular e garantir performance
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. CORREÇÃO DA FUNÇÃO DE ANONIMIZAÇÃO (LGPD)
-- Agora verifica se o solicitante é admin ou o próprio usuário
CREATE OR REPLACE FUNCTION public.anonymize_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT (auth.uid() = target_user_id OR public.check_is_admin()) THEN
        RAISE EXCEPTION 'Não autorizado. Apenas o próprio usuário ou administradores podem anonimizar dados.';
    END IF;

    UPDATE public.profiles
    SET 
        full_name = 'Usuário Anonimizado',
        email = 'anon_' || substr(id::text, 1, 8) || '@cinehub.anon',
        is_anonymized = true,
        anonymized_at = now()
    WHERE id = target_user_id;

    UPDATE public.companies
    SET 
        document = 'REMOVIDO_LGPD',
        address_street = 'ENDERECO_ANONIMIZADO'
    WHERE owner_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. LIMPEZA DE POLÍTICAS VULNERÁVEIS (V10)
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'companies', 'equipments', 'branches'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4. POLÍTICAS BLINDADAS (V11)

-- 4.1 PROFILES (Proteção LGPD)
-- Usuários podem ver: Próprio perfil, perfis de membros da mesma empresa, ou se for Admin.
CREATE POLICY "Profiles_Select_V11" ON public.profiles FOR SELECT TO authenticated
    USING (
        id = auth.uid() 
        OR company_id = public.get_my_company_id()
        OR public.check_is_admin()
    );

CREATE POLICY "Profiles_Modify_V11" ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.check_is_admin())
    WITH CHECK (id = auth.uid() OR public.check_is_admin());

-- 4.2 COMPANIES (Marketplace Seguro)
-- Qualquer um pode ver (para o marketplace), mas só o dono/admin pode modificar/apagar.
CREATE POLICY "Companies_Select_V11" ON public.companies FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Companies_Modify_V11" ON public.companies FOR ALL TO authenticated
    USING (owner_id = auth.uid() OR public.check_is_admin())
    WITH CHECK (owner_id = auth.uid() OR public.check_is_admin());

-- 4.3 EQUIPMENTS (Inventário e Marketplace)
-- Qualquer um pode ver itens disponíveis, mas só membros da empresa ou admin gerenciam.
CREATE POLICY "Equipments_Select_V11" ON public.equipments FOR SELECT TO authenticated
    USING (
        status != 'unavailable' 
        OR company_id = public.get_my_company_id() 
        OR public.check_is_admin()
        OR EXISTS (
            SELECT 1 FROM public.branches 
            WHERE company_id = equipments.company_id 
            AND manager_email = (auth.jwt() ->> 'email')
        )
    );

CREATE POLICY "Equipments_Modify_V11" ON public.equipments FOR ALL TO authenticated
    USING (company_id = public.get_my_company_id() OR public.check_is_admin())
    WITH CHECK (company_id = public.get_my_company_id() OR public.check_is_admin());

-- 4.4 BRANCHES (Isolamento de Filiais)
-- Liberado para membros da empresa, o próprio gerente (via email) ou Admin.
CREATE POLICY "Branches_Select_V11" ON public.branches FOR SELECT TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        OR manager_email = (auth.jwt() ->> 'email')
        OR public.check_is_admin()
    );

CREATE POLICY "Branches_Modify_V11" ON public.branches FOR ALL TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        OR public.check_is_admin()
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        OR public.check_is_admin()
    );

-- 5. NOTIFICAÇÃO E LOG
NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'CINEHUB SECURITY SHIELD (V11): Sistema blindado contra deleção não autorizada e vazamento de dados.'; END $$;
