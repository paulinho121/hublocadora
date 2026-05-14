-- =============================================================================
-- V16: Fix missing profiles for existing auth users + Auto-create on signup
-- PROBLEM: Users exist in auth.users but have no row in public.profiles,
--          causing "violates foreign key constraint bookings_renter_id_fkey".
-- =============================================================================

-- STEP 1: Create the trigger function that auto-creates a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'client'  -- default role for self-registered users
    )
    ON CONFLICT (id) DO NOTHING; -- safe to re-run; won't duplicate existing profiles
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STEP 2: Attach trigger to auth.users so every new signup auto-creates a profile
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- STEP 3: Backfill — create profiles for ALL existing auth users who are missing one
-- This fixes the current users who are stuck and can't make bookings.
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'client'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);
