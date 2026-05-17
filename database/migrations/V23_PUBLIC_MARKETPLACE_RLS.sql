-- Migration: V23_PUBLIC_MARKETPLACE_RLS
-- Descrição: Permite que usuários não logados (anon) visualizem equipamentos disponíveis e empresas ativas no marketplace.

-- 1. Atualizar política de SELECT para public.equipments
DROP POLICY IF EXISTS "Equipments_Select" ON public.equipments;
DROP POLICY IF EXISTS "Equipments_Select_V11" ON public.equipments;

CREATE POLICY "Equipments_Select_V12" ON public.equipments
    FOR SELECT TO public
    USING (
        status != 'unavailable' -- Qualquer um (logado ou não) pode ver equipamentos disponíveis
        OR (auth.uid() IS NOT NULL AND (
            company_id = public.get_my_company_id()
            OR EXISTS (
                SELECT 1 FROM public.companies 
                WHERE id = equipments.company_id AND parent_company_id = public.get_my_company_id()
            )
            OR public.check_is_admin()
        ))
    );

-- 2. Atualizar política de SELECT para public.companies
DROP POLICY IF EXISTS "Companies_Select" ON public.companies;
DROP POLICY IF EXISTS "Companies_Select_V11" ON public.companies;

CREATE POLICY "Companies_Select_V12" ON public.companies
    FOR SELECT TO public
    USING (
        status = 'active' -- Qualquer um (logado ou não) pode ver empresas ativas
        OR (auth.uid() IS NOT NULL AND (
            owner_id = auth.uid() 
            OR id = public.get_my_company_id()
            OR parent_company_id = public.get_my_company_id()
            OR public.check_is_admin()
        ))
    );
