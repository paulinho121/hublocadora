-- =============================================================================
-- AUDIT: Tenant & ID Verification Report
-- Run this in the Supabase SQL Editor to inspect all tenants, users and branches
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. VISÃO GERAL DOS TENANTS (Empresas/Locadoras)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    '── TENANT ──'                           AS tipo,
    c.name                                   AS nome,
    c.id                                     AS uuid_interno,
    c.status                                 AS status,
    c.document                               AS cnpj_cpf,
    CASE 
        WHEN c.parent_company_id IS NULL THEN '👑 MASTER (Raiz)'
        ELSE '🏢 Rede (Sub-tenant)'
    END                                      AS hierarquia
FROM public.companies c
ORDER BY c.parent_company_id NULLS FIRST, c.name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. USUÁRIOS POR TENANT (com hub_id e role)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    p.hub_id                                 AS hub_id_usuario,
    p.full_name                              AS nome,
    p.email                                  AS email,
    p.role                                   AS cargo,
    p.id                                     AS uuid_auth,
    c.name                                   AS tenant_empresa,
    c.id                                     AS tenant_uuid,
    CASE 
        WHEN p.company_id IS NULL THEN '⚠️  SEM EMPRESA (cliente avulso)'
        ELSE '✅ Vinculado'
    END                                      AS vinculo
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
ORDER BY c.name NULLS LAST, p.role, p.full_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FILIAIS POR TENANT (com hub_id e invite_token)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    b.hub_id                                 AS hub_id_filial,
    b.name                                   AS nome_filial,
    b.status                                 AS status,
    b.manager_email                          AS email_gerente,
    b.city                                   AS cidade,
    b.state                                  AS estado,
    b.invite_token                           AS token_convite,
    c.name                                   AS tenant_empresa,
    b.id                                     AS uuid_filial
FROM public.branches b
JOIN public.companies c ON c.id = b.company_id
ORDER BY c.name, b.name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DIAGNÓSTICO: IDs FALTANTES (hub_id = NULL)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'profiles' AS tabela, COUNT(*) AS registros_sem_hub_id
FROM public.profiles WHERE hub_id IS NULL
UNION ALL
SELECT 'branches' AS tabela, COUNT(*) AS registros_sem_hub_id
FROM public.branches WHERE hub_id IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. MAPA COMPLETO: Tenant → Filiais → Usuários (Visão hierárquica)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    c.name                                   AS tenant,
    c.status                                 AS status_tenant,
    COUNT(DISTINCT p.id)                     AS total_usuarios,
    COUNT(DISTINCT b.id)                     AS total_filiais,
    string_agg(DISTINCT p.hub_id, ', ')      AS hub_ids_usuarios,
    string_agg(DISTINCT b.hub_id, ', ')      AS hub_ids_filiais
FROM public.companies c
LEFT JOIN public.profiles p   ON p.company_id = c.id
LEFT JOIN public.branches b   ON b.company_id = c.id
GROUP BY c.id, c.name, c.status
ORDER BY c.name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ⚠️  USUÁRIOS SEM TENANT (Orphaned Users)
-- Usuários que existem em auth.users mas NÃO têm empresa vinculada.
-- Estes são invisíveis no mapa de tenants.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    u.id                                     AS uuid_auth,
    u.email                                  AS email,
    u.created_at                             AS criado_em,
    p.hub_id                                 AS hub_id,
    p.full_name                              AS nome,
    p.role                                   AS cargo,
    CASE
        WHEN p.id IS NULL     THEN '🔴 SEM PERFIL (execute V16)'
        WHEN p.company_id IS NULL THEN '🟡 PERFIL OK — mas SEM EMPRESA vinculada'
        ELSE '✅ Vinculado'
    END                                      AS diagnostico
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.company_id IS NULL OR p.id IS NULL
ORDER BY u.created_at DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ⚠️  EMPRESAS DUPLICADAS (mesmo nome, IDs diferentes)
-- Indica cadastros fantasmas que podem causar confusão no Admin.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
    c.name                                   AS nome_empresa,
    COUNT(*)                                 AS ocorrencias,
    string_agg(c.id::text, E'\n')            AS uuids,
    string_agg(c.status, ' / ')             AS statuses,
    string_agg(c.document, ' / ')           AS cnpjs
FROM public.companies c
GROUP BY c.name
HAVING COUNT(*) > 1
ORDER BY ocorrencias DESC;
