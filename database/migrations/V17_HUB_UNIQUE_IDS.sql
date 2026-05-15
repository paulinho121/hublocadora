-- =============================================================================
-- V17: Unique Human-Readable IDs for Users and Branches
-- =============================================================================

-- 0. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADD hub_id COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS hub_id text UNIQUE;

ALTER TABLE public.branches
    ADD COLUMN IF NOT EXISTS hub_id text UNIQUE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GENERATOR FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Generates a collision-safe hub_id for profiles (USR-XXXXXXXX)
CREATE OR REPLACE FUNCTION public.generate_user_hub_id()
RETURNS TRIGGER AS $$
DECLARE
    new_id text;
    collision boolean := true;
BEGIN
    -- Retry loop: extremely unlikely to loop more than once
    WHILE collision LOOP
        new_id := 'USR-' || upper(substring(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));
        collision := EXISTS (SELECT 1 FROM public.profiles WHERE hub_id = new_id);
    END LOOP;

    NEW.hub_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;


-- Generates a collision-safe hub_id for branches (BRN-XXXXXXXX)
CREATE OR REPLACE FUNCTION public.generate_branch_hub_id()
RETURNS TRIGGER AS $$
DECLARE
    new_id text;
    collision boolean := true;
BEGIN
    WHILE collision LOOP
        new_id := 'BRN-' || upper(substring(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));
        collision := EXISTS (SELECT 1 FROM public.branches WHERE hub_id = new_id);
    END LOOP;

    NEW.hub_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ATTACH TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_generate_user_hub_id ON public.profiles;
CREATE TRIGGER trg_generate_user_hub_id
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    WHEN (NEW.hub_id IS NULL)  -- Only generate if not manually set
    EXECUTE FUNCTION public.generate_user_hub_id();


DROP TRIGGER IF EXISTS trg_generate_branch_hub_id ON public.branches;
CREATE TRIGGER trg_generate_branch_hub_id
    BEFORE INSERT ON public.branches
    FOR EACH ROW
    WHEN (NEW.hub_id IS NULL)  -- Only generate if not manually set
    EXECUTE FUNCTION public.generate_branch_hub_id();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BACKFILL — assign hub_ids to existing records that don't have one yet
-- ─────────────────────────────────────────────────────────────────────────────

-- Backfill profiles
DO $$
DECLARE
    rec record;
    new_id text;
    collision boolean;
BEGIN
    FOR rec IN SELECT id FROM public.profiles WHERE hub_id IS NULL LOOP
        collision := true;
        WHILE collision LOOP
            new_id := 'USR-' || upper(substring(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));
            collision := EXISTS (SELECT 1 FROM public.profiles WHERE hub_id = new_id);
        END LOOP;
        UPDATE public.profiles SET hub_id = new_id WHERE id = rec.id;
    END LOOP;
END $$;


-- Backfill branches
DO $$
DECLARE
    rec record;
    new_id text;
    collision boolean;
BEGIN
    FOR rec IN SELECT id FROM public.branches WHERE hub_id IS NULL LOOP
        collision := true;
        WHILE collision LOOP
            new_id := 'BRN-' || upper(substring(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));
            collision := EXISTS (SELECT 1 FROM public.branches WHERE hub_id = new_id);
        END LOOP;
        UPDATE public.branches SET hub_id = new_id WHERE id = rec.id;
    END LOOP;
END $$;
