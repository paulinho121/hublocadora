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

### 4. Observabilidade (Sentry)
- [ ] Crie dois projetos no Sentry (React e Node).
- [ ] Adicione as chaves no environment:
  - `VITE_SENTRY_DSN`: Para o frontend (React).
  - `SENTRY_SERVER_DSN`: Para o backend (Node).

### 5. Qualidade de Código (CI/CD)
- [ ] O projeto já conta com **Vitest** configurado. Rode `npm run test` antes de cada push.
- [ ] O **GitHub Actions** foi configurado em `.github/workflows/ci.yml` para validar cada push automaticamente.

### 6. Git Flow
O código agora já está no seu computador!
```bash
git add .
git commit -m "chore: implement observability, testing and ci/cd"
git push origin main
```
