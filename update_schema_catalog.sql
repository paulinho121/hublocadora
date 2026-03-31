-- 1. Tabela de Catálogo Master (Itens Oficiais Inalteráveis)
CREATE TABLE public.master_catalog (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Vincular Equipamentos ao Catálogo
ALTER TABLE public.equipments 
ADD COLUMN master_item_id uuid REFERENCES public.master_catalog(id);

-- 3. Inserir Dados da Aputure no Catálogo
INSERT INTO public.master_catalog (name, brand, category, description, image_url) VALUES
('Aputure STORM 700x', 'Aputure', 'LED Point Source', 'Lâmpada point-source de 700W com branco ajustável (tunable white) e alta fidelidade, equipada com o ProLock Bowens Mount.', 'https://cdn.shopify.com/s/files/1/1343/1935/files/STORM700xCineKit_53ca48b4-4902-428a-a4b9-7dd99544c46e.png'),
('Aputure LS 600c Pro II', 'Aputure', 'LED Point Source', 'Iluminador LED de 600W com cores ajustáveis (full-color) de alta precisão e conectividade avançada.', 'https://cdn.shopify.com/s/files/1/1343/1935/files/600xPro_Clean.png'),
('Aputure NOVA II 2x1', 'Aputure', 'LED Panel', 'Painel LED de 1.000W de alta fidelidade com controle total de cores e luz suave embutida.', 'https://cdn.shopify.com/s/files/1/1343/1935/files/NovaP300c_Clean.png'),
('amaran 300c', 'amaran', 'LED Point Source', 'Luz LED full-color de 300W com montagem Bowens, combinando controle RGBWW completo.', 'https://amarancreators.com/cdn/shop/files/300c-1.png'),
('amaran T4c', 'amaran', 'LED Tube Light', 'Tubo de luz LED RGBWW de 4 pés (120cm), versátil para efeitos práticos e design de set.', 'https://amarancreators.com/cdn/shop/files/T4c_1.png'),
('amaran F22c', 'amaran', 'Flexible LED Mat', 'Tapete LED flexível RGBWW de 2x2 pés, extremamente portátil e eficiente.', 'https://amarancreators.com/cdn/shop/files/F22c_1.png'),
('Aputure LS 600x Pro', 'Aputure', 'LED Point Source', 'Iluminador Bi-color potente de 600W com resistência a clima (IP54).', 'https://cdn.shopify.com/s/files/1/1343/1935/files/600xPro_Clean.png'),
('Aputure Nova P300c', 'Aputure', 'LED Panel', 'Painel compacto da série Nova, com 300W de potência RGBWW e luz suave.', 'https://cdn.shopify.com/s/files/1/1343/1935/files/NovaP300c_Clean.png'),
('Aputure STORM 1200x', 'Aputure', 'LED Point Source', 'Luz point-source de 1.200W Bi-color para sets de grande escala.', 'https://cdn.shopify.com/s/files/1/1343/1935/files/STORM1200x_Clean.png');

-- 4. RLS para Master Catalog (Leitura pública)
ALTER TABLE public.master_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master catalog is viewable by everyone" ON public.master_catalog FOR SELECT USING (true);
