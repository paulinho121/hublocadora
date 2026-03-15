import { Card, CardContent } from '@/components/ui/card';

export default function Docs() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Arquitetura do Sistema CINEHUB</h1>
        <p className="text-xl text-muted-foreground">
          Documentação técnica completa do marketplace de equipamentos audiovisuais.
        </p>
      </div>

      <div className="prose prose-invert prose-emerald max-w-none">
        
        <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">1. Visão Geral da Arquitetura</h2>
            <p className="mb-4">
              O CINEHUB é um marketplace B2B/B2C projetado para alta escalabilidade e disponibilidade. A arquitetura segue o padrão de microsserviços modulares (Modular Monolith inicialmente, preparado para extração), utilizando Node.js (NestJS) no backend e Next.js 14 (App Router) no frontend.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-zinc-300">
              <li><strong>Frontend (Client/Locadora/Admin):</strong> Next.js 14 com Server Components para SEO e performance. TailwindCSS + ShadCN UI para design system.</li>
              <li><strong>Backend API:</strong> NestJS (Node.js) fornecendo uma API RESTful robusta, com Swagger para documentação.</li>
              <li><strong>Banco de Dados:</strong> PostgreSQL gerenciado via Prisma ORM.</li>
              <li><strong>Cache & Filas:</strong> Redis para cache de buscas de equipamentos e filas de processamento assíncrono (ex: envio de emails, processamento de imagens).</li>
              <li><strong>Pagamentos:</strong> Stripe Connect para split payment automático entre Plataforma (CINEHUB) e Locadoras.</li>
              <li><strong>Infraestrutura:</strong> AWS (ECS/EKS para containers, RDS para banco, S3 + CloudFront para assets).</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">2. Diagrama Textual de Estrutura</h2>
            <pre className="bg-black/50 p-4 rounded-md text-sm text-zinc-300 overflow-x-auto border border-zinc-800">
{`[ CLIENTES (Web/Mobile) ] <---> [ CLOUDFRONT (CDN) ] <---> [ NEXT.JS FRONTEND ]
                                                                |
                                                                v
                                                        [ API GATEWAY / NGINX ]
                                                                |
                                        +-----------------------+-----------------------+
                                        |                       |                       |
                                [ NESTJS: AUTH ]        [ NESTJS: CORE ]        [ NESTJS: PAYMENTS ]
                                        |                       |                       |
                                        +-----------------------+-----------------------+
                                                                |
                                        +-----------------------+-----------------------+
                                        |                       |                       |
                                [ POSTGRESQL ]              [ REDIS ]               [ AWS S3 ]
                                (Prisma ORM)             (Cache/Queues)         (Imagens/Docs)
                                        |
                                [ STRIPE CONNECT ]
                                (Split Payment)`}
            </pre>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">3. Modelagem de Banco de Dados (SQL/Prisma)</h2>
            <p className="mb-4">O esquema principal projetado para o PostgreSQL:</p>
            <pre className="bg-black/50 p-4 rounded-md text-sm text-zinc-300 overflow-x-auto border border-zinc-800">
{`-- Tabelas Principais (Simplificado)

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "email" VARCHAR UNIQUE NOT NULL,
  "passwordHash" VARCHAR NOT NULL,
  "role" ENUM('USER', 'COMPANY_ADMIN', 'SUPER_ADMIN'),
  "stripeCustomerId" VARCHAR,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "RentalCompany" (
  "id" UUID PRIMARY KEY,
  "ownerId" UUID REFERENCES "User"("id"),
  "name" VARCHAR NOT NULL,
  "cnpj" VARCHAR UNIQUE NOT NULL,
  "stripeAccountId" VARCHAR, -- Para o Stripe Connect
  "status" ENUM('PENDING', 'APPROVED', 'SUSPENDED'),
  "commissionRate" DECIMAL DEFAULT 15.00
);

CREATE TABLE "Equipment" (
  "id" UUID PRIMARY KEY,
  "companyId" UUID REFERENCES "RentalCompany"("id"),
  "categoryId" UUID REFERENCES "Category"("id"),
  "name" VARCHAR NOT NULL,
  "description" TEXT,
  "dailyPrice" DECIMAL NOT NULL,
  "insuranceValue" DECIMAL,
  "status" ENUM('AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'),
  "deletedAt" TIMESTAMP -- Soft delete
);

CREATE TABLE "Booking" (
  "id" UUID PRIMARY KEY,
  "userId" UUID REFERENCES "User"("id"),
  "equipmentId" UUID REFERENCES "Equipment"("id"),
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "totalAmount" DECIMAL NOT NULL,
  "platformFee" DECIMAL NOT NULL,
  "status" ENUM('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'),
  "stripePaymentIntentId" VARCHAR
);`}
            </pre>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">4. Estrutura de Pastas do Backend (NestJS)</h2>
            <pre className="bg-black/50 p-4 rounded-md text-sm text-zinc-300 overflow-x-auto border border-zinc-800">
{`cinehub-backend/
├── prisma/
│   ├── schema.prisma        # Modelagem do banco
│   └── migrations/
├── src/
│   ├── modules/
│   │   ├── auth/            # JWT, Guards, Strategies
│   │   ├── users/           # Gestão de usuários
│   │   ├── companies/       # Gestão de locadoras (KYC)
│   │   ├── equipments/      # CRUD, Busca, Filtros
│   │   ├── bookings/        # Lógica de reserva, overbooking
│   │   ├── payments/        # Integração Stripe Connect
│   │   └── logistics/       # Cálculo de frete/distância
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/         # Exception filters
│   │   └── interceptors/
│   ├── config/              # Variáveis de ambiente
│   ├── app.module.ts
│   └── main.ts              # Entry point, Swagger setup
├── test/                    # E2E tests
├── Dockerfile
└── docker-compose.yml       # Postgres + Redis local`}
            </pre>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">5. Estrutura de Pastas do Frontend (Next.js)</h2>
            <pre className="bg-black/50 p-4 rounded-md text-sm text-zinc-300 overflow-x-auto border border-zinc-800">
{`cinehub-frontend/
├── src/
│   ├── app/                 # App Router (Next.js 14)
│   │   ├── (public)/        # Rotas abertas (Marketplace)
│   │   │   ├── page.tsx     # Home / Busca
│   │   │   └── equipment/[id]/page.tsx
│   │   ├── (auth)/          # Login / Register
│   │   ├── dashboard/       # Painel da Locadora
│   │   └── admin/           # Painel do Gestor (Super Admin)
│   ├── components/
│   │   ├── ui/              # ShadCN UI components
│   │   ├── shared/          # Navbar, Footer, Cards
│   │   └── forms/           # React Hook Form + Zod
│   ├── lib/
│   │   ├── api.ts           # Axios instance
│   │   ├── utils.ts         # Tailwind merge, etc
│   │   └── stripe.ts        # Stripe.js setup
│   ├── hooks/               # Custom React hooks
│   └── types/               # TypeScript interfaces
├── tailwind.config.ts
└── middleware.ts            # Proteção de rotas (JWT check)`}
            </pre>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">6. Fluxo Completo de Reserva & Pagamento (Split)</h2>
            <ol className="list-decimal pl-6 space-y-4 text-zinc-300">
              <li><strong>Busca:</strong> Usuário busca "Lente Cooke em SP". Frontend consulta a API, que usa Redis para cache e Postgres (PostGIS) para proximidade.</li>
              <li><strong>Seleção:</strong> Usuário escolhe as datas. O backend verifica a tabela <code>Booking</code> para garantir que não há sobreposição (proteção contra overbooking).</li>
              <li><strong>Checkout:</strong> Usuário adiciona seguro opcional e frete. O backend calcula o total.</li>
              <li><strong>Stripe Connect (Split):</strong>
                <ul className="list-disc pl-6 mt-2 text-zinc-400">
                  <li>O backend cria um <code>PaymentIntent</code> no Stripe.</li>
                  <li>Define o <code>transfer_data.destination</code> para o <code>stripeAccountId</code> da Locadora.</li>
                  <li>Define o <code>application_fee_amount</code> (ex: 15% da plataforma).</li>
                </ul>
              </li>
              <li><strong>Confirmação:</strong> O pagamento é capturado. O Stripe repassa 85% para a Locadora e 15% para o CINEHUB automaticamente. O status da reserva muda para <code>CONFIRMED</code>.</li>
            </ol>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">7. Plano de Deploy & Roadmap</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Plano de Deploy (AWS)</h3>
                <ul className="list-disc pl-6 text-zinc-300 space-y-1">
                  <li><strong>CI/CD:</strong> GitHub Actions rodando testes, lint e build.</li>
                  <li><strong>Frontend:</strong> Vercel (ideal para Next.js) ou AWS Amplify.</li>
                  <li><strong>Backend:</strong> Imagem Docker hospedada no ECR, rodando no AWS ECS (Fargate) para auto-scaling.</li>
                  <li><strong>Database:</strong> AWS RDS (PostgreSQL) com Multi-AZ para alta disponibilidade.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Roadmap de Evolução</h3>
                <ul className="list-disc pl-6 text-zinc-300 space-y-1">
                  <li><strong>Fase 1 (MVP):</strong> Busca, Reserva, Pagamento Split, Dashboard Básico.</li>
                  <li><strong>Fase 2:</strong> Sistema de Logística integrado (Lalamove/Loggi API), Seguros integrados via API de seguradora.</li>
                  <li><strong>Fase 3:</strong> App Mobile (React Native) para locatários e locadoras (leitura de QR Code para check-in/check-out de equipamentos).</li>
                  <li><strong>Fase 4:</strong> IA para recomendação de kits de equipamentos baseados no roteiro do usuário.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
