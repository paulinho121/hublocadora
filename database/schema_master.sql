-- ==============================================================================
-- CINEHUB MASTER SCHEMA: CONSOLIDATED DATABASE DEFINITION
-- VERSION: 2.0 (Post-V12 Network Unlock)
-- DATE: 2026-05-11
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. CORE FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- Get the company ID for the current authenticated user (Owner, Admin or Branch Manager)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
    DECLARE
        comp_id uuid;
    BEGIN
        -- 1. Try from profile (Owner/Admin)
        SELECT company_id INTO comp_id FROM public.profiles WHERE id = auth.uid();
        
        -- 2. If not found, try from branch (Branch Manager)
        IF comp_id IS NULL THEN
            SELECT company_id INTO comp_id 
            FROM public.branches 
            WHERE manager_email = auth.jwt() ->> 'email' 
            LIMIT 1;
        END IF;
        
        RETURN comp_id;
    END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get the branch ID for the current user if they are a manager
CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS uuid AS $$
    SELECT id FROM public.branches 
    WHERE manager_email = auth.jwt() ->> 'email' 
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- RPC: Get branch details by invite token (Publicly accessible helper)
CREATE OR REPLACE FUNCTION public.get_branch_by_token(p_token text)
RETURNS json AS $$
DECLARE
    v_branch record;
BEGIN
    SELECT id, name, company_id, manager_email INTO v_branch 
    FROM public.branches 
    WHERE invite_token = p_token AND status = 'invited';
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_branch);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Accept branch invite and link user to company
CREATE OR REPLACE FUNCTION public.accept_branch_invite(p_token text)
RETURNS boolean AS $$
DECLARE
    v_branch record;
BEGIN
    -- Find branch by token
    SELECT * INTO v_branch FROM public.branches WHERE invite_token = p_token AND status = 'invited';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Convite inválido ou já utilizado.';
    END IF;

    -- Update the newly created profile to belong to the company
    UPDATE public.profiles
    SET company_id = v_branch.company_id,
        role = 'rental_house'
    WHERE id = auth.uid();

    -- Set branch status to active
    UPDATE public.branches
    SET status = 'active'
    WHERE id = v_branch.id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check access to a delivery based on booking ID
