-- 1. Primeiro garantimos que a coluna de quantidade existe na tabela
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 1;

-- 2. Bloco para mesclar as duplicatas
DO $$
DECLARE
  dup_record RECORD;
  master_id uuid;
BEGIN
  -- Encontra todos os equipamentos que estão repetidos (mesmo nome na mesma locadora)
  FOR dup_record IN (
    SELECT company_id, name, COUNT(*) as total_count
    FROM public.equipments
    GROUP BY company_id, name
    HAVING COUNT(*) > 1
  ) LOOP
  
    -- Elege o primeiro registro inserido para ser o "mestre" que vai ficar
    SELECT id INTO master_id
    FROM public.equipments
    WHERE company_id = dup_record.company_id AND name = dup_record.name
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Atualiza a quantidade em estoque desse equipamento "mestre"
    UPDATE public.equipments
    SET stock_quantity = dup_record.total_count
    WHERE id = master_id;
    
    -- Exclui as cópias excedentes
    DELETE FROM public.equipments
    WHERE company_id = dup_record.company_id 
      AND name = dup_record.name
      AND id != master_id;
      
  END LOOP;
END $$;
