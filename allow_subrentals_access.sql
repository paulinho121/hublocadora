-- ======================================================
-- LIBERANDO ACESSO PARA SUB-LOCADORAS (STAFF/MANAGERS)
-- ======================================================

-- 1. Atualizar política de Equipamentos para permitir que membros da empresa gerenciem
DROP POLICY IF EXISTS "Companies can update own equipments" ON public.equipments;
CREATE POLICY "Company Members can update equipments" ON public.equipments
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() IN (SELECT owner_id FROM public.companies WHERE id = company_id) -- É o dono
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) -- É um membro/manager
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') -- É admin master
    );

-- 2. Atualizar política de Logs para permitir que membros da empresa visualizem
DROP POLICY IF EXISTS "Donos de empresas podem ver seus logs" ON public.inventory_status_logs;
CREATE POLICY "Company Members can view inventory logs" ON public.inventory_status_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (SELECT owner_id FROM public.companies WHERE id = company_id)
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
