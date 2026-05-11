# Política de Fluxo Logístico - CineHub

Este documento define as regras fundamentais de interação e segurança do módulo de logística. **Estas regras não devem ser alteradas sem aprovação explícita.**

## 1. Regra do Token de Segurança (Delivery Token)
*   **Propriedade**: O token de 4 dígitos gerado pelo sistema pertence ÚNICA E EXCLUSIVAMENTE ao **Solicitante** (Locatário/Renter).
*   **Finalidade**: Serve como "chave de confirmação" que o Solicitante entrega ao motorista/entregador no ato do recebimento.
*   **Exibição**: O token deve ser visível apenas na aba "Pedidos a Receber" do Solicitante. O Fulfiller (quem entrega) NUNCA deve ver o token antes de digitá-lo.

## 2. Regra da Rotina de Separação (Picking/Dispatch)
*   **Responsabilidade**: A execução da rotina (botão de "Confirmar Pedido", "Iniciar Separação", "Despachar") é de responsabilidade ÚNICA do **Atendente** (Fulfiller/Unidade de Origem).
*   **Exibição**: Os botões de ação de status devem aparecer apenas na aba "Pedidos a Enviar" de quem está processando o pedido.
*   **Solicitante**: O Solicitante tem visão passiva do progresso (Tracker), mas não possui botões para mover o status do envio.

## 3. Fluxo de Recebimento (Confirmation)
*   **Ação**: O Fulfiller é quem clica em "Confirmar Entrega".
*   **Validação**: O sistema exige que o Fulfiller digite o token fornecido pelo Solicitante. Se o token não bater, o status não muda para "Entregue".

## 4. Logística Reversa (Retorno)
*   **Token**: Na logística reversa, o token de coleta é gerado para quem está **enviando de volta** (o locatário), e quem recebe (o dono/filial) deve validá-lo na reentrada.

---
*Documento gerado em: 2026-05-11*
