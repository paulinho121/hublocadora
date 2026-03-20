-- ======================================================
-- FIX v2: RESOLVENDO RECURSÃO INFINITA (RLS)
-- ======================================================

-- 1. FUNÇÃO AUXILIAR PARA VERIFICAR ADMIN SEM RECURSÃO
-- SECURITY DEFINER ignora o RLS, permitindo que a busca aconteça sem loop.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. LIMPEZA E RECONFIGURAÇÃO DOS PERFIS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Regra de Leitura: Usuário vê o dele OU Admin vê tudo
CREATE POLICY "Profiles SELECT" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- Regra de Escrita: Apenas o dono
CREATE POLICY "Profiles UPDATE" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Regra de Inserção: Apenas o dono
CREATE POLICY "Profiles INSERT" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- 3. RECONFIGURAÇÃO DAS EMPRESAS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own company" ON public.companies;
DROP POLICY IF EXISTS "Public Company Profiles" ON public.companies;
DROP POLICY IF EXISTS "Own Company Management" ON public.companies;

CREATE POLICY "Companies INSERT" ON public.companies
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Companies SELECT" ON public.companies
    FOR SELECT TO authenticated
    USING (true); -- Público para outros usuários logados verem as locadoras

CREATE POLICY "Companies UPDATE" ON public.companies
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id OR public.is_admin());

-- 4. COLUNA STATUS (Caso ainda não tenha rodado)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE public.companies ADD COLUMN status text CHECK (status IN ('pending', 'active', 'suspended')) DEFAULT 'pending';
    END IF;
END $$;
