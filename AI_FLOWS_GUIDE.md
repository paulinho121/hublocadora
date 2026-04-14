# 📚 CineHub AI: Documentação de Fluxos (Genkit)

Este documento descreve as capacidades de Inteligência Artificial do CineHub, alimentadas pelo **Gemini 2.5 Flash** e orquestradas via **Firebase Genkit**.

---

## 🧠 Orquestrador Principal

### `masterAssistantFlow`
É o cérebro do sistema. Ele analisa a mensagem do usuário via Processamento de Linguagem Natural (NLP) e decide qual dos sub-fluxos abaixo deve ser acionado.
- **Entrada:** Mensagem em texto livre.
- **Função:** Roteamento inteligente, extração de entidades e confirmação de intenção.

---

## 🚀 Fluxos Revolucionários (Engenharia Avançada)

### `script2GearFlow`
Transforma roteiros ou descrições de cena em listas técnicas completas.
- **Função:** Analisa o clima, horário e cenário para sugerir pacotes de Câmera, Luz e Maquinária.
- **Valor:** Redução drástica no tempo de resposta comercial para produtores.

### `techCompatibilityFlow`
O "Engenheiro de Câmera" digital.
- **Função:** Verifica se acessórios (lentes, baterias, mounts) são compatíveis com o item principal.
- **Valor:** Evita erros técnicos no set de filmagem e locações frustradas.

---

## 🛠️ Fluxos Operacionais e Comerciais

### `projectGearPlannerFlow`
Cria planejamentos estratégicos baseados no briefing.
- **Função:** Monta pacotes principais, acessórios e opções de backup baseados no orçamento e dias de filmagem.

### `rentalQuoteFlow`
Automatiza a precificação e sugestão de upsell.
- **Função:** Calcula custos aproximados e sugere upgrades vendedores.

### `bookingMatchFlow`
Consultoria técnica para sugestão de itens.
- **Função:** Busca no catálogo itens que melhor atendam a uma necessidade específica do cliente.

### `availabilityAdvisorFlow`
Consultor de estoque e prazos.
- **Função:** Checa disponibilidade e sugere substitutos imediatos para itens fora de estoque.

### `customerFollowUpFlow`
Automatização de CRM e pós-venda.
- **Função:** Gera mensagens profissionais de acompanhamento baseadas no status do aluguel.

---

## 📦 Logística e Manutenção

### `logisticsOptimizerFlow`
Eficiência no transporte.
- **Função:** Decide o melhor veículo (Moto, Carro, Van) baseado no volume e fragilidade dos itens.

### `maintenanceAnalysisFlow`
Triagem de saúde do equipamento.
- **Função:** Analisa relatórios de devolução para detectar necessidade de manutenção urgente.

---

## 📖 Marketing e Catálogo

### `catalogGeneratorFlow`
Copywriting para equipamentos.
- **Função:** Gera títulos técnicos e descrições vendedoras com foco em diretores de fotografia.

---

## 🧪 Utilidades

### `helloFlow`
Teste de sanidade do sistema.
- **Função:** Verifica se a comunicação com o Google Gemini está ativa e configurada corretamente.

---

> **Localização do Código:** Todos os fluxos residem em `src/lib/ai/flows.ts` e `masterFlow.ts`.
