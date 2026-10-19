-- ==============================================================================
-- CINEHUB: RESET PARA VALIDAÇÃO
-- ==============================================================================
-- Deixa o banco zerado, preservando APENAS:
--   • o usuário master (auth + profile, com role = admin)
--   • a empresa vinculada a ele (se existir) — sem equipamentos
--   • tabelas de base listadas em v_keep (categorias e catálogo mestre)
--
-- Diferente do PRODUCTION_RESET.sql, não depende de uma lista fixa de tabelas:
-- apaga TODAS as tabelas do schema public que não estão em v_keep, então cobre
-- tabelas criadas depois (projects, shipments, logs de auditoria, etc).
--
-- COMO USAR (Supabase → SQL Editor):
--   0. Faça um backup antes (Database → Backups).
--   1. Rode só a PARTE 1 e confira a lista de tabelas e contagens.
--   2. Rode a PARTE 2. Ela é atômica: se algo falhar, nada é apagado.
--   3. Apague os arquivos de imagem no Storage pelo painel (não é feito aqui).
-- ==============================================================================


-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 1 — PRÉVIA (somente leitura)
-- ══════════════════════════════════════════════════════════════════════════════
SELECT c.relname AS tabela,
       CASE WHEN c.relname IN ('profiles', 'companies', 'categories', 'master_catalog')
            THEN 'MANTER (filtrada/base)' ELSE 'APAGAR TUDO' END AS acao,
       c.reltuples::bigint AS linhas_aprox
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY acao, tabela;

SELECT count(*) AS usuarios_auth_a_apagar
FROM auth.users
WHERE email <> 'paulofernandoautomacao@gmail.com';


-- ══════════════════════════════════════════════════════════════════════════════
-- PARTE 2 — EXECUÇÃO
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_master_email text := 'paulofernandoautomacao@gmail.com';
    v_keep text[] := ARRAY['profiles', 'companies', 'categories', 'master_catalog'];
    v_master_id uuid;
    v_master_company_id uuid;
    v_truncate_list text;
    r record;
BEGIN
    -- 1. Identificar o master
    SELECT id INTO v_master_id FROM auth.users WHERE email = v_master_email;
    IF v_master_id IS NULL THEN
        RAISE EXCEPTION 'Usuário master (%) não encontrado. Nada foi apagado.', v_master_email;
    END IF;

    SELECT company_id INTO v_master_company_id FROM public.profiles WHERE id = v_master_id;
    IF v_master_company_id IS NULL THEN
        SELECT id INTO v_master_company_id FROM public.companies WHERE owner_id = v_master_id LIMIT 1;
    END IF;

    -- 2. Lista das tabelas a zerar (todas do public fora de v_keep)
    SELECT string_agg(format('public.%I', c.relname), ', ')
    INTO v_truncate_list
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND NOT (c.relname = ANY (v_keep));

    -- 3. FKs das tabelas mantidas que apontam para tabelas a zerar impediriam o
    --    TRUNCATE. Guarda a definição, zera a coluna e remove a FK temporariamente.
    CREATE TEMP TABLE _reset_fks ON COMMIT DROP AS
    SELECT src.relname AS tbl, con.conname AS name, pg_get_constraintdef(con.oid) AS def,
           (SELECT array_agg(a.attname) FROM pg_attribute a
             WHERE a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)) AS cols
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_class dst ON dst.oid = con.confrelid
    JOIN pg_namespace ns ON ns.oid = src.relnamespace
    JOIN pg_namespace nd ON nd.oid = dst.relnamespace
    WHERE con.contype = 'f'
      AND ns.nspname = 'public' AND nd.nspname = 'public'
      AND src.relname = ANY (v_keep)
      AND NOT (dst.relname = ANY (v_keep));

    FOR r IN SELECT * FROM _reset_fks LOOP
        RAISE NOTICE 'Removendo FK temporária %.%', r.tbl, r.name;
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.name);
        FOR i IN 1 .. array_length(r.cols, 1) LOOP
            EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I IS NOT NULL', r.tbl, r.cols[i], r.cols[i]);
        END LOOP;
    END LOOP;

    -- 4. Zera todas as outras tabelas de uma vez (TRUNCATE não dispara gatilhos por linha)
    RAISE NOTICE 'Zerando: %', v_truncate_list;
    EXECUTE 'TRUNCATE TABLE ' || v_truncate_list || ' RESTART IDENTITY';

    -- 5. Perfis e empresas: mantém só o master e a empresa dele
    --    (desvincula antes, já que perfis e empresas se referenciam mutuamente)
    UPDATE public.profiles SET company_id = NULL WHERE id <> v_master_id;
    UPDATE public.companies SET parent_company_id = NULL WHERE parent_company_id IS NOT NULL;
    IF v_master_company_id IS NOT NULL THEN
        DELETE FROM public.companies WHERE id <> v_master_company_id;
        UPDATE public.companies SET status = 'active' WHERE id = v_master_company_id;
    ELSE
        DELETE FROM public.companies;
    END IF;

    DELETE FROM public.profiles WHERE id <> v_master_id;
    UPDATE public.profiles SET role = 'admin' WHERE id = v_master_id;

    -- 6. Usuários do auth (cascata apaga identities, sessions e refresh tokens,
    --    para que as locadoras possam se cadastrar de novo com o mesmo e-mail)
    DELETE FROM auth.users WHERE id <> v_master_id;

    -- 7. Gatilhos dos DELETEs acima podem ter gerado logs/notificações: zera de novo
    EXECUTE 'TRUNCATE TABLE ' || v_truncate_list || ' RESTART IDENTITY';

    -- 8. Recria as FKs removidas no passo 3
    FOR r IN SELECT * FROM _reset_fks LOOP
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s', r.tbl, r.name, r.def);
    END LOOP;

    RAISE NOTICE '==============================================';
    RAISE NOTICE ' Reset concluído. Master preservado: %', v_master_email;
    RAISE NOTICE ' Empresa preservada: %', COALESCE(v_master_company_id::text, '(nenhuma)');
    RAISE NOTICE '==============================================';
END $$;


-- Conferência final
SELECT (SELECT count(*) FROM auth.users)        AS usuarios,
       (SELECT count(*) FROM public.profiles)   AS perfis,
       (SELECT count(*) FROM public.companies)  AS empresas,
       (SELECT count(*) FROM public.equipments) AS equipamentos,
       (SELECT count(*) FROM public.bookings)   AS reservas;
