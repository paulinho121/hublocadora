-- ======================================================
-- CORREÇÃO DEFINITIVA: STATUS DE EMPRESAS (KYC)
-- ======================================================

-- 1. Garante que o status 'approved' é aceito (caso seja ENUM ou tenha CHECK)
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'suspended'));

-- 2. Simplifica a política de UPDATE para garantir que o Admin sempre consiga alterar
DROP POLICY IF EXISTS "Companies UPDATE" ON public.companies;
DROP POLICY IF EXISTS "Own Company Management" ON public.companies;

CREATE POLICY "Admin and Owner Update" ON public.companies
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = owner_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() = owner_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Caso exista algum trigger que reverta o status, vamos desativá-lo temporariamente para teste
-- (Se você souber o nome do trigger, adicione aqui: DROP TRIGGER IF EXISTS name ON public.companies;)

-- 4. FORÇAR APROVAÇÃO DAS EMPRESAS ATUAIS (Opcional, para destravar agora)
UPDATE public.companies SET status = 'approved' WHERE name = 'Cine Fort';
UPDATE public.companies SET status = 'approved' WHERE name = 'Locadora de teste A';
