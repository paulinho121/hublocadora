-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V31_FIX_PROJECTS_AND_SHIPMENTS_RLS
--
-- PROBLEMA: 403 Forbidden persiste na criação de projetos mesmo após V30.
-- CAUSA PROVÁVEL: V30 falhou em transação silenciosa OU project_shipments
--                 também está bloqueando com RLS sem policies.
--
-- ESTRATÉGIA: Sem BEGIN/COMMIT global — cada bloco roda independentemente.
--             Força remoção de TODAS as policies existentes (sem depender
--             de nomes específicos) e recria do zero.
-- ==============================================================================


-- ════════════════════════════════════════════════════════════════
-- PARTE 1: TABELA projects
-- ════════════════════════════════════════════════════════════════

-- 1a. Força a remoção de TODAS as policies existentes em projects
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'projects' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- 1b. Garante que RLS está ativo
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

-- 1c. INSERT — locatário autenticado cria apenas projetos seus
CREATE POLICY "proj_insert_renter"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (renter_id = auth.uid());

-- 1d. SELECT — locatário vê seus projetos; admin vê todos
CREATE POLICY "proj_select_renter"
ON public.projects
FOR SELECT
TO authenticated
USING (renter_id = auth.uid() OR public.check_is_admin());

-- 1e. UPDATE — locatário atualiza seus próprios projetos; admin atualiza todos
CREATE POLICY "proj_update_renter"
ON public.projects
FOR UPDATE
TO authenticated
USING  (renter_id = auth.uid() OR public.check_is_admin())
WITH CHECK (renter_id = auth.uid() OR public.check_is_admin());

-- 1f. DELETE — apenas admin pode deletar projetos
CREATE POLICY "proj_delete_admin"
ON public.projects
FOR DELETE
TO authenticated
USING (public.check_is_admin());

-- 1g. Garante grants de tabela ao role authenticated
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;


-- ════════════════════════════════════════════════════════════════
-- PARTE 2: TABELA project_shipments
-- ════════════════════════════════════════════════════════════════

-- 2a. Força a remoção de TODAS as policies existentes em project_shipments
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'project_shipments' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_shipments', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- 2b. Garante que RLS está ativo
ALTER TABLE public.project_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_shipments FORCE ROW LEVEL SECURITY;

-- 2c. SELECT — locatário vê shipments de seus projetos; locadora vê shipments de seus bookings; admin vê tudo
CREATE POLICY "shipment_select"
ON public.project_shipments
FOR SELECT
TO authenticated
USING (
    public.check_is_admin()
    OR company_id = public.get_my_company_id()
    OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_shipments.project_id
          AND p.renter_id = auth.uid()
    )
);

-- 2d. INSERT — locatário cria shipments para seus projetos; locadora cria para seus bookings
CREATE POLICY "shipment_insert"
ON public.project_shipments
FOR INSERT
TO authenticated
WITH CHECK (
    public.check_is_admin()
    OR company_id = public.get_my_company_id()
    OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_shipments.project_id
          AND p.renter_id = auth.uid()
    )
);

-- 2e. UPDATE — locadora atualiza (adiciona tracking); locatário confirma recebimento
CREATE POLICY "shipment_update"
ON public.project_shipments
FOR UPDATE
TO authenticated
USING (
    public.check_is_admin()
    OR company_id = public.get_my_company_id()
    OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_shipments.project_id
          AND p.renter_id = auth.uid()
    )
);

-- 2f. Garante grants
GRANT SELECT, INSERT, UPDATE ON public.project_shipments TO authenticated;
GRANT ALL ON public.project_shipments TO service_role;


-- ════════════════════════════════════════════════════════════════
-- PARTE 3: VERIFICAÇÃO FINAL
-- ════════════════════════════════════════════════════════════════

-- Confirma que as policies foram criadas
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('projects', 'project_shipments')
ORDER BY tablename, cmd;
