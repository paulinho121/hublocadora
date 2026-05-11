-- ======================================================
-- FINAL PERMISSIONS & BRANCHES FIX
-- ======================================================

-- 0. Funções de Apoio (Garantir que são SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Garante permissões básicas para o role 'authenticated'
-- O erro 42501 (permission denied) indica falta de GRANT
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.branches TO authenticated;
GRANT ALL ON public.equipment_stock TO authenticated;
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- 2. Corrige as políticas da tabela de BRANCHES (Sub-locadoras)
-- Remove políticas com nomes corrompidos ou mal formatados
DROP POLICY IF EXISTS "Empresas gerenciam suas unidades" ON public.branches;
DROP POLICY IF EXISTS "Empresasgerenciamsuasunidades" ON public.branches;
-- Tenta dropar as que podem estar com caracteres especiais do erro anterior
DO $$ 
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Empresas gerenciam suas unidades" ON public.branches';
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- Cria política limpa para Branches
CREATE POLICY "Branches Management Policy" ON public.branches
    FOR ALL TO authenticated
    USING (
        company_id = public.get_user_company() 
        OR public.is_admin()
    )
    WITH CHECK (
        company_id = public.get_user_company() 
        OR public.is_admin()
    );

-- 3. Gatilho para auto-preencher company_id em novas Branches
-- Isso resolve o erro de enviar sem company_id do frontend
CREATE OR REPLACE FUNCTION public.handle_branch_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NULL THEN
        NEW.company_id := public.get_user_company();
    END IF;
    
    -- Se ainda for NULL, o usuário não tem empresa vinculada
    IF NEW.company_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não possui uma empresa vinculada para criar unidades.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_branch_insert ON public.branches;
CREATE TRIGGER tr_branch_insert
    BEFORE INSERT ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.handle_branch_insert();

-- 4. Corrige as políticas de NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Notifications Select" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Notifications Update" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Notifications Insert" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 5. Corrige políticas de ESTOQUE por Unidade
DROP POLICY IF EXISTS "Acesso ao estoque baseado na empresa" ON public.equipment_stock;

CREATE POLICY "Equipment Stock Management" ON public.equipment_stock
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.branches b 
            WHERE b.id = equipment_stock.branch_id 
            AND (b.company_id = public.get_user_company() OR public.is_admin())
        )
    );

-- 6. Habilita Realtime para Branches (opcional mas recomendado)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'branches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
  END IF;
END $$;
