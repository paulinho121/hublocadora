-- ======================================================
-- HUB LOCADORA: CONSOLIDATED SECURITY AUDIT & FIX
-- ======================================================

-- 1. FUNÇÃO DE APOIO: IS_ADMIN (Prevenção de Recursão)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNÇÃO DE APOIO: GET_USER_COMPANY (Otimização de Query)
CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. GARANTIR RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- ======================================================
-- 4. POLÍTICAS DE PERFIS (PROFILES)
-- ======================================================
DROP POLICY IF EXISTS "Profiles SELECT" ON public.profiles;
DROP POLICY IF EXISTS "Profiles UPDATE" ON public.profiles;
DROP POLICY IF EXISTS "Profiles INSERT" ON public.profiles;

CREATE POLICY "Profiles SELECT" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles UPDATE" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ======================================================
-- 5. POLÍTICAS DE EMPRESAS (COMPANIES)
-- ======================================================
DROP POLICY IF EXISTS "Companies INSERT" ON public.companies;
DROP POLICY IF EXISTS "Companies SELECT" ON public.companies;
DROP POLICY IF EXISTS "Companies UPDATE" ON public.companies;

CREATE POLICY "Companies INSERT" ON public.companies
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Companies SELECT" ON public.companies
    FOR SELECT USING (true); -- Público para Marketplace

CREATE POLICY "Companies UPDATE" ON public.companies
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id OR public.is_admin());

-- ======================================================
-- 6. POLÍTICAS DE EQUIPAMENTOS (EQUIPMENTS)
-- ======================================================
DROP POLICY IF EXISTS "Equipments SELECT" ON public.equipments;
DROP POLICY IF EXISTS "Equipments ALL" ON public.equipments;
DROP POLICY IF EXISTS "Marketplace Visibility" ON public.equipments;
DROP POLICY IF EXISTS "Tenant Inventory Management" ON public.equipments;

-- Marketplace: Todos podem ver o que está disponível
CREATE POLICY "Marketplace SELECT" ON public.equipments
    FOR SELECT USING (status != 'unavailable' OR company_id = public.get_user_company() OR public.is_admin());

-- Gestão: Apenas membros da empresa ou Admin
CREATE POLICY "Tenant Management" ON public.equipments
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company() OR public.is_admin())
    WITH CHECK (company_id = public.get_user_company() OR public.is_admin());

-- ======================================================
-- 7. POLÍTICAS DE RESERVAS (BOOKINGS)
-- ======================================================
DROP POLICY IF EXISTS "Tenant Booking Isolation" ON public.bookings;

CREATE POLICY "Booking Isolation" ON public.bookings
    FOR ALL TO authenticated
    USING (
        renter_id = auth.uid() 
        OR company_id = public.get_user_company() 
        OR public.is_admin()
    );

-- ======================================================
-- 8. POLÍTICAS DE ENTREGAS (DELIVERIES)
-- ======================================================
DROP POLICY IF EXISTS "Users can view deliveries of their bookings" ON public.deliveries;
DROP POLICY IF EXISTS "Companies can update their deliveries" ON public.deliveries;

CREATE POLICY "Delivery Access" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id 
            AND (b.renter_id = auth.uid() OR b.company_id = public.get_user_company() OR public.is_admin())
        )
    );

-- ======================================================
-- 9. NOTA DE SEGURANÇA: COLUNAS SENSÍVEIS
-- ======================================================
-- Recomendação: O campo 'document' (CPF/CNPJ) na tabela public.companies 
-- deve ser protegido. Se não for necessário no marketplace, considere 
-- criar uma VIEW para o marketplace que exclua este campo.
