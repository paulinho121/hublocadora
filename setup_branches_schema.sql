
-- Tabela de Unidades/Sub-Locadoras
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    address text,
    city text,
    state text,
    manager_email text,
    invite_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    status text DEFAULT 'active' CHECK (status IN ('invited', 'active', 'inactive')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabela de Estoque por Unidade
CREATE TABLE IF NOT EXISTS public.equipment_stock (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    quantity integer DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(equipment_id, branch_id)
);

-- Adicionar origem logística na entrega
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS origin_branch_id uuid REFERENCES public.branches(id);

-- Habilitar RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_stock ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY \
Empresas
gerenciam
suas
unidades\ ON public.branches
    FOR ALL USING (company_id = (SELECT get_user_company()));

CREATE POLICY \Acesso
ao
estoque
baseado
na
empresa\ ON public.equipment_stock
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.branches b 
            WHERE b.id = equipment_stock.branch_id 
            AND b.company_id = (SELECT get_user_company())
        )
    );

