-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V30_FIX_PROJECTS_RLS
-- DESCRIPTION: Adiciona políticas RLS à tabela `projects`.
--
-- PROBLEMA: A tabela `projects` existe no banco mas não tem políticas RLS
-- configuradas, causando erro 403 (Forbidden) ao criar novos projetos pelo
-- locatário (POST /rest/v1/projects).
--
-- SOLUÇÃO: Habilitar RLS e criar políticas para INSERT, SELECT e UPDATE.
-- ==============================================================================

BEGIN;

-- ─── 1. Garantir que RLS está habilitado ────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ─── 2. Limpar políticas antigas (evita duplicatas) ──────────────────────────
DROP POLICY IF EXISTS "projects_insert_own"        ON public.projects;
DROP POLICY IF EXISTS "projects_select_own"        ON public.projects;
DROP POLICY IF EXISTS "projects_select_admin"      ON public.projects;
DROP POLICY IF EXISTS "projects_update_own"        ON public.projects;
DROP POLICY IF EXISTS "Projects_Insert_Own"        ON public.projects;
DROP POLICY IF EXISTS "Projects_Select_Own"        ON public.projects;
DROP POLICY IF EXISTS "Projects_Select_Admin"      ON public.projects;
DROP POLICY IF EXISTS "Projects_Update_Own"        ON public.projects;

-- ─── 3. INSERT — locatário autenticado pode criar projeto próprio ────────────
CREATE POLICY "projects_insert_own"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (renter_id = auth.uid());

-- ─── 4. SELECT — locatário vê apenas seus próprios projetos ─────────────────
CREATE POLICY "projects_select_own"
ON public.projects
FOR SELECT
TO authenticated
USING (renter_id = auth.uid());

-- ─── 5. SELECT — admin vê todos os projetos ──────────────────────────────────
CREATE POLICY "projects_select_admin"
ON public.projects
FOR SELECT
TO authenticated
USING (public.check_is_admin());

-- ─── 6. UPDATE — locatário pode atualizar seus próprios projetos ─────────────
CREATE POLICY "projects_update_own"
ON public.projects
FOR UPDATE
TO authenticated
USING  (renter_id = auth.uid())
WITH CHECK (renter_id = auth.uid());

-- ─── 7. UPDATE — admin pode atualizar qualquer projeto ───────────────────────
DROP POLICY IF EXISTS "projects_update_admin" ON public.projects;

CREATE POLICY "projects_update_admin"
ON public.projects
FOR UPDATE
TO authenticated
USING (public.check_is_admin());

-- ─── 8. Garantir permissões de role ──────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

COMMIT;
