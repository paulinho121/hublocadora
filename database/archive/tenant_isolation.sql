-- ======================================================
-- SISTEMA DE ISOLAMENTO POR TENANT (COMPANHIA)
-- ======================================================

-- 1. ADICIONAR company_id NA TABELA DE PERFIS
-- Isso permite identificar rapidamente a qual tenant o usuário pertence
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'company_id') THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
    END IF;
END $$;

-- 2. SINCRONIZAR DADOS EXISTENTES
-- Se o usuário é dono de uma empresa, ele pertence a ela
UPDATE public.profiles p
SET company_id = c.id
FROM public.companies c
WHERE c.owner_id = p.id
AND p.company_id IS NULL;

-- 3. REINICIAR POLÍTICAS DE RLS (NUCLEAR SECURITY PATTERN)
-- Dropamos as permissivas e aplicamos as restritas por Tenant

-- 3.1 EQUIPAMENTOS
DROP POLICY IF EXISTS "Equipments are viewable by everyone" ON public.equipments;
DROP POLICY IF EXISTS "Companies can insert own equipments" ON public.equipments;
DROP POLICY IF EXISTS "Companies can update own equipments" ON public.equipments;

-- Marketplace: Todos podem ver, mas só o que estiver 'available' ou 'rented'
CREATE POLICY "Marketplace Visibility" ON public.equipments
    FOR SELECT 
    USING (status != 'unavailable' OR auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = public.equipments.company_id));

-- Gerenciamento de Inventário: Apenas membros do mesmo tenant (empresa)
CREATE POLICY "Tenant Inventory Management" ON public.equipments
    FOR ALL
    TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- 3.2 RESERVAS
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

CREATE POLICY "Tenant Booking Isolation" ON public.bookings
    FOR ALL
    TO authenticated
    USING (
        -- É o cliente que reservou
        renter_id = auth.uid()
        -- OU pertence à empresa dona do equipamento
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        -- OU é Administrador do Sistema
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- 3.3 EMPRESAS
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;

CREATE POLICY "Public Company Profiles" ON public.companies
    FOR SELECT
    USING (true);

CREATE POLICY "Own Company Management" ON public.companies
    FOR UPDATE
    USING (
        owner_id = auth.uid()
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- 4. FUNÇÃO PARA AUTO-ASSIGN TENANT NA CRIAÇÃO DE EMPRESA
CREATE OR REPLACE FUNCTION public.handle_company_tenant_sync()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET company_id = NEW.id
    WHERE id = NEW.owner_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_company_tenant_sync();

-- 5. ATUALIZAR VIEW DE ADMIN (Se existir, para ignorar RLS ou usar bypass)
-- Role 'admin' já foi incluída nas políticas acima.
