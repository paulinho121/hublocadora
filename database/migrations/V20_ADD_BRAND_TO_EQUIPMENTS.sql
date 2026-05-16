-- Migration: V20_ADD_BRAND_TO_EQUIPMENTS
-- Descrição: Adiciona coluna de marca (brand) para melhor filtragem no Marketplace.

ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.equipments ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Atualizar Master Catalog se necessário (já existe mas para garantir consistência)
ALTER TABLE public.master_catalog ADD COLUMN IF NOT EXISTS brand TEXT;

-- Criar índice para performance de busca por marca
CREATE INDEX IF NOT EXISTS idx_equipments_brand ON public.equipments(brand);
