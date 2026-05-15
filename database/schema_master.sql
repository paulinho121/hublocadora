-- ==============================================================================
-- CINEHUB MASTER SCHEMA: CONSOLIDATED DATABASE DEFINITION
-- VERSION: 2.2 (Security Hardening & Multi-Tenant Fix)
-- DATE: 2026-05-11 (Phase 2 - Logistics Restoration)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- RPC: Verify delivery token (Nuclear Security: Only fulfiller or admin can verify)
DROP FUNCTION IF EXISTS public.verify_delivery_token(uuid, text);
CREATE OR REPLACE FUNCTION public.verify_delivery_token(p_delivery_id uuid, p_token text)
RETURNS boolean AS $$
BEGIN
    -- Check if token matches AND the caller is the assigned fulfiller (or admin)
    IF EXISTS (
        SELECT 1 FROM public.delivery_secrets s
        JOIN public.deliveries d ON s.delivery_id = d.id
        WHERE s.delivery_id = p_delivery_id 
        AND s.token = p_token
        AND (
            d.fulfilling_company_id = public.get_my_company_id() 
            OR d.origin_branch_id = public.get_my_branch_id()
            OR public.check_is_admin()
        )
    ) THEN
        UPDATE public.deliveries SET status = 'delivered' WHERE id = p_delivery_id;
        RETURN true;
    END IF;

    RETURN false;
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

-- Function: Calculate Booking Total (Server-side Source of Truth)
CREATE OR REPLACE FUNCTION public.calculate_booking_total()
RETURNS TRIGGER AS $$
DECLARE
    v_daily_rate numeric;
    v_days integer;
BEGIN
    -- 1. Buscar a diária real do equipamento no banco (ignora o que vem do frontend)
    SELECT daily_rate INTO v_daily_rate FROM public.equipments WHERE id = NEW.equipment_id;
    
    IF v_daily_rate IS NULL THEN
        RAISE EXCEPTION 'Equipamento não encontrado para cálculo de preço.';
    END IF;

    -- 2. Calcular número de dias (mínimo 1 dia)
    v_days := GREATEST(NEW.end_date - NEW.start_date, 1);
    
    -- 3. Definir o valor real
    NEW.total_amount := v_daily_rate * v_days;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Orchestrate fulfillment across multiple sources
CREATE OR REPLACE FUNCTION public.orchestrate_fulfillment(p_booking_id uuid)
RETURNS void AS $$
DECLARE
    v_booking_record record;
    v_delivery_id uuid;
BEGIN
    -- 1. Buscar dados da reserva
    SELECT b.id, b.quantity, b.company_id, b.equipment_id 
    INTO v_booking_record
    FROM public.bookings b
    WHERE b.id = p_booking_id;

    -- 2. Criar a Entrega Principal (Fulfillment Primário)
    -- Por enquanto, simplificamos criando uma entrega para a empresa dona do item.
    -- Futuramente, a lógica de sub-locação cross-tenant pode ser expandida aqui.
    
    INSERT INTO public.deliveries (booking_id, fulfilling_company_id, quantity, fulfillment_type, status)
    VALUES (v_booking_record.id, v_booking_record.company_id, v_booking_record.quantity, 'primary', 'pending')
    RETURNING id INTO v_delivery_id;
    
    -- 3. Gerar token de segurança automático para esta entrega
    INSERT INTO public.delivery_secrets (delivery_id, token, type) 
    VALUES (v_delivery_id, lpad(floor(random() * 10000)::text, 4, '0'), 'collection');

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
    company_id uuid CONSTRAINT profiles_company_id_fkey REFERENCES public.companies(id), -- Linked company (for owners/employees)
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
    quantity integer DEFAULT 1,
    status text CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Deliveries (Real-time Logistics)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) NOT NULL, -- Removido UNIQUE para suportar N origens
    fulfilling_company_id uuid REFERENCES public.companies(id),
    origin_branch_id uuid REFERENCES public.branches(id),
    quantity integer DEFAULT 1, -- Quantidade vinda desta origem específica
    fulfillment_type text DEFAULT 'primary', -- 'primary' ou 'subrental'
    driver_name text,
    driver_phone text,
    status text DEFAULT 'pending',
    CONSTRAINT deliveries_status_check CHECK (status IN ('pending', 'picking', 'ready', 'shipped', 'delivered', 'confirmed', 'cancelled')),
    current_lat numeric,
    current_lng numeric,
    estimated_arrival timestamp with time zone,
    -- Reverse Logistics
    reverse_logistics_status text CHECK (reverse_logistics_status IN ('not_started', 'requested', 'collecting', 'in_transit', 'returned', 'completed', 'cancelled')) DEFAULT 'not_started',
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

