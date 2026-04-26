-- ================================================================
-- FEATURE: ACEITAÇÃO DE PEDIDO PELA SUB-LOCADORA
-- Execute TUDO no Supabase SQL Editor
-- ================================================================

-- PASSO 1: Estrutura base (se ainda não rodou o anterior)
ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS fulfilling_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- PASSO 2: Campo de status de aceitação da sub-locadora
ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS subrental_status TEXT DEFAULT NULL
    CHECK (subrental_status IN ('pending', 'accepted', 'rejected') OR subrental_status IS NULL);

-- PASSO 3: Policies de visibilidade
DROP POLICY IF EXISTS "Companies can view their own deliveries" ON public.deliveries;
CREATE POLICY "Companies can view their own deliveries"
ON public.deliveries FOR SELECT TO authenticated
USING (
    booking_id IN (
        SELECT b.id FROM bookings b
        WHERE b.company_id IN (
            SELECT COALESCE(p.company_id, c.id) FROM profiles p
            LEFT JOIN companies c ON c.owner_id = p.id WHERE p.id = auth.uid()
        )
    )
    OR fulfilling_company_id IN (
        SELECT COALESCE(p.company_id, c.id) FROM profiles p
        LEFT JOIN companies c ON c.owner_id = p.id WHERE p.id = auth.uid()
    )
    OR booking_id IN (
        SELECT b.id FROM bookings b WHERE b.renter_id = auth.uid()
    )
);

-- PASSO 4: Policy para sub-locadora atualizar status de aceitação
DROP POLICY IF EXISTS "Fulfilling company can update deliveries" ON public.deliveries;
CREATE POLICY "Fulfilling company can update deliveries"
ON public.deliveries FOR UPDATE TO authenticated
USING (
    fulfilling_company_id IN (
        SELECT COALESCE(p.company_id, c.id) FROM profiles p
        LEFT JOIN companies c ON c.owner_id = p.id WHERE p.id = auth.uid()
    )
    OR
    booking_id IN (
        SELECT b.id FROM bookings b
        WHERE b.company_id IN (
            SELECT COALESCE(p.company_id, c.id) FROM profiles p
            LEFT JOIN companies c ON c.owner_id = p.id WHERE p.id = auth.uid()
        )
    )
);

-- PASSO 5: Confirmar colunas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deliveries'
  AND column_name IN ('fulfilling_company_id', 'subrental_status')
ORDER BY column_name;
