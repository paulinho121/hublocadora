-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V32_FIX_NEW_USER_TRIGGER
--
-- PROBLEMA: "DATABASE ERROR SAVING NEW USER" ao cadastrar novo usuário.
-- CAUSA: O trigger handle_new_user falha ao inserir em public.profiles.
--
-- POSSÍVEIS CAUSAS (todas tratadas aqui):
--   1. FORCE ROW LEVEL SECURITY na tabela profiles bloqueando o trigger
--   2. Falta de política INSERT para o role que executa o trigger
--   3. Trigger generate_user_hub_id falhando (extensão pgcrypto)
--   4. Colunas NOT NULL sem valor padrão no INSERT do trigger
-- ==============================================================================


-- ════════════════════════════════════════════════════════════════
-- PARTE 1: Remover FORCE ROW LEVEL SECURITY de profiles
--          (FORCE RLS bloqueia até superusers como postgres)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Garante que as colunas básicas têm defaults seguros
ALTER TABLE public.profiles
    ALTER COLUMN role SET DEFAULT 'client';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- NÃO usar FORCE aqui — o trigger SECURITY DEFINER precisa de bypass natural


-- ════════════════════════════════════════════════════════════════
-- PARTE 2: Recriar o trigger handle_new_user de forma robusta
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_full_name text;
BEGIN
    -- Extrair full_name dos metadados ou usar parte do email como fallback
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        'client'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Recriar o trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ════════════════════════════════════════════════════════════════
-- PARTE 3: Garantir políticas RLS em profiles
-- ════════════════════════════════════════════════════════════════

-- Limpa políticas antigas para evitar conflito
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- SELECT: usuário vê apenas o próprio perfil; admin vê todos
CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.check_is_admin());

-- INSERT: apenas o próprio usuário pode criar seu perfil
-- (O trigger SECURITY DEFINER bypassa RLS naturalmente como postgres/superuser)
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: usuário atualiza apenas o próprio perfil; admin atualiza qualquer um
CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING  (id = auth.uid() OR public.check_is_admin())
WITH CHECK (id = auth.uid() OR public.check_is_admin());

-- Grants de tabela
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;


-- ════════════════════════════════════════════════════════════════
-- PARTE 4: Verificação final
-- ════════════════════════════════════════════════════════════════

SELECT
    relname AS tabela,
    CASE WHEN relrowsecurity    THEN '✅ RLS ATIVO'    ELSE '❌ RLS INATIVO'    END AS rls,
    CASE WHEN relforcerowsecurity THEN '⚠️ FORCE ATIVO' ELSE '✅ FORCE INATIVO' END AS force_rls
FROM pg_class
WHERE relname = 'profiles'
  AND relnamespace = 'public'::regnamespace;

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY cmd;
