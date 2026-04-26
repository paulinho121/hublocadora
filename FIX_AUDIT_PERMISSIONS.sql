-- ======================================================
-- FIX AUDIT PERMISSIONS - CINEHUB ENTERPRISE
-- Liberando acesso RLS para a tabela de logs
-- ======================================================

-- 1. Habilita RLS (caso não esteja)
ALTER TABLE public.network_logs ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas antigas (se houver)
DROP POLICY IF EXISTS "Admins can view all logs" ON public.network_logs;

-- 3. Cria política para permitir que Admins leiam tudo
CREATE POLICY "Admins can view all logs" 
ON public.network_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 4. Garante que o sistema (triggers) possa inserir
ALTER TABLE public.network_logs FORCE ROW LEVEL SECURITY;
GRANT ALL ON public.network_logs TO authenticated;
GRANT ALL ON public.network_logs TO service_role;
