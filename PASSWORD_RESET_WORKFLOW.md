# 🔐 Passo a Passo: Fluxo de Redefinição de Senha

Este documento detalha o fluxo completo (Frontend + Backend) que ocorre quando um usuário precisa recuperar sua senha de acesso no Moving Hub.

## 1. A Solicitação (Página de Login / Cadastro)
1. O usuário acessa a página de `/login` ou `/register`.
2. O usuário preenche o seu e-mail no campo correspondente e clica em **"Esqueci a senha"** (ou "Recuperar Acesso").
3. A função `handleResetPassword` é disparada no React.
4. O sistema chama a API nativa do Supabase: `supabase.auth.resetPasswordForEmail()`.
5. **Ação Mágica:** Passamos o parâmetro `redirectTo: window.location.origin + '/reset-password'`. Isso diz ao Supabase para onde devolver o usuário quando ele clicar no e-mail.

## 2. O Processo no Servidor (Supabase)
1. O Supabase recebe a requisição.
2. Ele verifica se o e-mail existe no banco de dados de autenticação (`auth.users`).
3. Sendo válido, o Supabase dispara automaticamente um E-mail Transacional contendo um **"Magic Link"** (Link seguro contendo um token hash criptografado temporário).

## 3. A Recuperação (Caixa de Entrada do Usuário)
1. O usuário abre o e-mail e clica no botão "Redefinir Senha".
2. O navegador abre a URL do seu sistema apontando para `/reset-password#access_token=...`.
3. **Autenticação Silenciosa:** O arquivo base do Supabase intercepta o `access_token` presente na URL e instantaneamente autentica o usuário em *Background*, gerando uma sessão temporária no navegador. 

## 4. A Criação da Nova Senha (Página `/reset-password`)
Nesta etapa, o usuário é jogado para a nova tela que acabamos de criar (`ResetPassword.tsx`).

1. **Validação de Sessão:** A página checa se a Autenticação Silenciosa deu certo (`getSession()`). Se o link for velho ou expirado, aparece um erro na tela mandando pedir de novo.
2. **Interação de UI:** O usuário vê dois campos (Nova Senha e Confirmação), protegidos pela nossa função visual do ícone de "Olho" (`Eye/EyeOff`) para revelar caracteres.
3. O usuário digita a nova senha e clica em **Salvar Nova Senha**.
4. **Finalização Segura:** O React chama a API `supabase.auth.updateUser({ password: novaSenha })`.
5. O Supabase sobrescreve a senha antiga.
6. A tela exibe a mensagem de SUCESSO na cor verde e exibe o botão final: **"Ir para Login"**.

## 5. Como Testar Agora Mesmo
Se quiser validar todo o fluxo localmente ou em produção:
1. Vá no painel de **Login**.
2. Digite o seu e-mail cadastrado e clique em "Esqueci a senha".
3. Abra sua caixa de e-mail (O email chegará pelo remetente padrão do Supabase ou o que você configurou no painel deles).
4. Clique no link.
5. Crie a nova senha, e veja se o Toast/Alerta de sucesso funciona!
