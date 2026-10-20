-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V37_FIX_EQUIPMENTS_RLS
--
-- PROBLEMAS (políticas encontradas no banco em produção, fora dos arquivos):
--   1. "Companies can insert own equipments" — INSERT para {public} com CHECK true.
--      Como políticas permissivas se somam (OR), QUALQUER pessoa, mesmo sem login,
--      podia cadastrar equipamentos em nome de qualquer locadora.
--   2. "Equipments_Select_V1" consulta public.branches diretamente. Visitantes sem
--      login não têm permissão nessa tabela, então TODA leitura anônima de
--      equipments falhava ("permission denied for table branches") — o marketplace
--      ficava vazio para quem não estava logado.
--   3. Políticas duplicadas (Equipments_Modify / _V1, Select_V1 / _V13).
--
-- SOLUÇÃO: uma política de leitura e uma de escrita, claras. A checagem de
-- gerente de filial passa para uma função SECURITY DEFINER (não exige acesso
-- do visitante à tabela branches).
-- ==============================================================================

-- ── 1. Função auxiliar: o usuário logado gerencia uma filial desta empresa? ──
CREATE OR REPLACE FUNCTION public.is_branch_manager_of(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.branches
        WHERE company_id = p_company_id
          AND manager_email = (auth.jwt() ->> 'email')
    );
$$;

REVOKE ALL ON FUNCTION public.is_branch_manager_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_branch_manager_of(uuid) TO anon, authenticated;


-- ── 2. Remove as políticas antigas/duplicadas ────────────────────────────────
DROP POLICY IF EXISTS "Companies can insert own equipments" ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Modify"                   ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Modify_V1"                ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Select_V1"                ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Select_V13"               ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Select"                   ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Modify_V2"                ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Select_V2"                ON public.equipments;


-- ── 3. Leitura: itens disponíveis são públicos; o resto só para o dono ───────
CREATE POLICY "Equipments_Select_V2" ON public.equipments
    FOR SELECT TO public
    USING (
        status <> 'unavailable'
        OR (auth.uid() IS NOT NULL AND (
            company_id = public.get_my_company_id()
            OR EXISTS (
                SELECT 1 FROM public.companies c
                WHERE c.id = equipments.company_id
                  AND c.parent_company_id = public.get_my_company_id()
            )
            OR public.is_branch_manager_of(company_id)
            OR public.check_is_admin()
        ))
    );


-- ── 4. Escrita (insert/update/delete): só a própria locadora ou admin ────────
CREATE POLICY "Equipments_Modify_V2" ON public.equipments
    FOR ALL TO authenticated
    USING      (company_id = public.get_my_company_id() OR public.check_is_admin())
    WITH CHECK (company_id = public.get_my_company_id() OR public.check_is_admin());


-- ── 5. Conferência ───────────────────────────────────────────────────────────
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'equipments' AND schemaname = 'public'
ORDER BY cmd, policyname;
