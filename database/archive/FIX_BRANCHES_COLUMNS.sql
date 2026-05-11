-- ======================================================
-- FIX: RECONSTRUÇÃO DE COLUNAS DA TABELA BRANCHES
-- Este script garante que todas as colunas necessárias existam,
-- resolvendo o erro de "column not found" e "schema cache".
-- ======================================================

-- 1. Forçar a criação de cada coluna individualmente (caso a tabela já exista incompleta)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_email TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'invited';
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- 2. Atualizar Políticas de Segurança (RLS)
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresas gerenciam suas unidades" ON public.branches;
DROP POLICY IF EXISTS "Branches Comprehensive Access" ON public.branches;

CREATE POLICY "Empresas gerenciam suas unidades" ON public.branches
    FOR ALL TO authenticated
    USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Notificar o Supabase para recarregar o cache do esquema
-- Isso resolve o erro "column not found in schema cache"
NOTIFY pgrst, 'reload schema';

-- 4. Habilitar Realtime
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'branches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
  END IF;
END $$;