CREATE OR REPLACE FUNCTION public.check_delivery_access(b_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.deliveries d
    LEFT JOIN public.companies c ON d.fulfilling_company_id = c.id
    LEFT JOIN public.branches br ON d.origin_branch_id = br.id
    WHERE d.booking_id = b_id 
    AND (
        c.owner_id = auth.uid() 
        OR br.manager_email = auth.jwt() ->> 'email'
        OR d.fulfilling_company_id = public.get_my_company_id()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if current user owns the company that made the booking
CREATE OR REPLACE FUNCTION public.check_booking_ownership(b_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.companies c ON b.company_id = c.id
    WHERE b.id = b_id AND (c.owner_id = auth.uid() OR b.company_id = public.get_my_company_id())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if current user is the renter of a booking
CREATE OR REPLACE FUNCTION public.check_renter_access(b_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = b_id AND renter_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. TABLES DEFINITION
-- ==============================================================================

-- Profiles (Extension of auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    email text NOT NULL,
    full_name text,
    role text CHECK (role IN ('client', 'rental_house', 'production_company', 'admin')) DEFAULT 'client',
    company_id uuid, -- Linked company (for owners/employees)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Companies (Tenants)
CREATE TABLE IF NOT EXISTS public.companies (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id uuid REFERENCES public.profiles(id) NOT NULL,
    name text NOT NULL,
    document text NOT NULL, -- CNPJ/CPF
    description text,
    logo_url text,
    status text DEFAULT 'active',
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    address_zip text,
    parent_company_id uuid REFERENCES public.companies(id), -- Link to Super User/Master Company
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Branches (Units / Units of the Company)
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    address text,
    city text,
    state text,
    manager_email text,
    document text,
    phone text,
    invite_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    status text DEFAULT 'active' CHECK (status IN ('invited', 'active', 'inactive')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    icon text,
    created_at timestamptz DEFAULT now()
);

-- Ensure icon column exists if table was created in an older version
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text;

-- Equipments (Inventory)
CREATE TABLE IF NOT EXISTS public.equipments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    daily_rate numeric NOT NULL,
    serial_number text,
    condition text CHECK (condition IN ('excellent', 'good', 'fair', 'maintenance')) DEFAULT 'excellent',
    status text CHECK (status IN ('available', 'rented', 'maintenance', 'unavailable')) DEFAULT 'available',
    images text[] DEFAULT '{}',
    features jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Equipment Stock (Quantity per Branch)
CREATE TABLE IF NOT EXISTS public.equipment_stock (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id uuid REFERENCES public.equipments(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    quantity integer DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(equipment_id, branch_id)
);

-- Bookings (Orders)
CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_id uuid REFERENCES public.equipments(id) NOT NULL,
    renter_id uuid REFERENCES public.profiles(id) NOT NULL,
    company_id uuid REFERENCES public.companies(id) NOT NULL,
    subrental_company_id uuid REFERENCES public.companies(id), -- For B2B fulfillment
    origin_branch_id uuid REFERENCES public.branches(id),
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_amount numeric NOT NULL,
    status text CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Deliveries (Real-time Logistics)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) NOT NULL UNIQUE,
    fulfilling_company_id uuid REFERENCES public.companies(id),
    origin_branch_id uuid REFERENCES public.branches(id),
    driver_name text,
    driver_phone text,
    status text CHECK (status IN ('pending', 'picking', 'ready', 'shipped', 'delivered', 'confirmed', 'cancelled')) DEFAULT 'pending',
    current_lat numeric,
    current_lng numeric,
    estimated_arrival timestamp with time zone,
    -- Reverse Logistics
    reverse_logistics_status text CHECK (reverse_logistics_status IN ('not_started', 'requested', 'collecting', 'in_transit', 'returned', 'cancelled')) DEFAULT 'not_started',
    reverse_logistics_address text,
    reverse_logistics_branch_id uuid REFERENCES public.branches(id),
    reverse_driver_name text,
    reverse_driver_phone text,
    reverse_token text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Internal Transfers
CREATE TABLE IF NOT EXISTS public.internal_transfers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) NOT NULL,
    equipment_id uuid REFERENCES public.equipments(id) NOT NULL,
    source_branch_id uuid REFERENCES public.branches(id),
    requester_branch_id uuid REFERENCES public.branches(id),
    quantity integer DEFAULT 1,
    status text CHECK (status IN ('pending', 'approved', 'shipped', 'completed', 'rejected')) DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) NOT NULL,
    tenant_id uuid REFERENCES public.companies(id) NOT NULL,
    amount numeric NOT NULL,
    payment_method text NOT NULL, -- 'pix', 'credit_card', 'gateway'
    status text CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')) DEFAULT 'pending',
    external_id text,
    qr_code text,
    qr_code_base64 text,
    payment_link text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Financial Transactions (B2B Payouts)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    master_company_id UUID REFERENCES public.companies(id),
    partner_company_id UUID REFERENCES public.companies(id),
    total_amount NUMERIC NOT NULL,
    master_fee NUMERIC NOT NULL,
    partner_amount NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Network Logs (Asset Tracking)
CREATE TABLE IF NOT EXISTS public.network_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_id UUID REFERENCES public.equipments(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    origin_company_id UUID REFERENCES public.companies(id),
    destination_company_id UUID REFERENCES public.companies(id),
    action_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) NOT NULL UNIQUE,
    equipment_id uuid REFERENCES public.equipments(id) NOT NULL,
    renter_id uuid REFERENCES public.profiles(id) NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment text,
    images text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Logistics Tracking (Manual Inspector logs)
CREATE TABLE IF NOT EXISTS public.logistics_tracking (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) NOT NULL,
    status text CHECK (status IN ('ready_for_pickup', 'checked_out', 'returned', 'damages_found', 'completed')) DEFAULT 'ready_for_pickup',
    checkout_inspector_id uuid REFERENCES public.profiles(id),
    checkin_inspector_id uuid REFERENCES public.profiles(id),
    checkout_at timestamp with time zone,
    checkin_at timestamp with time zone,
    checkout_notes text,
    checkin_notes text,
    checkout_images text[] DEFAULT '{}',
    checkin_images text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_tracking ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles_Select" ON public.profiles;
CREATE POLICY "Profiles_Select" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() 
        OR company_id = public.get_my_company_id()
        OR public.check_is_admin()
    );

DROP POLICY IF EXISTS "Profiles_Update_Self" ON public.profiles;
CREATE POLICY "Profiles_Update_Self" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND (
            -- Bloqueia alteração de cargo ou empresa pelo próprio usuário para evitar fraude
            (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
            AND (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
        )
    );

-- 2. COMPANIES POLICIES
DROP POLICY IF EXISTS "Companies_Select" ON public.companies;
CREATE POLICY "Companies_Select" ON public.companies
    FOR SELECT TO authenticated
    USING (
        status = 'active' -- Qualquer um vê empresas ativas
        OR owner_id = auth.uid() 
        OR id = public.get_my_company_id()
        OR parent_company_id = public.get_my_company_id()
        OR public.check_is_admin()
    );

DROP POLICY IF EXISTS "Companies_Update" ON public.companies;
CREATE POLICY "Companies_Update" ON public.companies
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid() OR public.check_is_admin())
    WITH CHECK (
        -- Bloqueia alteração do vínculo de rede para evitar roubo de tenant
        (parent_company_id = (SELECT parent_company_id FROM public.companies WHERE id = companies.id))
        OR public.check_is_admin()
    );

-- 3. BRANCHES POLICIES
DROP POLICY IF EXISTS "Branches_Access" ON public.branches;
CREATE POLICY "Branches_Access" ON public.branches
    FOR ALL TO authenticated
    USING (
        company_id = public.get_my_company_id() 
        OR manager_email = auth.jwt() ->> 'email'
        OR public.check_is_admin()
    );

-- 4. EQUIPMENTS POLICIES
DROP POLICY IF EXISTS "Equipments_Select" ON public.equipments;
CREATE POLICY "Equipments_Select" ON public.equipments
    FOR SELECT TO authenticated
    USING (
        status != 'unavailable' -- Visível para o Marketplace
        OR company_id = public.get_my_company_id()
        OR EXISTS (
            SELECT 1 FROM public.companies 
            WHERE id = equipments.company_id AND parent_company_id = public.get_my_company_id()
        )
        OR public.check_is_admin()
    );

DROP POLICY IF EXISTS "Equipments_Modify" ON public.equipments;
CREATE POLICY "Equipments_Modify" ON public.equipments
    FOR ALL TO authenticated
    USING (company_id = public.get_my_company_id() OR public.check_is_admin());

-- 5. BOOKINGS POLICIES
DROP POLICY IF EXISTS "Bookings_Select" ON public.bookings;
CREATE POLICY "Bookings_Select" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        company_id = public.get_my_company_id()
        OR renter_id = auth.uid()
        OR public.check_delivery_access(id)
        OR public.check_is_admin()
    );

DROP POLICY IF EXISTS "Bookings_Insert" ON public.bookings;
CREATE POLICY "Bookings_Insert" ON public.bookings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = renter_id OR public.check_is_admin());

-- 6. DELIVERIES POLICIES
DROP POLICY IF EXISTS "Deliveries_Select" ON public.deliveries;
CREATE POLICY "Deliveries_Select" ON public.deliveries
    FOR SELECT TO authenticated
    USING (
        fulfilling_company_id = public.get_my_company_id()
        OR origin_branch_id = public.get_my_branch_id()
        OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = deliveries.booking_id AND (b.renter_id = auth.uid() OR b.company_id = public.get_my_company_id()))
        OR public.check_is_admin()
    );

