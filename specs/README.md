# Como usar o Spec-Driven Development (SDD) no CineHub

Agora que integramos os princípios do `spec-kit`, seguiremos este fluxo para qualquer nova funcionalidade ou correção complexa:

### 1. Fase de Especificação (`specs/`)
Antes de escrever código, criamos um arquivo em `specs/nome-da-feature.spec.md`.
- **O que fazemos:** Definimos os requisitos, as histórias de usuário e as regras de negócio.
- **Por que:** Garante que eu (IA) entendi exatamente o que você quer antes de começar a mexer nos arquivos.

### 2. Fase de Planejamento (`plans/`)
Com a Spec aprovada, criamos um `plans/nome-da-feature.plan.md`.
- **O que fazemos:** Listamos os arquivos que serão alterados, as novas tabelas no banco e a lógica técnica.
- **Por que:** Evita bugs de integração e quebra de RLS.

### 3. Fase de Execução (`tasks/`)
O plano é quebrado em tarefas pequenas.
- **O que fazemos:** Implementamos um passo de cada vez.
- **Por que:** Facilita o teste e a correção rápida se algo der errado.

### 4. A Constituição (`CONSTITUTION.md`)
Sempre que tivermos dúvida sobre "como" algo deve ser feito (ex: qual cor usar? como proteger o dado?), consultamos a `CONSTITUTION.md`.

---
**Dica:** Sempre que quiser começar algo novo, diga: *"Crie uma spec para [funcionalidade]"*.
