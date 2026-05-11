-- Tabela de Perfil de Usuários (Extensão do auth.users do Supabase)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  role text check (role in ('client', 'rental_house', 'production_company', 'admin')) default 'client',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Locadoras / Empresas
create table public.companies (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) not null,
  name text not null,
  document text not null, -- CNPJ/CPF
  description text,
  logo_url text,
  address_street text not null,
  address_number text not null,
  address_complement text,
  address_neighborhood text not null,
  address_city text not null,
  address_state text not null,
  address_zip text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Equipamentos / Inventário
create table public.equipments (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) not null,
  name text not null,
  category text not null,
  description text not null,
  daily_rate numeric not null,
  condition text check (condition in ('excellent', 'good', 'fair', 'maintenance')) default 'good',
  status text check (status in ('available', 'rented', 'maintenance', 'unavailable')) default 'available',
  images text[] default '{}',
  features jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Reservas
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  equipment_id uuid references public.equipments(id) not null,
  renter_id uuid references public.profiles(id) not null,
  company_id uuid references public.companies(id) not null,
  start_date date not null,
  end_date date not null,
  total_amount numeric not null,
  status text check (status in ('pending', 'approved', 'rejected', 'active', 'completed', 'cancelled')) default 'pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) - Regras de Acesso Básicas --------------------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.equipments enable row level security;
alter table public.bookings enable row level security;

-- Lendo equipamentos e empresas é público (marketplace)
create policy "Equipments are viewable by everyone" on public.equipments for select using (true);
create policy "Companies are viewable by everyone" on public.companies for select using (true);

-- Donos podem inserir, alterar e deletar seus equipamentos
create policy "Companies can insert own equipments" on public.equipments for insert with check (auth.uid() in (select owner_id from public.companies where id = company_id));
create policy "Companies can update own equipments" on public.equipments for update using (auth.uid() in (select owner_id from public.companies where id = company_id));

-- Usuário pode ver suas próprias reservas
create policy "Users can view own bookings" on public.bookings for select using (auth.uid() = renter_id or auth.uid() in (select owner_id from public.companies where id = company_id));
