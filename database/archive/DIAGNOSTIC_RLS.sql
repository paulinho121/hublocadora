-- Script para diagnosticar permissões e dados do usuário atual
-- Execute isso no SQL Editor do Supabase

-- 1. Verificar se o usuário atual tem perfil e empresa vinculada
SELECT 
    p.id as profile_id,
    p.email,
    p.role,
    p.company_id as profile_company_id,
    c.id as company_id,
    c.name as company_name,
    c.owner_id as company_owner
FROM public.profiles p
LEFT JOIN public.companies c ON c.owner_id = p.id OR c.id = p.company_id
WHERE p.id = auth.uid();

-- 2. Verificar permissões das tabelas
SELECT 
    table_name, 
    has_table_privilege('authenticated', table_name, 'select') as can_select,
    has_table_privilege('authenticated', table_name, 'insert') as can_insert
FROM (
    VALUES ('profiles'), ('companies'), ('branches'), ('notifications')
) as t(table_name);

-- 3. Verificar se RLS está ativo e listar políticas
SELECT 
    tablename, 
    rowsecurity, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('branches', 'notifications');
