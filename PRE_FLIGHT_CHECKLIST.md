# 🛫 Workflow de Pré-Produção e Checklist de Lançamento (QA)

Este documento descreve o fluxo ponta-a-ponta (E2E) que deve ser simulado no ambiente de pré-produção (Vercel + Supabase) para homologar a versão *Release Candidate* antes do Go-Live.

---

## 🎭 Fase 1: Setup e Isolamento (Multi-Tenant)
**Objetivo:** Garantir que o RLS (Row Level Security) não permita vazamento de dados.

1. **Conta Master:**
   - [ ] Criar ou logar com a conta `admin` principal do sistema.
   - [ ] Acessar painel de logística e certificar que a conta atua estritamente como **Observadora** (sem botões de ação e sem vizualização de tokens privados).
2. **Conta Fulfiller (Sub-locadora/Filial):**
   - [ ] Criar cadastro e aprovar como empresa locadora.
   - [ ] Adicionar um equipamento ao inventário e garantir que a foto (`updateProductImage`) salve no bucket de Storage corretamente.
3. **Conta Locatário (Cliente):**
   - [ ] Criar uma conta limpa apenas de locatário.

---

## 🛒 Fase 2: Jornada de Reserva (Booking)
**Objetivo:** Validar criação do pedido e injeção do registro logístico.

- [ ] Logar com a conta **Locatário**.
- [ ] Explorar o marketplace, favoritar equipamentos e simular comportamento padrão.
- [ ] Adicionar o equipamento recém-cadastrado do Fulfiller ao carrinho.
- [ ] Confirmar reserva, definir datas e finalizar checkout.
- [ ] Checar no banco de dados se a tabela `deliveries` gerou um token aleatório atrelado a este `booking_id`.

---

## 📦 Fase 3: A Dança da Logística (Painel Operacional)
**Objetivo:** Testar o novo fluxo restrito desenvolvido para o Painel Logístico.

*Abra duas abas anônimas (uma Fulfiller e uma Locatário) lado a lado.*

- [ ] **Fulfiller:** Acessar Logística > Aba **A Enviar**. Localizar o novo pedido e clicar em `Confirmar Recebimento` (Status `pending` → `picking`).
- [ ] **Fulfiller:** No processo de separação (`picking`), testar a inserção de um número serial manual e clicar em `Finalizar Separação` (Status `picking` → `ready`).
- [ ] **Locatário:** Acessar Logística > Aba **A Receber**. Confirmar que o Token de Segurança AGORA fica vísivel, mas sem botões de ação na tela.
- [ ] **Fulfiller:** Despachar o equipamento com o motoboy (Status `ready` → `shipped`).
- [ ] **O Teste de Fogo (Gatilho do Token):** 
   - [ ] Com o pedido "Em Trânsito", o Fulfiller deve receber o Token lido pelo Locatário.
   - [ ] O Fulfiller tenta colocar uma senha errada ("0000"). **Ação Esperada:** O RPC `verify_delivery_token` deve bloquear e emitir Alerta de Erro.
   - [ ] O Fulfiller coloca o Token correto. **Ação Esperada:** Status avança para Entregue (`delivered`).
- [ ] **Locatário:** Recebe e analisa o material físico e clica no botão final de aceite.
- [ ] **Verificação Mestra:** Garantir que o pedido sumiu visualmente das abas ativas e que no Supabase o status de `bookings` virou `completed`.

---

## 🤖 Fase 4: Integrações de Infraestrutura (IA e Storage)
**Objetivo:** Validar os últimos gargalos estruturais e upgrades (Gemini 2.5).

- [ ] **Upload de Documento (IA):** Enviar um PDF (orçamento/identidade) em algum processo que envolva validação e analisar se o modelo *gemini-2.5-flash* está processando via Cloud Function (Firebase/Genkit).
- [ ] **Exportação de Contatos (MCI):** Baixar o arquivo .VCF (vCard) e verificar se o QRCode não quebra o layout da folha em versão mobile/impressa.

---

## 🚀 O Que Falta Para Virar a Chave (Lançamento)?

Se todo o fluxo acima fluir sem erros vermelhos no Console (F12) ou bloqueios, você está funcionalmente pronto! O checklist técnico faltante de infra envolve apenas:

1. **DNS e Domínios:** Mapeamento do domínio final na Vercel (garantindo os redirects corretos se existirem subdomínios `app.`).
2. **Variáveis de Ambiente Finais:** Revisar as `.env` de Produção (Vercel) para garantir que NENHUMA key seja de ambiente Sandbox (Especialmente as chaves Stripe/Pagamento se já ativadas).
3. **Limpeza de Banco de Dados:** Excluir dados mockados (pedidos de teste `ORD-0CDD...`, transfers fakes, contas de simulação) na plataforma para que o primeiro dia (Day-1) opere com os IDs zerados.
