# Spec: Logistics Workflow Optimization & Role Isolation

## 1. Visão Geral
Refinamento do sistema de orquestração logística para garantir segurança no manuseio de tokens (fechamento de entrega baseada em PIN), isolamento de visibilidade entre as abas operacionais ("A Enviar" vs "A Receber") e a imposição estrita de um papel de "Observador" para a conta Master.

## 2. Histórias de Usuário
* **Como um Locatário (Solicitante):** Quero ser o único a visualizar o Token de Segurança na aba "A Receber", para garantir que a entrega só seja concluída quando o equipamento estiver fisicamente comigo.
* **Como um Locatário (Solicitante):** Quero aceitar formalmente o equipamento ("Confirmar e Aceitar") para encerrar o ciclo logístico.
* **Como um Fulfiller (Unidade Expedidora):** Quero ver os pedidos que preciso despachar exclusivamente na minha aba "A Enviar", sem que eles poluam ou dupliquem na minha aba "A Receber".
* **Como um Fulfiller (Unidade Expedidora):** Quero inserir o token repassado pelo cliente quando o motoboy fizer a entrega para avançar o status para entregue.
* **Como um Administrador (Master):** Quero ter uma visão macro da malha logística na aba "A Enviar", mas quero estar impossibilitado de clicar em botões operacionais ou visualizar tokens confidenciais, atuando estritamente como fiscal.

## 3. Regras de Negócio Implementadas

### 3.1. Isolamento de Abas (Anti-Duplicação)
* **Regra Matemática:** Se um pedido (`d.id`) já se qualificou para renderização na matriz `toSendDeliveries` (A Enviar), ele está matematicamente e programaticamente proibido de aparecer em `toReceiveDeliveries` (A Receber) na mesma sessão.
* **Efeito:** Impede que um Fulfiller ou Master veja o pedido duplicado. Pedidos seguem o princípio de exclusividade de aba baseado na responsabilidade primária no momento.

### 3.2. Visibilidade do Token de Segurança (Delivery Secrets)
* **Regra Restrita:** O bloco de interface contendo o código (Ex: `1234`) é renderizado apenas se `isRenter == true && logisticsMode == 'to_receive' && !isMaster`.
* **Efeito:** Previne vazamento do PIN de confirmação para a unidade que entrega ou para os donos da plataforma. A responsabilidade da posse do token reside unicamente no recebedor da mercadoria.

### 3.3. Modo Observador (Master Account)
* **Identificação:** Usuários com `user.role === 'admin'`.
* **Regra de Visão:** Master visualiza a malha através da agregação em `toSendDeliveries` (pulando os filtros de tenant restrito).
* **Regra de Ação:** O Master é explicitamente bloqueado de renderizar a área de ações (`<Button>`). Ao invés disso, o sistema desenha um painel informativo: *"Modo Observador: Acompanhando performance de malha."*

## 4. Fluxo de Vida do Pedido (Status Transitions)
A esteira operacional no Frontend reage às seguintes condições e injeta as ações correspondentes:
1. `pending` → `picking` *(Fulfiller: "Confirmar Recebimento")*
2. `picking` → `ready` *(Fulfiller: Pode atrelar Serial Number, "Finalizar Separação")*
3. `ready` → `shipped` *(Fulfiller: "Despachar Equipamento")*
4. `shipped` → `delivered` *(Fulfiller: Insere Token, aciona RPC `verify_delivery_token`)*
5. `delivered` → `confirmed` *(Locatário: "Confirmar e Aceitar")*
6. `confirmed` → *(Sistema: Executa `UPDATE` para mover pedido raiz para History/Completed)*

## 5. Estrutura e Arquivos Envolvidos
* **Frontend:** `src/components/dashboard/LogisticsTab.tsx`
* **Backend:** Depende do RPC `verify_delivery_token` e das colunas `fulfilling_company_id`, `origin_branch_id` no banco de dados.
