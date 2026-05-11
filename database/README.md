# 🗄️ CineHub Database Management

Este diretório contém a estrutura e o histórico do banco de dados do CineHub.

## 🚀 Estrutura Atual
- **[schema_master.sql](./schema_master.sql)**: Script consolidado contendo toda a definição do banco (tabelas, funções, RLS e triggers). Este é o arquivo de referência para recriar o banco do zero.
- **/migrations/**: Futuros scripts de alteração incremental (fase de evolução).
- **/archive/**: Histórico de scripts de correção e evolução (V1 até V12).

## 🛠️ Entidades Principais
| Tabela | Descrição |
| --- | --- |
| `profiles` | Extensão de usuários com roles (admin, rental_house, etc). |
| `companies` | Locadoras e empresas parceiras (Tenants). |
| `branches` | Filiais e unidades operacionais. |
| `equipments` | Inventário de equipamentos. |
| `equipment_stock` | Controle de estoque por filial. |
| `bookings` | Reservas e pedidos. |
| `deliveries` | Logística em tempo real e rastreio. |
| `internal_transfers` | Movimentação de ativos entre filiais. |

## 🔐 Segurança (RLS)
O banco utiliza **Row Level Security (RLS)** para garantir isolamento multi-tenant:
- **Admin**: Acesso total a todos os dados.
- **Dono de Empresa**: Vê todos os dados da sua empresa e filiais.
- **Gerente de Filial**: Vê dados específicos da sua unidade e entregas relacionadas.
- **Cliente**: Vê apenas seus próprios pedidos e o catálogo público.

## 📝 Histórico Recente
- **V12 (Network Unlock)**: Liberação total para filiais gerenciarem pedidos.
- **V13 (FIX_DELIVERY_STATUS_CONSTRAINT)**: Adicionado status `confirmed` ao fluxo de logística. ✅ Consolidado no Master.

---
*Atualizado em: 2026-05-11 (Fase 2 Concluída)*
