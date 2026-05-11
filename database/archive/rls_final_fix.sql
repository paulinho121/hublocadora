-- ======================================================
-- FIX FINAL (DEBUGGED): PERMISSÕES E SINCRONIZAÇÃO
-- ======================================================

-- 1. Garante que a coluna company_id existe no perfil
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'company_id') THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
    END IF;
END $$;

-- 2. Sincroniza perfis que são donos de empresas
UPDATE public.profiles p
SET company_id = c.id
FROM public.companies c
WHERE c.owner_id = p.id
AND p.company_id IS NULL;

-- 3. Reconstrói a política de Reservas (Mais abrangente)
DROP POLICY IF EXISTS "Booking Policy V3" ON public.bookings;
DROP POLICY IF EXISTS "Booking Isolation" ON public.bookings;
DROP POLICY IF EXISTS "Tenant Booking Isolation" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

CREATE POLICY "Booking Policy V4" ON public.bookings
    FOR ALL 
    TO authenticated
    USING (
        renter_id = auth.uid() 
        OR company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        renter_id = auth.uid() 
        OR company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Garante permissões na tabela de Deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Delivery Access V2" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Access" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view deliveries of their bookings" ON public.deliveries;
DROP POLICY IF EXISTS "Companies can update their deliveries" ON public.deliveries;

CREATE POLICY "Delivery Access V3" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id 
            AND (
                b.renter_id = auth.uid() 
                OR b.company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
                OR b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
                OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

-- 5. Habilitar Realtime com Verificação de Segurança (Previne erro 42710)
DO $$ 
BEGIN
  -- Adiciona 'bookings' se não estiver na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  -- Adiciona 'deliveries' se não estiver na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
  END IF;
END $$;
