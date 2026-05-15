-- =============================================================================
-- V18: Enforce Mandatory Fields and Add Company Phone
-- =============================================================================

-- 1. Update Profiles
-- First, fill existing NULL values to avoid error 23502
UPDATE public.profiles SET full_name = 'Usuário CineHub' WHERE full_name IS NULL;

-- Make full_name mandatory and add phone
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS phone text,
    ALTER COLUMN full_name SET NOT NULL;

-- 2. Update Companies
-- Add phone column first
ALTER TABLE public.companies 
    ADD COLUMN IF NOT EXISTS phone text;

-- Fill existing NULL values for mandatory fields to avoid errors
UPDATE public.companies SET 
    address_street = COALESCE(address_street, 'A definir'),
    address_number = COALESCE(address_number, '0'),
    address_neighborhood = COALESCE(address_neighborhood, 'A definir'),
    address_city = COALESCE(address_city, 'A definir'),
    address_state = COALESCE(address_state, 'SP'),
    address_zip = COALESCE(address_zip, '00000000'),
    phone = COALESCE(phone, '(00) 0000-0000');

-- Now make them mandatory
ALTER TABLE public.companies
    ALTER COLUMN address_street SET NOT NULL,
    ALTER COLUMN address_number SET NOT NULL,
    ALTER COLUMN address_neighborhood SET NOT NULL,
    ALTER COLUMN address_city SET NOT NULL,
    ALTER COLUMN address_state SET NOT NULL,
    ALTER COLUMN address_zip SET NOT NULL,
    ALTER COLUMN phone SET NOT NULL;

-- 3. Update RLS (if needed, but usually All is fine)
-- No changes needed to RLS for adding columns.
