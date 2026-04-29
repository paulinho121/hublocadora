-- ======================================================
-- LISTAGEM DE FILIAIS E EMPRESAS PARCEIRAS (SUB-LOCADORAS)
-- Use este script para identificar IDs duplicados ou confusões de nomes
-- ======================================================

-- 1. Lista todas as FILIAIS (Branches) vinculadas à Master
SELECT 
    'FILIAL INTERNA' as tipo,
    b.id as registro_id,
    b.name as nome_exibido,
    c.name as empresa_mae,
    b.city,
    b.status
FROM public.branches b
JOIN public.companies c ON b.company_id = c.id
ORDER BY b.name;

-- 2. Lista todas as EMPRESAS (Sub-locadoras externas)
SELECT 
    'SUB-LOCADORA EXTERNA' as tipo,
    id as registro_id,
    name as nome_exibido,
    status,
    address_city as city
FROM public.companies
WHERE id NOT IN (SELECT id FROM public.companies WHERE name ILIKE '%CINE%') -- Filtra pra não mostrar a Master na lista de parceiros
ORDER BY name;
