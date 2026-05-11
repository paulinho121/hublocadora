# Modelo de Tenancy e Rede - CineHub

Este documento define a hierarquia de usuários e empresas no ecossistema CineHub.

## 1. Níveis de Acesso e Autonomia

### A. Super Usuário (Matriz / Admin Global)
*   **Papel**: Proprietário da infraestrutura e da rede principal.
*   **Capacidades**:
    *   Cadastrar novas empresas parceiras (Sub-Tenants).
    *   Atribuir equipamentos do seu estoque para empresas da rede.
    *   Visualizar relatórios consolidados de toda a rede vinculada.
*   **Identificação**: `parent_company_id` é NULL (Topo da cadeia).

### B. Minha Rede (Sub-Tenants / Parceiros Vinculados)
*   **Papel**: Empresas que operam sob o guarda-chuva do Super Usuário.
*   **Capacidades**:
    *   Possuem seu próprio `company_id` e banco de dados isolado (via RLS).
    *   Podem cadastrar equipamentos próprios que não pertencem ao Super Usuário.
    *   Recebem e gerenciam itens atribuídos pelo Super Usuário.
*   **Identificação**: `parent_company_id` aponta para o ID da empresa do Super Usuário.

### C. Locadora Independente (Tenant Isolado)
*   **Papel**: Clientes que usam o software de forma autônoma.
*   **Capacidades**:
    *   Total isolamento. Ninguém fora da empresa (exceto Admins do sistema) vê seus dados.
    *   Gerenciam seu próprio inventário e logística.
*   **Identificação**: `parent_company_id` é NULL e não possui empresas filhas.

## 2. Regras de Atribuição de Itens
*   Equipamentos da Matriz podem ser "emprestados" ou "alocados" para Sub-Tenants via a tabela `equipment_stock` ou através de transferências logísticas.
*   Itens cadastrados por um Sub-Tenant pertencem apenas a ele, a menos que o Super Usuário tenha permissão explícita de visualização configurada no RLS.

---
*Configuração de arquitetura salva em: 2026-05-11*
