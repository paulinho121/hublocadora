-- Adicionando quantidade em estoque para equipamentos
ALTER TABLE public.equipments 
ADD COLUMN stock_quantity integer DEFAULT 1;

COMMENT ON COLUMN public.equipments.stock_quantity IS 'Quantidade total deste item no estoque da locadora';
