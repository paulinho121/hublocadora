-- ======================================================
-- AUTORIZAÇÃO DE GESTÃO PARA SUB-LOCADORAS (CUSTÓDIA) V2
-- Permite que parceiros (Donos ou Gerentes) modifiquem status/visibilidade
-- Proteção contra recursividade (Erro 500) e vazamento de dados
-- ======================================================

-- 1. Garantir que a função de identificação de empresa é robusta e SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar as políticas de Equipamentos para permitir acesso à Sub-locadora via company_id do perfil
DROP POLICY IF EXISTS "Equipment_Management_Custody_V2" ON public.equipments;
DROP POLICY IF EXISTS "Equipment_Management_Custody_V3" ON public.equipments;

CREATE POLICY "Equipment_Management_Custody_V3" ON public.equipments
    FOR ALL TO authenticated
    USING (
        company_id = public.get_user_company() -- Sou o dono do item
        OR subrental_company_id = public.get_user_company() -- Sou a sub-locadora com custódia
        OR public.is_admin() -- Sou administrador do sistema
    )
    WITH CHECK (
        company_id = public.get_user_company()
        OR subrental_company_id = public.get_user_company()
        OR public.is_admin()
    );

-- 3. Garantir que a Sub-locadora veja o item mesmo se estiver 'unavailable'
DROP POLICY IF EXISTS "Equipment_View_Custody_V2" ON public.equipments;
DROP POLICY IF EXISTS "Equipment_View_Custody_V3" ON public.equipments;

CREATE POLICY "Equipment_View_Custody_V3" ON public.equipments
    FOR SELECT TO authenticated
    USING (
        status != 'unavailable' 
        OR company_id = public.get_user_company()
        OR subrental_company_id = public.get_user_company()
        OR public.is_admin()
    );

-- 4. Ajustar RLS para Logs de Auditoria
DROP POLICY IF EXISTS "Owners and Subrentals can view logs" ON public.inventory_status_logs;
CREATE POLICY "Custody_Logs_Access_V1" ON public.inventory_status_logs
FOR SELECT USING (
    company_id = public.get_user_company() -- Sou o dono
    OR EXISTS (
        SELECT 1 FROM public.equipments e 
        WHERE e.id = equipment_id AND e.subrental_company_id = public.get_user_company()
    )
);
