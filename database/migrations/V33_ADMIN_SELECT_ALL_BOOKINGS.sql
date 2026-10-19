-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V33_ADMIN_SELECT_ALL_BOOKINGS
--
-- PROBLEMA: Dashboard admin mostra R$0 em todos os KPIs financeiros.
-- CAUSA: A política RLS "Bookings_Select" restringe cada usuário a ver
--        apenas suas próprias reservas. A V22 adicionou UPDATE/DELETE para
--        admin, mas esqueceu de adicionar SELECT — o admin não vê nenhum
--        booking e todos os cálculos de GMV, receita e ticket médio ficam 0.
--
-- SOLUÇÃO: Adicionar política SELECT para admin ver todos os bookings.
-- ==============================================================================

DROP POLICY IF EXISTS "Bookings_Select_Admin" ON public.bookings;

CREATE POLICY "Bookings_Select_Admin"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.check_is_admin());

-- Verificação: listar todas as políticas de bookings
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'bookings' AND schemaname = 'public'
ORDER BY cmd, policyname;
