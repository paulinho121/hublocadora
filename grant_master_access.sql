-- Script para conceder acesso de Super Usuário (Admin)
-- Responsável: Cinehub Master Access

-- 1. Atualizar o papel (role) para 'admin' no perfil
UPDATE public.profiles
SET role = 'admin'
WHERE email IN (
  'logistica@mcistore.com.br',
  'comercial@mcistore.com.br'
);

-- 2. Confirmar a alteração
SELECT email, role 
FROM public.profiles 
WHERE email IN (
  'logistica@mcistore.com.br',
  'comercial@mcistore.com.br'
);
