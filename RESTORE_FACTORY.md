# Versão de Fábrica - CineHub

Este projeto foi marcado com a tag `factory-version` em 29/04/2026.

## O que está incluso nesta versão:
- **Interface Premium:** Toggle switch para visibilidade de itens.
- **Custódia Automática:** Logs silenciosos que calculam o tempo que um item passa indisponível com sub-locadoras.
- **Segurança RLS:** Autorização robusta para parceiros gerenciarem itens sem vazamento de dados ou erros 500.
- **Estabilidade:** Correção de crashes na página de detalhes de equipamentos.

## Como restaurar para esta versão:
Se você precisar voltar para este estado exato do código, peça ao Antigravity:
> "Antigravity, carregue a versão de fábrica."

Ou execute manualmente no terminal:
```bash
git reset --hard factory-version
```

**Nota:** Esta versão de fábrica protege o código-fonte. Alterações manuais no banco de dados (Supabase) devem ser reaplicadas usando os scripts `.sql` incluídos na raiz do projeto.
