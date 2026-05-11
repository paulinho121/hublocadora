-- ======================================================
-- AUTORIZAÇÃO DE GESTÃO PARA SUB-LOCADORAS (CUSTÓDIA)
-- Permite que parceiros modifiquem status/visibilidade de itens recebidos
-- Proteção contra recursividade (Erro 500) e vazamento de dados
-- ======================================================

-- 1. Função de verificação de propriedade (Master)
-- SECURITY DEFINER ignora RLS interno para evitar recursão infinita
CREATE OR REPLACE FUNCTION public.check_equipment_ownership(e_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.equipments e
    JOIN public.companies c ON e.company_id = c.id
    WHERE e.id = e_id AND c.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função de verificação de custódia (Sub-locadora)
CREATE OR REPLACE FUNCTION public.check_equipment_custody(e_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.equipments e
    JOIN public.companies c ON e.subrental_company_id = c.id
    WHERE e.id = e_id AND c.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar políticas de GESTÃO (UPDATE/DELETE/INSERT)
-- Removemos políticas antigas que podiam causar lentidão ou erro 500
DROP POLICY IF EXISTS "Tenant Management" ON public.equipments;
DROP POLICY IF EXISTS "Companies can update own equipments" ON public.equipments;
DROP POLICY IF EXISTS "Equipment_Management_Custody_V1" ON public.equipments;

CREATE POLICY "Equipment_Management_Custody_V2" ON public.equipments
    FOR ALL TO authenticated
    USING (
        public.check_equipment_ownership(id)
        OR public.check_equipment_custody(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        public.check_equipment_ownership(id)
        OR public.check_equipment_custody(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Atualizar política de VISUALIZAÇÃO (SELECT)
-- Garante que sub-locadoras vejam itens ocultos que estão sob sua gestão
DROP POLICY IF EXISTS "Marketplace SELECT" ON public.equipments;
DROP POLICY IF EXISTS "Equipment_View_Custody_V1" ON public.equipments;

CREATE POLICY "Equipment_View_Custody_V2" ON public.equipments
    FOR SELECT TO authenticated
    USING (
        status != 'unavailable' 
        OR public.check_equipment_ownership(id)
        OR public.check_equipment_custody(id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. Aplicar as mesmas regras à tabela de estoque (equipment_stock)
DROP POLICY IF EXISTS "Equipment Stock Management" ON public.equipment_stock;
CREATE POLICY "Equipment_Stock_Custody_V2" ON public.equipment_stock
    FOR ALL TO authenticated
    USING (
        public.check_equipment_ownership(equipment_id)
        OR public.check_equipment_custody(equipment_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 6. Comentário de Auditoria
COMMENT ON POLICY "Equipment_Management_Custody_V2" ON public.equipments IS 'Autoriza Master e Sub-locadoras a gerenciarem itens sob sua custódia com proteção anti-looping.';
