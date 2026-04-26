-- ================================================================
-- FEATURE: ROTEAMENTO DE PEDIDOS PARA SUB-LOCADORAS
-- Execute no Supabase SQL Editor
-- ================================================================

-- PASSO 1: Adicionar fulfilling_company_id na tabela deliveries
ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS fulfilling_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- PASSO 2: Índice para performance
CREATE INDEX IF NOT EXISTS idx_deliveries_fulfilling_company
ON public.deliveries(fulfilling_company_id)
WHERE fulfilling_company_id IS NOT NULL;

-- PASSO 3: Policy para sub-locadora ver entregas atribuídas a ela
DROP POLICY IF EXISTS "Companies can view their own deliveries" ON public.deliveries;
CREATE POLICY "Companies can view their own deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
    -- Entrega onde a empresa é a locadora dona do equipamento
    booking_id IN (
        SELECT b.id FROM bookings b
        WHERE b.company_id IN (
            SELECT COALESCE(p.company_id, c.id)
            FROM profiles p
            LEFT JOIN companies c ON c.owner_id = p.id
            WHERE p.id = auth.uid()
        )
    )
    OR
    -- Entrega onde a empresa é a sub-locadora responsável pela entrega
    fulfilling_company_id IN (
        SELECT COALESCE(p.company_id, c.id)
        FROM profiles p
        LEFT JOIN companies c ON c.owner_id = p.id
        WHERE p.id = auth.uid()
    )
    OR
    -- O próprio cliente que fez o pedido pode ver sua entrega
    booking_id IN (
        SELECT b.id FROM bookings b WHERE b.renter_id = auth.uid()
    )
);

-- PASSO 4: Policy para sub-locadora atualizar status de entregas atribuídas
DROP POLICY IF EXISTS "Fulfilling company can update deliveries" ON public.deliveries;
CREATE POLICY "Fulfilling company can update deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
    fulfilling_company_id IN (
        SELECT COALESCE(p.company_id, c.id)
        FROM profiles p
        LEFT JOIN companies c ON c.owner_id = p.id
        WHERE p.id = auth.uid()
    )
    OR
    booking_id IN (
        SELECT b.id FROM bookings b
        WHERE b.company_id IN (
            SELECT COALESCE(p.company_id, c.id)
            FROM profiles p
            LEFT JOIN companies c ON c.owner_id = p.id
            WHERE p.id = auth.uid()
        )
    )
);

-- PASSO 5: Confirmar estrutura
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deliveries'
AND column_name = 'fulfilling_company_id';
