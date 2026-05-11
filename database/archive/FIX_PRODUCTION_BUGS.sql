-- ================================================================
-- FIX: ESTABILIZAÇÃO DE PRODUÇÃO (RLS + PERFIS + CONFLITOS)
-- Resolve Erros 406 (Not Acceptable) e 409 (Conflict) nas reservas
-- ================================================================

-- 1. GARANTIR QUE TODOS OS USUÁRIOS TÊM PERFIL (Evita Erro 409 - FK Violation)
-- Se o usuário foi purgado do public mas existe no auth, restauramos o perfil básico
INSERT INTO public.profiles (id, email, role, full_name)
SELECT id, email, 'client', split_part(email, '@', 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. LIMPEZA TOTAL DE POLÍTICAS CONFLITANTES
-- Removemos as que usam funções recursivas que causam o erro 406
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', pol.policyname);
    END LOOP;
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'deliveries' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.deliveries', pol.policyname);
    END LOOP;
END $$;

-- 3. FUNÇÕES AUXILIARES SEGURAS (SECURITY DEFINER)
-- Usamos SECURITY DEFINER para quebrar a recursão circular entre tabelas

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.check_user_is_fulfilling(b_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deliveries 
    WHERE booking_id = b_id 
    AND fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.check_user_owns_booking(b_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = b_id 
    AND (
      company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      OR renter_id = auth.uid()
    )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. NOVAS POLÍTICAS DEFINITIVAS PARA BOOKINGS
CREATE POLICY "Booking_Access_V9" ON public.bookings
    FOR ALL TO authenticated
    USING (
        renter_id = auth.uid()                             -- Eu aluguei
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) -- Eu sou o dono (rental)
        OR public.check_user_is_fulfilling(id)             -- Eu sou a sub-locadora designada (via function segura)
        OR public.check_is_admin()                         -- Eu sou admin
    )
    WITH CHECK (
        renter_id = auth.uid()                             -- Posso criar se for o locatário
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) -- Ou se for a locadora (manual)
        OR public.check_is_admin()
    );

-- 5. NOVAS POLÍTICAS DEFINITIVAS PARA DELIVERIES
CREATE POLICY "Delivery_Access_V9" ON public.deliveries
    FOR ALL TO authenticated
    USING (
        fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) -- Eu entrego
        OR public.check_user_owns_booking(booking_id)      -- Eu sou o dono/locatário do booking (via function segura)
        OR public.check_is_admin()
    )
    WITH CHECK (
        fulfilling_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR public.check_user_owns_booking(booking_id)
        OR public.check_is_admin()
    );

-- 6. GARANTIR RLS ATIVA
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. NOTIFICAÇÃO DE SUCESSO NO LOG DO SUPABASE
DO $$ BEGIN RAISE NOTICE 'RLS e Perfis estabilizados para Produção.'; END $$;
