-- ================================================================
-- FEATURE: ATRIBUIÇÃO DE EQUIPAMENTOS PARA SUB-LOCADORAS EXTERNAS
-- Execute no Supabase SQL Editor
-- ================================================================

-- PASSO 1: Adicionar coluna subrental_company_id na tabela equipments
ALTER TABLE public.equipments
ADD COLUMN IF NOT EXISTS subrental_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- PASSO 2: Índice para performance
CREATE INDEX IF NOT EXISTS idx_equipments_subrental_company 
ON public.equipments(subrental_company_id) 
WHERE subrental_company_id IS NOT NULL;

-- PASSO 3: Policy para sub-locadora VER itens atribuídos a ela
DROP POLICY IF EXISTS "Subrentals can view assigned equipments" ON public.equipments;
CREATE POLICY "Subrentals can view assigned equipments"
ON public.equipments
FOR SELECT
TO authenticated
USING (
    subrental_company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
);

-- PASSO 4: Policy para sub-locadora ATUALIZAR apenas o status dos itens cedidos
DROP POLICY IF EXISTS "Subrentals can update status of assigned equipments" ON public.equipments;
CREATE POLICY "Subrentals can update status of assigned equipments"
ON public.equipments
FOR UPDATE
TO authenticated
USING (
    subrental_company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    subrental_company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
);

-- PASSO 5: RPC para o dono atribuir item para sub-locadora
CREATE OR REPLACE FUNCTION public.assign_equipment_to_subrental(
    p_equipment_id UUID,
    p_subrental_company_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_equipment_owner_company UUID;
    v_caller_company UUID;
BEGIN
    -- Buscar a empresa do caller
    SELECT COALESCE(
        (SELECT company_id FROM profiles WHERE id = auth.uid()),
        (SELECT id FROM companies WHERE owner_id = auth.uid())
    ) INTO v_caller_company;

    -- Buscar a empresa dona do equipamento
    SELECT company_id INTO v_equipment_owner_company
    FROM equipments WHERE id = p_equipment_id;

    -- Verificar que o caller é o dono do equipamento
    IF v_equipment_owner_company IS DISTINCT FROM v_caller_company THEN
        RETURN 'ERRO: Você não é o dono deste equipamento.';
    END IF;

    -- Atribuir
    UPDATE public.equipments
    SET subrental_company_id = p_subrental_company_id
    WHERE id = p_equipment_id;

    RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERRO SQL: ' || SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_equipment_to_subrental(UUID, UUID) TO authenticated;

-- PASSO 6: Confirmar estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'equipments' 
  AND column_name = 'subrental_company_id';
