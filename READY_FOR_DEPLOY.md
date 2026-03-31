# CineHub: Checklist de Lançamento 🚀

Seu software está em um nível de engenharia profissional. Siga estes passos finais para entrar em produção:

### 1. Banco de Dados (Supabase)
- [ ] No Supabase SQL Editor, aplique o conteúdo do arquivo `update_schema_full_v2.sql`. Isso criará as novas tabelas de pagamentos, logística, reviews e notificações.
- [ ] Confirme se o isolamento RLS está ativo em todas as novas tabelas.

### 2. Infraestrutura (Storage)
- [ ] Crie o bucket `images` no Supabase Storage e sete como **Público**.
- [ ] Crie as pastas `equipment-images` e `user-avatars`.

### 3. Vercel & .env
Certifique-se de adicionar no seu provedor de deploy:
- `VITE_GEMINI_API_KEY`: Sua chave Gemini para as sugestões de IA.
- `VITE_SUPABASE_URL`: URL do seu projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase.

### 4. Git Flow
O código agora já está no seu computador!
```bash
git add .
git commit -m "feat: complete launch engine - final version"
git push origin main
```
