-- ==============================================================================
-- DIAGNÓSTICO: Estado atual das tabelas projects e project_shipments
-- Execute isso no SQL Editor do Supabase e me mostre o resultado
-- ==============================================================================

-- 1. RLS habilitado em cada tabela?
SELECT
    relname AS tabela,
    CASE WHEN relrowsecurity THEN '✅ RLS ATIVO' ELSE '❌ RLS DESATIVADO' END AS rls_status
FROM pg_class
WHERE relname IN ('projects', 'project_shipments', 'bookings')
ORDER BY relname;

-- 2. Políticas existentes nessas tabelas
SELECT
    tablename AS tabela,
    policyname AS politica,
    cmd AS operacao,
    roles,
    qual AS using_clause,
    with_check AS with_check_clause
FROM pg_policies
WHERE tablename IN ('projects', 'project_shipments', 'bookings')
ORDER BY tablename, cmd;

-- 3. Permissões de role nessas tabelas
SELECT
    table_name AS tabela,
    grantee AS role,
    privilege_type AS permissao
FROM information_schema.role_table_grants
WHERE table_name IN ('projects', 'project_shipments')
  AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;

-- 4. Colunas da tabela projects (confirmar que renter_id existe)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Seu auth.uid() atual (deve retornar seu UUID de usuário)
SELECT auth.uid() AS meu_uid;
