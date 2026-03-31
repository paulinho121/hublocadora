-- Tabela de Pagamentos (Conexão com Mercado Pago / Stripe)
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) not null,
  tenant_id uuid references public.companies(id) not null,
  amount numeric not null,
  payment_method text not null, -- 'pix', 'credit_card', 'gateway'
  status text check (status in ('pending', 'approved', 'rejected', 'refunded')) default 'pending',
  external_id text, -- ID do Mercado Pago ou Stripe
  qr_code text, -- Para pagamentos PIX
  qr_code_base64 text,
  payment_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Logística (O Coração da Operação)
create table if not exists public.logistics_tracking (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) not null,
  status text check (status in ('ready_for_pickup', 'checked_out', 'returned', 'damages_found', 'completed')) default 'ready_for_pickup',
  checkout_inspector_id uuid references public.profiles(id),
  checkin_inspector_id uuid references public.profiles(id),
  checkout_at timestamp with time zone,
  checkin_at timestamp with time zone,
  checkout_notes text,
  checkin_notes text,
  checkout_images text[] default '{}',
  checkin_images text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Avaliações
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) not null unique,
  equipment_id uuid references public.equipments(id) not null,
  renter_id uuid references public.profiles(id) not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  images text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Notificações
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  message text not null,
  type text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
