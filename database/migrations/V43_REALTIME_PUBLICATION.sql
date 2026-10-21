-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V43_REALTIME_PUBLICATION
--
-- PROBLEMA: ao aprovar um pedido, o status só mudava para os outros usuários
--   depois de recarregar a página.
--
-- SOLUÇÃO (parte do banco): garante que as tabelas acompanhadas pelo app
--   publiquem as mudanças no Supabase Realtime. Cada usuário só recebe os
--   eventos das linhas que ele pode ler (RLS), então ninguém vê pedido alheio.
--   A outra parte está no app (RealtimeSync).
-- ==============================================================================

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['bookings', 'deliveries', 'booking_extensions', 'notifications'] LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t)
           AND NOT EXISTS (
               SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
           ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
            RAISE NOTICE 'Realtime ligado em %', t;
        END IF;
    END LOOP;
END $$;

-- Conferência: tabelas do app com Realtime ligado
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
  AND tablename IN ('bookings', 'deliveries', 'booking_extensions', 'notifications')
ORDER BY tablename;
