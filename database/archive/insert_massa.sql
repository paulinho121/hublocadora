-- Script para Importação em Massa
DO $$
DECLARE
  v_company_id uuid;
  v_owner_id uuid;
BEGIN
  -- Definir um dono padrão temporário para criar empresas
  SELECT id INTO v_owner_id FROM public.profiles LIMIT 1;


  -- Lidar com Parceiro: BAHIA
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'BAHIA' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'BAHIA', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LS 600C PRO - LUMINARIA DE LED', 'Lighting', 'OBS: DEVOLVIDO DEZEMBRO/2025 | Origem: SÃO PAULO', 430.67, 'excellent', 'available', '{"numero_serial":"","nf_doc":"","data_entrega":"2025-03-10","cod_interno":"4492","preco_custo_original":8613.33}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE-  LS 300X REFLETOR DE LED', 'Lighting', 'Origem: SÃO PAULO', 160.97, 'excellent', 'available', '{"numero_serial":"","nf_doc":"","data_entrega":"2025-03-10","cod_interno":"4967","preco_custo_original":3219.3}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - FRESNEL F10 ACESSORIO TIPO MODIFICADOR', 'Lighting', 'Origem: SÃO PAULO', 29.97, 'excellent', 'available', '{"numero_serial":"6HU00D29178","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4218","preco_custo_original":599.47}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - F10 BARNDOOR ACESSORIO', 'Lighting', 'Origem: SÃO PAULO', 16.64, 'excellent', 'available', '{"numero_serial":"6HVW00H13927","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4221","preco_custo_original":332.77}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LS 1200D PRO', 'Lighting', 'OBS: AIRTAG #1 | Origem: SÃO PAULO', 492.71, 'excellent', 'available', '{"numero_serial":"6LL03M10220","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4646","preco_custo_original":9854.21}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P300C', 'Lighting', 'OBS: AIRTAG #2 | Origem: SÃO PAULO', 235.15, 'excellent', 'available', '{"numero_serial":"6ET05A61650","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4675","preco_custo_original":4703.08}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P300C', 'Lighting', 'OBS: AIRTAG #3 | Origem: SÃO PAULO', 235.15, 'excellent', 'available', '{"numero_serial":"6ET05H61250","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4675","preco_custo_original":4703.08}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - 300C', 'Lighting', 'OBS: DEVOLVIDO NOVEMBRO/2025 | Origem: SÃO PAULO', 72.64, 'excellent', 'available', '{"numero_serial":"7AUDAB103C1F","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4303","preco_custo_original":1452.72}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LIGHT DOME 150 ACESSORIO TIPO MODIFICADOR', 'Lighting', 'Origem: SÃO PAULO', 35.36, 'excellent', 'available', '{"numero_serial":"6CM07Q99161","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4223","preco_custo_original":707.11}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LIGHT DOMEII ACESSORIO TIPO MODIFICADOR', 'Lighting', 'Origem: SÃO PAULO', 35.36, 'excellent', 'available', '{"numero_serial":"6CM03K33158","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4223","preco_custo_original":707.11}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LIGHT DOMEII ACESSORIO TIPO MODIFICADOR', 'Lighting', 'Origem: SÃO PAULO', 35.36, 'excellent', 'available', '{"numero_serial":"6CM03A33984","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4223","preco_custo_original":707.11}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LIGHT DOMEII ACESSORIO TIPO MODIFICADOR', 'Lighting', 'Origem: SÃO PAULO', 35.36, 'excellent', 'available', '{"numero_serial":"6CM13Y33609","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4223","preco_custo_original":707.11}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 120', 'Lighting', 'OBS: DEVOLVIDO NOVEMBRO/2025 | Origem: SÃO PAULO', 16.96, 'excellent', 'available', '{"numero_serial":"ILEGÍVEL","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"4168","preco_custo_original":339.17}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - STORM 1000C', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 596.61, 'excellent', 'available', '{"numero_serial":"AP20337A20","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"5012","preco_custo_original":11932.14}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CF12 FRESNEL', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 108.47, 'excellent', 'available', '{"numero_serial":"7UBDBM1023D8","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"5013","preco_custo_original":2169.48}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CF12 BARNDOOR', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 21.69, 'excellent', 'available', '{"numero_serial":"7WATBL10244E","nf_doc":"","data_entrega":"2025-03-31","cod_interno":"5014","preco_custo_original":433.89}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LS 600C PRO - LUMINARIA DE LED', 'Lighting', 'OBS: DEVOLVIDO DEZEMBRO/2025 | Origem: SÃO PAULO', 430.67, 'excellent', 'available', '{"numero_serial":"6LY05U31551","nf_doc":"","data_entrega":"2025-05-20","cod_interno":"4492","preco_custo_original":8613.33}'::jsonb);

  -- Lidar com Parceiro: CINEGRIPP
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'CINEGRIPP' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'CINEGRIPP', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - STORM 1000C', 'Lighting', 'Origem: SANTA CATARINA', 630.11, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5012","preco_custo_original":12602.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - STORM 1000C', 'Lighting', 'Origem: SANTA CATARINA', 630.11, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5012","preco_custo_original":12602.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - STORM 1000C', 'Lighting', 'Origem: SANTA CATARINA', 630.11, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5012","preco_custo_original":12602.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - C12 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 114.57, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5013","preco_custo_original":2291.32}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - C12 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 114.57, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5013","preco_custo_original":2291.32}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - C12 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 114.57, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5013","preco_custo_original":2291.32}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE C12 - BARNDOOR', 'Lighting', 'Origem: SANTA CATARINA', 22.91, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5014","preco_custo_original":458.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE C12 - BARNDOOR', 'Lighting', 'Origem: SANTA CATARINA', 22.91, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5014","preco_custo_original":458.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE C12 - BARNDOOR', 'Lighting', 'Origem: SANTA CATARINA', 22.91, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560723","data_entrega":"2025-05-21","cod_interno":"5014","preco_custo_original":458.26}'::jsonb);

  -- Lidar com Parceiro: CINEVIDEO
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'CINEVIDEO' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'CINEVIDEO', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE STORM 1200X', 'Lighting', 'Origem: SANTA CATARINA', 490.01, 'excellent', 'available', '{"numero_serial":"7PPDBG1020E1","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4907","preco_custo_original":9800.16}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE STORM 1200X', 'Lighting', 'Origem: SANTA CATARINA', 490.01, 'excellent', 'available', '{"numero_serial":"7PPDBG102085","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4907","preco_custo_original":9800.16}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE STORM 1200X', 'Lighting', 'Origem: SANTA CATARINA', 490.01, 'excellent', 'available', '{"numero_serial":"7PPDBH1023B7","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4907","preco_custo_original":9800.16}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE STORM 1200X', 'Lighting', 'Origem: SANTA CATARINA', 490.01, 'excellent', 'available', '{"numero_serial":"7PPDBG1020DB","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4907","preco_custo_original":9800.16}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE STORM 1200X HYPER REFLECTOR KIT', 'Lighting', 'Origem: SANTA CATARINA', 30.27, 'excellent', 'available', '{"numero_serial":"7PQDBM1021F1","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4908","preco_custo_original":605.3}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE STORM 1200X HYPER REFLECTOR KIT', 'Lighting', 'Origem: SANTA CATARINA', 30.27, 'excellent', 'available', '{"numero_serial":"7PQDBM1021F3","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4908","preco_custo_original":605.3}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE STORM 1200X HYPER REFLECTOR KIT', 'Lighting', 'Origem: SANTA CATARINA', 30.27, 'excellent', 'available', '{"numero_serial":"7PQDBM1021F4","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4908","preco_custo_original":605.3}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - STORM 1200X HYPER REFLECTOR KIT', 'Lighting', 'Origem: SANTA CATARINA', 30.27, 'excellent', 'available', '{"numero_serial":"7PQDBM102026","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4908","preco_custo_original":605.3}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - 300C', 'Lighting', 'Origem: SANTA CATARINA', 78.06, 'excellent', 'available', '{"numero_serial":"7AUDBH102991","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4303","preco_custo_original":1561.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - 300C', 'Lighting', 'Origem: SANTA CATARINA', 78.06, 'excellent', 'available', '{"numero_serial":"7AUDBH102992","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4303","preco_custo_original":1561.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - 300C', 'Lighting', 'Origem: SANTA CATARINA', 78.06, 'excellent', 'available', '{"numero_serial":"7AUDBH1029A7","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4303","preco_custo_original":1561.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - 300C', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 78.06, 'excellent', 'available', '{"numero_serial":"7AUDBC102991","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4303","preco_custo_original":1561.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - T2C', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 28.83, 'excellent', 'available', '{"numero_serial":"6MB01E2029","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4800","preco_custo_original":576.58}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - T2C', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 28.83, 'excellent', 'available', '{"numero_serial":"SEM N/S","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4800","preco_custo_original":576.58}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - T4C', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 44.55, 'excellent', 'available', '{"numero_serial":"6MR01R39712","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4801","preco_custo_original":891.07}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - T4C', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 44.55, 'excellent', 'available', '{"numero_serial":"6MR00H32435","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4801","preco_custo_original":891.07}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - T4C', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 44.55, 'excellent', 'available', '{"numero_serial":"6MR00T30329","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4801","preco_custo_original":891.07}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CF12 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 114.57, 'excellent', 'available', '{"numero_serial":"7WATBM102012","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"5013","preco_custo_original":2291.32}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CF12 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 114.57, 'excellent', 'available', '{"numero_serial":"7WATBM102013","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"5013","preco_custo_original":2291.32}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CF12 BARNDOOR', 'Lighting', 'Origem: SANTA CATARINA', 22.91, 'excellent', 'available', '{"numero_serial":"7UBDBM1023CD","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"5014","preco_custo_original":458.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CF12 BARNDOOR', 'Lighting', 'Origem: SANTA CATARINA', 22.91, 'excellent', 'available', '{"numero_serial":"7UBDBM1023CC","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"5014","preco_custo_original":458.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LS 600C PRO', 'Lighting', 'Origem: SANTA CATARINA', 365.75, 'excellent', 'available', '{"numero_serial":"6LY05X31609","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4492","preco_custo_original":7314.9}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LS 600C PRO', 'Lighting', 'Origem: SANTA CATARINA', 365.75, 'excellent', 'available', '{"numero_serial":"6LY05H31543","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4492","preco_custo_original":7314.9}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C KIT', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 432.36, 'excellent', 'available', '{"numero_serial":"6LT01R16241","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4424","preco_custo_original":8647.2}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C KIT', 'Lighting', 'OBS: FATURADO NF SC - ENTREGUE EQUIP. DE SP | Origem: SANTA CATARINA / SÃO PAULO', 432.36, 'excellent', 'available', '{"numero_serial":"6LT03S51916","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4424","preco_custo_original":8647.2}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - 200X S', 'Lighting', 'Origem: SANTA CATARINA', 58.61, 'excellent', 'available', '{"numero_serial":"6SR00202235","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4341","preco_custo_original":1172.18}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'AMARAN - 200X S', 'Lighting', 'Origem: SANTA CATARINA', 58.61, 'excellent', 'available', '{"numero_serial":"6SR00202209","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4341","preco_custo_original":1172.18}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LS 300X', 'Lighting', 'Origem: SANTA CATARINA', 160.97, 'excellent', 'available', '{"numero_serial":"6FA19L23898","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4967","preco_custo_original":3219.3}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 50', 'Lighting', 'Origem: SANTA CATARINA', 61.69, 'excellent', 'available', '{"numero_serial":"CAT05019A371","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4616","preco_custo_original":1233.72}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 50', 'Lighting', 'Origem: SANTA CATARINA', 61.69, 'excellent', 'available', '{"numero_serial":"CAT05019A378","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4616","preco_custo_original":1233.72}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 50', 'Lighting', 'Origem: SANTA CATARINA', 61.69, 'excellent', 'available', '{"numero_serial":"CAT05019A380","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4616","preco_custo_original":1233.72}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 50', 'Lighting', 'Origem: SANTA CATARINA', 61.69, 'excellent', 'available', '{"numero_serial":"CAT05019A393","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4616","preco_custo_original":1233.72}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 100', 'Lighting', 'Origem: SANTA CATARINA', 87.64, 'excellent', 'available', '{"numero_serial":"CAT10019A545","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4412","preco_custo_original":1752.73}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 100', 'Lighting', 'Origem: SANTA CATARINA', 87.64, 'excellent', 'available', '{"numero_serial":"CAT10019A580","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4412","preco_custo_original":1752.73}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 100', 'Lighting', 'Origem: SANTA CATARINA', 87.64, 'excellent', 'available', '{"numero_serial":"CAT10019A694","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4412","preco_custo_original":1752.73}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CALIGRI - AIRTUBE 100', 'Lighting', 'Origem: SANTA CATARINA', 87.64, 'excellent', 'available', '{"numero_serial":"CAT10019A700","nf_doc":"NF 560465","data_entrega":"2025-03-25","cod_interno":"4412","preco_custo_original":1752.73}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X4', 'Lighting', 'Origem: SANTA CATARINA', 387.19, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561075","data_entrega":"2025-08-11","cod_interno":"5115","preco_custo_original":7743.74}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X4', 'Lighting', 'Origem: SANTA CATARINA', 387.19, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561075","data_entrega":"2025-08-11","cod_interno":"5115","preco_custo_original":7743.74}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 2X4', 'Lighting', 'Origem: SANTA CATARINA', 483.98, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561075","data_entrega":"2025-08-11","cod_interno":"4730","preco_custo_original":9679.68}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 2X4', 'Lighting', 'Origem: SANTA CATARINA', 483.98, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561075","data_entrega":"2025-08-11","cod_interno":"4730","preco_custo_original":9679.68}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 4X4', 'Lighting', 'Origem: SANTA CATARINA', 704.80, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561075","data_entrega":"2025-08-11","cod_interno":"5116","preco_custo_original":14096.03}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 4X4', 'Lighting', 'Origem: SANTA CATARINA', 704.80, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561075","data_entrega":"2025-08-11","cod_interno":"5116","preco_custo_original":14096.03}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - XT52', 'Lighting', 'Origem: SANTA CATARINA', 366.65, 'excellent', 'available', '{"numero_serial":"8LMDCE102174","nf_doc":"NF 561250","data_entrega":"2025-09-19","cod_interno":"5372","preco_custo_original":7333.02}'::jsonb);

  -- Lidar com Parceiro: LUZ INFRA
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'LUZ INFRA' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'LUZ INFRA', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 4X4', 'Lighting', 'Origem: SANTA CATARINA', 589.26, 'excellent', 'available', '{"numero_serial":"7KCTCC30202D","nf_doc":"561303","data_entrega":"2025-09-24","cod_interno":"5116","preco_custo_original":11785.2}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 4X4', 'Lighting', 'Origem: SANTA CATARINA', 589.26, 'excellent', 'available', '{"numero_serial":"8LGTCD102044","nf_doc":"561303","data_entrega":"2025-09-24","cod_interno":"5116","preco_custo_original":11785.2}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 2X4', 'Lighting', 'Origem: SANTA CATARINA', 366.65, 'excellent', 'available', '{"numero_serial":"APD0039AR4","nf_doc":"561303","data_entrega":"2025-09-24","cod_interno":"4730","preco_custo_original":7333.02}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 2X4', 'Lighting', 'Origem: SANTA CATARINA', 366.65, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561303","data_entrega":"2025-09-24","cod_interno":"4730","preco_custo_original":7333.02}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X4', 'Lighting', 'Origem: SANTA CATARINA', 387.19, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561303","data_entrega":"2025-09-24","cod_interno":"5115","preco_custo_original":7743.74}'::jsonb);

  -- Lidar com Parceiro: MOVING TRACK
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'MOVING TRACK' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'MOVING TRACK', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 8X8', 'Lighting', 'Origem: SANTA CATARINA', 404.56, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-02-18","cod_interno":"4729","preco_custo_original":8091.22}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 2X4', 'Lighting', 'Origem: SANTA CATARINA', 337.14, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-02-18","cod_interno":"4730","preco_custo_original":6742.71}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT CONTROL GRID 8X8', 'Lighting', 'Origem: SANTA CATARINA', 67.43, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-02-18","cod_interno":"4732","preco_custo_original":1348.56}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X2', 'Lighting', 'Origem: SANTA CATARINA', 311.56, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-02-18","cod_interno":"5114","preco_custo_original":6231.29}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X4', 'Lighting', 'Origem: SANTA CATARINA', 387.19, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-02-18","cod_interno":"5115","preco_custo_original":7743.74}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 4X4', 'Lighting', 'Origem: SANTA CATARINA', 704.80, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-02-18","cod_interno":"5116","preco_custo_original":14096.03}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 8X8', 'Lighting', 'Origem: SANTA CATARINA', 260.88, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-03-24","cod_interno":"4729","preco_custo_original":5217.53}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 2X4', 'Lighting', 'Origem: SANTA CATARINA', 483.98, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-03-24","cod_interno":"4730","preco_custo_original":9679.68}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X4', 'Lighting', 'Origem: SANTA CATARINA', 387.19, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-03-24","cod_interno":"5115","preco_custo_original":7743.74}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X2', 'Lighting', 'Origem: SANTA CATARINA', 311.56, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-03-24","cod_interno":"5114","preco_custo_original":6231.29}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 4X4', 'Lighting', 'Origem: SANTA CATARINA', 704.80, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560577","data_entrega":"2025-03-24","cod_interno":"5116","preco_custo_original":14096.03}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT CONTROL GRID 8X8', 'Lighting', 'Origem: SÃO PAULO', 67.43, 'excellent', 'available', '{"numero_serial":"","nf_doc":"20250423-02","data_entrega":"2025-04-03","cod_interno":"4732","preco_custo_original":1348.56}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 8X8', 'Lighting', 'Origem: SANTA CATARINA', 404.56, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560802","data_entrega":"2025-06-05","cod_interno":"4729","preco_custo_original":8091.22}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT CONTROL GRID 8X8', 'Lighting', 'Origem: SANTA CATARINA', 67.43, 'excellent', 'available', '{"numero_serial":"","nf_doc":"560814","data_entrega":"2025-06-06","cod_interno":"4732","preco_custo_original":1348.56}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 2X4', 'Lighting', 'Origem: SANTA CATARINA', 337.14, 'excellent', 'available', '{"numero_serial":"7KBTCC302034","nf_doc":"561031","data_entrega":"2025-07-30","cod_interno":"4730","preco_custo_original":6742.71}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT SOFTBOX PACK 2X4', 'Lighting', 'Origem: SANTA CATARINA', 337.14, 'excellent', 'available', '{"numero_serial":"7KBTCC302036","nf_doc":"561031","data_entrega":"2025-07-30","cod_interno":"4730","preco_custo_original":6742.71}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 4X4', 'Lighting', 'Origem: SANTA CATARINA', 573.56, 'excellent', 'available', '{"numero_serial":"8LGTCD102043","nf_doc":"561031","data_entrega":"2025-07-30","cod_interno":"5116","preco_custo_original":11471.13}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 4X4', 'Lighting', 'Origem: SANTA CATARINA', 573.56, 'excellent', 'available', '{"numero_serial":"8LGTCD20200D","nf_doc":"561031","data_entrega":"2025-07-30","cod_interno":"5116","preco_custo_original":11471.13}'::jsonb);

  -- Lidar com Parceiro: JOTABY
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'JOTABY' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'JOTABY', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'LIGHT BRIDGE - C-MOVE', 'Lighting', 'Origem: SÃO PAULO', 733.70, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 1220","data_entrega":"2024-11-11","cod_interno":"4373","preco_custo_original":14673.93}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'LIGHT BRIDGE - C-100', 'Lighting', 'Origem: SANTA CATARINA', 974.58, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560121","data_entrega":"2024-12-20","cod_interno":"4374","preco_custo_original":19491.56}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 8X8', 'Lighting', 'Equipamento importado via planilha.', 2608.98, 'excellent', 'available', '{"numero_serial":"","nf_doc":"","data_entrega":"","cod_interno":"4729","preco_custo_original":52179.53}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C KIT', 'Lighting', 'Origem: SANTA CATARINA', 374.67, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4424","preco_custo_original":7493.43}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C KIT', 'Lighting', 'Origem: SANTA CATARINA', 374.67, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4424","preco_custo_original":7493.43}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C RAIN SHIELD', 'Lighting', 'Origem: SANTA CATARINA', 18.73, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4420","preco_custo_original":374.67}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C RAIN SHIELD', 'Lighting', 'Origem: SANTA CATARINA', 18.73, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4420","preco_custo_original":374.67}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C RAIN SHIELD', 'Lighting', 'Origem: SANTA CATARINA', 18.73, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4420","preco_custo_original":374.67}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C RAIN SHIELD', 'Lighting', 'Origem: SANTA CATARINA', 18.73, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4420","preco_custo_original":374.67}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C SPACE LIGHT', 'Lighting', 'Origem: SANTA CATARINA', 39.94, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4126","preco_custo_original":798.85}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C SPACE LIGHT', 'Lighting', 'Origem: SANTA CATARINA', 39.94, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4126","preco_custo_original":798.85}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C SPACE LIGHT', 'Lighting', 'Origem: SANTA CATARINA', 39.94, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4126","preco_custo_original":798.85}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C SPACE LIGHT', 'Lighting', 'Origem: SANTA CATARINA', 39.94, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4126","preco_custo_original":798.85}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C DUAL HEAD YOKE', 'Lighting', 'Origem: SANTA CATARINA', 65.28, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561141","data_entrega":"2025-08-27","cod_interno":"4127","preco_custo_original":1305.64}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CREAM SOURCE - SPACEX', 'Lighting', 'Origem: SANTA CATARINA', 96.46, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561493","data_entrega":"2025-11-10","cod_interno":"5252","preco_custo_original":1929.23}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CREAM SOURCE - SPACEX', 'Lighting', 'Origem: SANTA CATARINA', 96.46, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 561709","data_entrega":"2025-12-23","cod_interno":"5252","preco_custo_original":1929.23}'::jsonb);

  -- Lidar com Parceiro: THE BEST
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'THE BEST' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'THE BEST', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CREAM SOURCE - VORTEX 8', 'Lighting', 'OBS: VIROU CONSULTORIA  EM SETEMBRO DE 2025 | Origem: SANTA CATARINA', 778.61, 'excellent', 'available', '{"numero_serial":"821809","nf_doc":"NF 560474","data_entrega":"2025-03-24","cod_interno":"4296","preco_custo_original":15572.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CREAM SOURCE - VORTEX 8', 'Lighting', 'OBS: VIROU CONSULTORIA  EM SETEMBRO DE 2025 | Origem: SANTA CATARINA', 778.61, 'excellent', 'available', '{"numero_serial":"822314","nf_doc":"NF 560474","data_entrega":"2025-03-24","cod_interno":"4296","preco_custo_original":15572.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOPCHICE - SBCV8', 'Lighting', 'OBS: VIROU CONSULTORIA  EM SETEMBRO DE 2025 | Origem: SANTA CATARINA', 75.03, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560474","data_entrega":"2025-03-24","cod_interno":"4285","preco_custo_original":1500.62}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOPCHICE - SBCV8', 'Lighting', 'OBS: VIROU CONSULTORIA  EM SETEMBRO DE 2025 | Origem: SANTA CATARINA', 75.03, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560474","data_entrega":"2025-03-24","cod_interno":"4285","preco_custo_original":1500.62}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOPCHOICE - SGR96W40', 'Lighting', 'OBS: VIROU CONSULTORIA  EM SETEMBRO DE 2025 | Origem: SANTA CATARINA', 51.07, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560474","data_entrega":"2025-03-24","cod_interno":"4269","preco_custo_original":1021.34}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOPCHOICE - SGR96W40', 'Lighting', 'OBS: VIROU CONSULTORIA  EM SETEMBRO DE 2025 | Origem: SANTA CATARINA', 51.07, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560474","data_entrega":"2025-03-24","cod_interno":"4269","preco_custo_original":1021.34}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOPCHOICE - SGCV8W40', 'Lighting', 'OBS: VIROU CONSULTORIA  EM SETEMBRO DE 2025 | Origem: SANTA CATARINA', 49.00, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560474","data_entrega":"2025-03-24","cod_interno":"4413","preco_custo_original":980.03}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOPCHOICE - SGCV8W40', 'Lighting', 'OBS: VIROU CONSULTORIA  EM SETEMBRO DE 2025 | Origem: SANTA CATARINA', 49.00, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560474","data_entrega":"2025-03-24","cod_interno":"4413","preco_custo_original":980.03}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CS15', 'Lighting', 'Origem: SANTA CATARINA', 995.02, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560658","data_entrega":"2025-05-12","cod_interno":"4556","preco_custo_original":19900.4}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - YOKE AUTOMATICO', 'Lighting', 'Origem: SANTA CATARINA', 317.59, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560658","data_entrega":"2025-05-12","cod_interno":"4560","preco_custo_original":6351.73}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CS15', 'Lighting', 'Origem: SANTA CATARINA', 995.02, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560670","data_entrega":"2025-05-12","cod_interno":"4556","preco_custo_original":19900.4}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - FRESNEL F14', 'Lighting', 'Origem: SANTA CATARINA', 351.35, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560670","data_entrega":"2025-05-12","cod_interno":"4612","preco_custo_original":7027.08}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - FRESNEL F14', 'Lighting', 'Origem: SANTA CATARINA', 351.35, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560670","data_entrega":"2025-05-12","cod_interno":"4612","preco_custo_original":7027.08}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE -  INFINIBAR PB6 8 LIGHT KIT', 'Lighting', 'Origem: SANTA CATARINA', 613.33, 'excellent', 'available', '{"numero_serial":"6TW00020640","nf_doc":"NF 560701","data_entrega":"2025-05-16","cod_interno":"4335","preco_custo_original":12266.5}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE -  INFINIBAR PB6 8 LIGHT KIT', 'Lighting', 'Origem: SANTA CATARINA', 613.33, 'excellent', 'available', '{"numero_serial":"6TW00020710","nf_doc":"NF 560840","data_entrega":"2025-06-13","cod_interno":"4335","preco_custo_original":12266.5}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LIGHT DOME 150', 'Lighting', 'Origem: SÃO PAULO', 35.36, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 1650","data_entrega":"2025-06-17","cod_interno":"4223","preco_custo_original":707.11}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - LIGHT DOME 150', 'Lighting', 'Origem: SÃO PAULO', 35.36, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 1650","data_entrega":"2025-06-17","cod_interno":"4223","preco_custo_original":707.11}'::jsonb);

  -- Lidar com Parceiro: TESCH
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'TESCH' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'TESCH', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - STORM 1200X', 'Lighting', 'Origem: SANTA CATARINA', 764.79, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560593","data_entrega":"2024-12-15","cod_interno":"4907","preco_custo_original":15295.75}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - STORM 1200X HYPER REFLECTOR KIT', 'Lighting', 'Origem: SANTA CATARINA', 50.98, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560593","data_entrega":"2024-12-15","cod_interno":"4908","preco_custo_original":1019.57}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CF12 FRESNEL', 'Lighting', 'Equipamento importado via planilha.', 114.57, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560593","data_entrega":"2024-12-15","cod_interno":"5013","preco_custo_original":2291.32}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - CF12 BARNDOOR', 'Lighting', 'Equipamento importado via planilha.', 22.91, 'excellent', 'available', '{"numero_serial":"","nf_doc":"NF 560593","data_entrega":"2024-12-15","cod_interno":"5014","preco_custo_original":458.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - NOVA P600C PAINEL DE LUZ DE LED', 'Lighting', 'OBS: EQUIPAMENTO RETORNOU PARA A ASSISTÊNCIA AGO/2025 | Origem: SANTA CATARINA', 374.67, 'excellent', 'available', '{"numero_serial":"6LK00M60423","nf_doc":"NF 286","data_entrega":"2022-05-10","cod_interno":"4036","preco_custo_original":7493.43}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'ASTERA - KIT COM 8 LIGHTDROP', 'Lighting', 'Origem: SANTA CATARINA', 255.53, 'excellent', 'available', '{"numero_serial":"009-2101588","nf_doc":"NF 561197","data_entrega":"2025-09-08","cod_interno":"4952","preco_custo_original":5110.67}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X4', 'Lighting', 'Equipamento importado via planilha.', 387.19, 'excellent', 'available', '{"numero_serial":"7KATBJ10205C","nf_doc":"NF 561263","data_entrega":"2025-09-16","cod_interno":"5115","preco_custo_original":7743.74}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - INFINIMAT 1X4', 'Lighting', 'Equipamento importado via planilha.', 387.19, 'excellent', 'available', '{"numero_serial":"7KATBK102022","nf_doc":"NF 561263","data_entrega":"2025-09-16","cod_interno":"5115","preco_custo_original":7743.74}'::jsonb);

  -- Lidar com Parceiro: LOCALL - POA
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'LOCALL - POA' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'LOCALL - POA', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOP CHOICE - SGR96W40 SNAPGRID 40', 'Lighting', 'Origem: SANTA CATARINA', 59.38, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"4269","preco_custo_original":1187.64}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOP CHOICE - SGR96W40 SNAPGRID 40', 'Lighting', 'Origem: SANTA CATARINA', 59.38, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"4269","preco_custo_original":1187.64}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOP CHOICE - SBCV8 ACESSORIO DIFUSOR', 'Lighting', 'Origem: SANTA CATARINA', 75.03, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"4285","preco_custo_original":1500.62}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOP CHOICE - SBCV8 ACESSORIO DIFUSOR', 'Lighting', 'Origem: SANTA CATARINA', 75.03, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"4285","preco_custo_original":1500.62}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CREAM SOURCE - VORTEX 8', 'Lighting', 'Origem: SANTA CATARINA', 778.61, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"4296","preco_custo_original":15572.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CREAM SOURCE - VORTEX 8', 'Lighting', 'Origem: SANTA CATARINA', 778.61, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"4296","preco_custo_original":15572.26}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOP CHOICE - SGCV8W40 - ACESSORIO TIPO COLMEIA', 'Lighting', 'Origem: SANTA CATARINA', 49.00, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"4413","preco_custo_original":980.03}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'DOP CHOICE - SGCV8W40 - ACESSORIO TIPO COLMEIA', 'Lighting', 'Origem: SANTA CATARINA', 49.00, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"4413","preco_custo_original":980.03}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'CREAM SOURCE - VORTEX 24', 'Lighting', 'Origem: SANTA CATARINA', 2011.72, 'excellent', 'available', '{"numero_serial":"","nf_doc":"561158","data_entrega":"2025-09-01","cod_interno":"5080","preco_custo_original":40234.46}'::jsonb);

  -- Lidar com Parceiro: LOCALL - SP
  SELECT id INTO v_company_id FROM public.companies WHERE name ILIKE 'LOCALL - SP' LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (owner_id, name, document, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)
    VALUES (v_owner_id, 'LOCALL - SP', '00000000000', 'Rua Teste', 'SN', 'Centro', 'Cidade', 'ST', '00000')
    RETURNING id INTO v_company_id;
  END IF;
  

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - XT26', 'Lighting', 'Origem: SANTA CATARINA', 615.56, 'excellent', 'available', '{"numero_serial":"7CEDBM10203F","nf_doc":"NF 561239","data_entrega":"2025-09-15","cod_interno":"4557","preco_custo_original":12311.1}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - XT26', 'Lighting', 'Origem: SANTA CATARINA', 615.56, 'excellent', 'available', '{"numero_serial":"7CEDBM102052","nf_doc":"NF 561239","data_entrega":"2025-09-15","cod_interno":"4557","preco_custo_original":12311.1}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - XT26', 'Lighting', 'Origem: SANTA CATARINA', 615.56, 'excellent', 'available', '{"numero_serial":"7CEDBM10203D","nf_doc":"NF 561239","data_entrega":"2025-09-15","cod_interno":"4557","preco_custo_original":12311.1}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - XT26', 'Lighting', 'Origem: SANTA CATARINA', 615.56, 'excellent', 'available', '{"numero_serial":"7CEDBM102031","nf_doc":"NF 561239","data_entrega":"2025-09-15","cod_interno":"4557","preco_custo_original":12311.1}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - F14 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 351.35, 'excellent', 'available', '{"numero_serial":"7CKDBG10207B","nf_doc":"NF 561261","data_entrega":"2025-09-19","cod_interno":"4612","preco_custo_original":7027.08}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - F14 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 351.35, 'excellent', 'available', '{"numero_serial":"7CKDBG1020AC","nf_doc":"NF 561261","data_entrega":"2025-09-19","cod_interno":"4612","preco_custo_original":7027.08}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - F14 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 351.35, 'excellent', 'available', '{"numero_serial":"7CKDBG102072","nf_doc":"NF 561261","data_entrega":"2025-09-19","cod_interno":"4612","preco_custo_original":7027.08}'::jsonb);

  INSERT INTO public.equipments (company_id, name, category, description, daily_rate, condition, status, features)
  VALUES (v_company_id, 'APUTURE - F14 FRESNEL', 'Lighting', 'Origem: SANTA CATARINA', 351.35, 'excellent', 'available', '{"numero_serial":"7CKDBG1020D3","nf_doc":"NF 561261","data_entrega":"2025-09-19","cod_interno":"4612","preco_custo_original":7027.08}'::jsonb);

END $$;
