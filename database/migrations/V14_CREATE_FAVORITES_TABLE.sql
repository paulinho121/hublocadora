-- Criar tabela de Favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, equipment_id)
);

-- Habilitar Segurança (RLS)
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Usuários podem ver seus próprios favoritos"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem adicionar favoritos"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover seus favoritos"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);