DROP POLICY IF EXISTS "Deliveries_Update" ON public.deliveries;
CREATE POLICY "Deliveries_Update" ON public.deliveries
    FOR UPDATE TO authenticated
    USING (
        fulfilling_company_id = public.get_my_company_id()
        OR origin_branch_id = public.get_my_branch_id()
        OR public.check_is_admin()
    );

-- 5. TRIGGERS & AUTOMATION
-- ==============================================================================

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropping existing triggers to avoid "already exists" errors
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS tr_branches_updated_at ON public.branches;
DROP TRIGGER IF EXISTS tr_deliveries_updated_at ON public.deliveries;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. REALTIME PUBLICATION
-- ==============================================================================
DO $$ 
BEGIN
  -- Create publication if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Add tables only if they are not already members
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'deliveries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'internal_transfers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_transfers;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 7. INITIAL DATA (CATEGORIES)
-- ==============================================================================
INSERT INTO public.categories (name, slug, icon)
SELECT * FROM (VALUES 
    ('Câmeras', 'cameras', 'Camera'),
    ('Lentes', 'lentes', 'Focus'),
    ('Iluminação', 'iluminacao', 'Sun'),
    ('Áudio', 'audio', 'Mic'),
    ('Acessórios', 'acessorios', 'Settings'),
    ('Grip', 'grip', 'Anchor')
) AS t(name, slug, icon)
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories 
    WHERE name = t.name OR slug = t.slug
);
