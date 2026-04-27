-- ======================================================
-- FIX: TABELA DE FILIAIS (BRANCHES)
-- Adiciona colunas faltantes para o cadastro de sub-locadoras
-- ======================================================

-- 1. Adicionar colunas de documento e telefone
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Garantir que a coluna company_id existe (já existe mas por segurança)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 3. Atualizar a Política de RLS para ser mais robusta
DROP POLICY IF EXISTS "Empresas gerenciam suas unidades" ON public.branches;
CREATE POLICY "Empresas gerenciam suas unidades" ON public.branches
    FOR ALL TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Garantir que o Realtime está ativo para ver atualizações imediatas
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
