-- 1. Tabela de Categorias Dinâmicas
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Categories are viewable by everyone') THEN
    CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage categories') THEN
    CREATE POLICY "Admins can manage categories" ON public.categories 
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 4. Inserção de Dados Iniciais (Seed)
INSERT INTO public.categories (name, slug) 
VALUES 
  ('Câmeras', 'cameras'),
  ('Lentes', 'lenses'),
  ('Iluminação', 'lighting'),
  ('Áudio', 'audio'),
  ('Grip & Acessórios', 'grip'),
  ('Energia', 'energy')
ON CONFLICT (slug) DO NOTHING;

-- 5. Comentário Informativo
COMMENT ON TABLE public.categories IS 'Categorias dinâmicas para equipamentos CineHub.';