-- Favorites (Wishlist)
CREATE TABLE IF NOT EXISTS public.favorites (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    equipment_id uuid REFERENCES public.equipments(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, equipment_id)
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

-- Delivery Secrets (One per fulfillment task)
CREATE TABLE IF NOT EXISTS public.delivery_secrets (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    delivery_id uuid REFERENCES public.deliveries(id) ON DELETE CASCADE NOT NULL UNIQUE,
    token text NOT NULL DEFAULT lpad(floor(random() * 10000)::text, 4, '0'),
    type text DEFAULT 'collection', -- 'collection' (Coleta na Locadora) ou 'delivery' (Entrega ao Cliente)
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
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_secrets ENABLE ROW LEVEL SECURITY;

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
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = bookings.renter_id AND p.company_id = public.get_my_company_id())
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
        OR EXISTS (
            SELECT 1 FROM public.bookings b 
            LEFT JOIN public.profiles p ON b.renter_id = p.id
            WHERE b.id = deliveries.booking_id 
            AND (
                b.renter_id = auth.uid() 
                OR b.company_id = public.get_my_company_id()
                OR p.company_id = public.get_my_company_id()
            )
        )
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

-- 7. EQUIPMENT STOCK POLICIES
DROP POLICY IF EXISTS "Equipment_Stock_Access" ON public.equipment_stock;
CREATE POLICY "Equipment_Stock_Access" ON public.equipment_stock
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.branches b WHERE b.id = branch_id AND (b.company_id = public.get_my_company_id() OR b.manager_email = auth.jwt() ->> 'email'))
        OR public.check_is_admin()
    );

-- 8. INTERNAL TRANSFERS POLICIES
DROP POLICY IF EXISTS "Internal_Transfers_Access" ON public.internal_transfers;
CREATE POLICY "Internal_Transfers_Access" ON public.internal_transfers
    FOR ALL TO authenticated
    USING (
        company_id = public.get_my_company_id()
        OR EXISTS (SELECT 1 FROM public.branches b WHERE (b.id = source_branch_id OR b.id = requester_branch_id) AND b.manager_email = auth.jwt() ->> 'email')
        OR public.check_is_admin()
    );

-- 9. PAYMENTS POLICIES
DROP POLICY IF EXISTS "Payments_Access" ON public.payments;
CREATE POLICY "Payments_Access" ON public.payments
    FOR SELECT TO authenticated
    USING (
        tenant_id = public.get_my_company_id()
        OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.renter_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = b.renter_id AND p.company_id = public.get_my_company_id())))
        OR public.check_is_admin()
    );

-- 10. NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Notifications_Owner" ON public.notifications;
CREATE POLICY "Notifications_Owner" ON public.notifications
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.check_is_admin());

-- 11. LOGISTICS TRACKING POLICIES
DROP POLICY IF EXISTS "Logistics_Tracking_Access" ON public.logistics_tracking;
CREATE POLICY "Logistics_Tracking_Access" ON public.logistics_tracking
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.company_id = public.get_my_company_id() OR b.renter_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = b.renter_id AND p.company_id = public.get_my_company_id())))
        OR checkout_inspector_id = auth.uid()
        OR checkin_inspector_id = auth.uid()
        OR public.check_is_admin()
    );

-- 12. FAVORITES POLICIES
DROP POLICY IF EXISTS "Favorites_Owner_All" ON public.favorites;
CREATE POLICY "Favorites_Owner_All" ON public.favorites
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 13. DELIVERY SECRETS POLICIES (Renter Only)
DROP POLICY IF EXISTS "Delivery_Secrets_Renter" ON public.delivery_secrets;
CREATE POLICY "Delivery_Secrets_Renter" ON public.delivery_secrets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.deliveries d
            JOIN public.bookings b ON d.booking_id = b.id
            WHERE d.id = delivery_secrets.delivery_id 
            AND (
                b.renter_id = auth.uid() 
                OR b.company_id = public.get_my_company_id()
                OR public.check_is_admin()
            )
        )
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

-- Function: Handle Inventory on Booking Status Change
CREATE OR REPLACE FUNCTION public.handle_booking_inventory_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o pedido foi cancelado, podemos querer disparar um alerta ou log (o estoque no HUB é virtual/calculado, mas se houver estoque físico em branches, aqui seria o lugar de devolver)
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Lógica de restauração de estoque físico se necessário
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Price Protection (Prevents price tampering from frontend)
DROP TRIGGER IF EXISTS trg_calculate_booking_total ON public.bookings;
CREATE TRIGGER trg_calculate_booking_total
    BEFORE INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_booking_total();

-- Function: Auto-orchestrate on approval
CREATE OR REPLACE FUNCTION public.handle_booking_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        PERFORM public.orchestrate_fulfillment(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On Booking Approved
DROP TRIGGER IF EXISTS trg_on_booking_approved ON public.bookings;
CREATE TRIGGER trg_on_booking_approved
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
    EXECUTE FUNCTION public.handle_booking_approval();

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
