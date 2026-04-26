-- ======================================================
-- FIX: VISIBILIDADE DE INVENTÁRIO PARA SUB-LOCADORAS
-- Execute este script no SQL Editor do Supabase
-- ======================================================

-- 1. Atualizar política de SELECT para equipamentos
-- Agora sub-locadoras podem ver itens onde são as fornecedoras, mesmo se o item estiver 'unavailable' no marketplace
DROP POLICY IF EXISTS "Marketplace SELECT" ON public.equipments;
CREATE POLICY "Marketplace SELECT" ON public.equipments
    FOR SELECT TO authenticated
    USING (
        status != 'unavailable' 
        OR company_id = public.get_user_company() 
        OR subrental_company_id = public.get_user_company() -- <--- ADICIONADO
        OR public.is_admin()
    );

-- 2. Atualizar política de GESTÃO para equipamentos
-- Permite que a sub-locadora veja e gerencie (ex: mudar status para manutenção) itens atribuídos a ela
DROP POLICY IF EXISTS "Tenant Management" ON public.equipments;
CREATE POLICY "Tenant Management" ON public.equipments
    FOR ALL TO authenticated
    USING (
        company_id = public.get_user_company() 
        OR subrental_company_id = public.get_user_company() -- <--- ADICIONADO
        OR public.is_admin()
    )
    WITH CHECK (
        company_id = public.get_user_company() 
        OR subrental_company_id = public.get_user_company() -- <--- ADICIONADO
        OR public.is_admin()
    );

-- 3. Garantir que as políticas de estoque também considerem a sub-locadora
-- (Caso usem a tabela equipment_stock vinculada)
DROP POLICY IF EXISTS "Equipment Stock Management" ON public.equipment_stock;
CREATE POLICY "Equipment Stock Management" ON public.equipment_stock
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.equipments e
            WHERE e.id = equipment_id
            AND (e.company_id = public.get_user_company() OR e.subrental_company_id = public.get_user_company())
        )
        OR public.is_admin()
    );
