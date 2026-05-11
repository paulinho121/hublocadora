-- Script para transferir todos os equipamentos para o seu Invetário Principal (PAULINHO CINE)

DO $$
DECLARE
  v_my_company_id uuid;
BEGIN
  -- Busca o ID da sua locadora pelo nome (baseado no que aparece no seu painel)
  SELECT id INTO v_my_company_id 
  FROM public.companies 
  WHERE name ILIKE '%PAULINHO CINE%' 
  LIMIT 1;
  
  -- Se encontrou a sua empresa, move TODOS os equipamentos do banco de dados para ela
  IF v_my_company_id IS NOT NULL THEN
    UPDATE public.equipments
    SET company_id = v_my_company_id;
  END IF;
  
END $$;
