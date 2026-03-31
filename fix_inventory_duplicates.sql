-- 1. Remover Duplicados Existentes (Se houver)
-- Mantém apenas o registro mais recente de cada item master por empresa
DELETE FROM public.equipments a
USING public.equipments b
WHERE a.id < b.id 
  AND a.company_id = b.company_id 
  AND a.master_item_id = b.master_item_id
  AND a.master_item_id IS NOT NULL;

-- 2. Adicionar Restrição de Unicidade
-- Impede que a mesma empresa cadastre o mesmo item oficial duas vezes
ALTER TABLE public.equipments 
ADD CONSTRAINT unique_company_master_item UNIQUE (company_id, master_item_id);

-- 3. Função de Assistência para Atualização (Incremento de Quantidade)
-- Caso o usuário tente de novo, o Supabase pode lidar com isso ou a nossa UI
COMMENT ON CONSTRAINT unique_company_master_item ON public.equipments IS 'Garante que itens do catálogo oficial sejam únicos por locadora.';
