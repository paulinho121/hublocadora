-- ======================================================
-- FIX: PERMISSÃO DE LEITURA DE PERFIS PARA ATRIBUIÇÃO
-- Permite que usuários autenticados busquem perfis por e-mail
-- Isso é necessário para encontrar o company_id do parceiro
-- ======================================================

DROP POLICY IF EXISTS "Profiles SELECT" ON public.profiles;

CREATE POLICY "Profiles SELECT" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id 
        OR public.is_admin() 
        OR EXISTS (
            -- Permite que uma locadora veja perfis que são gerentes de suas filiais/parceiros
            SELECT 1 FROM public.branches b 
            WHERE b.manager_email = public.profiles.email 
            AND b.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
        OR role = 'rental_house' -- Permite ver outras locadoras (necessário para o ecossistema)
    );

-- Garantir que a função is_admin() continue funcionando e não cause recursão
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Busca direta na tabela ignorando RLS para evitar recursão
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        JOIN public.profiles ON public.profiles.id = auth.users.id
        WHERE auth.users.id = auth.uid() AND public.profiles.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
