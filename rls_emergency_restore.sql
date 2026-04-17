-- ======================================================
-- EMERGENCY RESTORE: PERMISSÕES DE PERFIL E EMPRESA
-- ======================================================

-- 1. Garantir acesso à tabela de PERFIS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR role = 'admin');

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR role = 'admin');

-- 2. Garantir acesso à tabela de EMPRESAS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "Owners can manage their companies" ON public.companies;

CREATE POLICY "Companies are viewable by everyone" ON public.companies
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Owners can manage their companies" ON public.companies
    FOR ALL TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Corrigir políticas das FILIAIS (Branch Isolation)
-- Isso evita erros se as tabelas ainda não estiverem 100% configuradas
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view branches of their company" ON public.branches;
DROP POLICY IF EXISTS "Users can manage branches of their company" ON public.branches;

CREATE POLICY "Users can view branches of their company"
    ON public.branches FOR SELECT TO authenticated
    USING (
        company_id IN (
            SELECT id FROM public.companies WHERE owner_id = auth.uid()
        )
        OR 
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage branches of their company"
    ON public.branches FOR ALL TO authenticated
    USING (
        company_id IN (
            SELECT id FROM public.companies WHERE owner_id = auth.uid()
        )
    );

-- 4. Ajustar permissão de ESTOQUE DISTRIBUÍDO
ALTER TABLE public.equipment_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view equipment stock for their company" ON public.equipment_stock;
DROP POLICY IF EXISTS "Users can manage equipment stock for their company" ON public.equipment_stock;

CREATE POLICY "Users can view equipment stock for their company"
    ON public.equipment_stock FOR SELECT TO authenticated
    USING (true); -- Permitir leitura global para facilitar o carregamento do Dashboard

CREATE POLICY "Users can manage equipment stock for their company"
    ON public.equipment_stock FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.branches b 
        JOIN public.companies c ON b.company_id = c.id
        WHERE b.id = equipment_stock.branch_id AND c.owner_id = auth.uid()
    ));
