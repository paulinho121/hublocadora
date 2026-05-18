-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- DESCRIPTION: FIX COMPANIES RLS UPDATE POLICY WITH CHECK SUBQUERY DISAMBIGUATION
-- ERROR: "more than one row returned by a subquery used as an expression"
-- ==============================================================================

-- 1. Recreate the Companies_Update policy with the correct uncorrelated-disjoint subquery fix
-- The c alias ensures PostgreSQL resolves the inner c.id separately from target companies.id.

BEGIN;

DROP POLICY IF EXISTS "Companies_Update" ON public.companies;

CREATE POLICY "Companies_Update" ON public.companies
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid() OR public.check_is_admin())
    WITH CHECK (
        -- Protect the network tenant hierarchy linkage by preventing unauthorized parent_company_id modifications
        (parent_company_id = (SELECT c.parent_company_id FROM public.companies c WHERE c.id = companies.id))
        OR public.check_is_admin()
    );

COMMIT;
