-- 1. Cria novas colunas na tabela de Equipamentos
ALTER TABLE public.equipments
ADD COLUMN IF NOT EXISTS location_base TEXT,
ADD COLUMN IF NOT EXISTS state_uf VARCHAR(2);

-- 2. Define um valor padrão "Matriz" / "SP" para os equipamentos que já estão no banco
UPDATE public.equipments 
SET location_base = 'Sede Principal', state_uf = 'SP' 
WHERE location_base IS NULL;

-- 3. (Opcional) Cria um check constraint para impedir estados inválidos, mas você pode usar apenas no frontend.
-- ALTER TABLE public.equipments ADD CONSTRAINT uf_length CHECK (char_length(state_uf) = 2);
