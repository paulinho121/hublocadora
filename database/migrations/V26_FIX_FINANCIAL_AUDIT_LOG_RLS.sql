-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- DESCRIPTION: FIX RLS POLICY FOR FINANCIAL_AUDIT_LOG TABLE
-- ERROR: "NEW ROW VIOLATES ROW-LEVEL SECURITY POLICY FOR TABLE 'financial_audit_log'"
-- ==============================================================================

BEGIN;

-- 1. Ensure table has RLS enabled
ALTER TABLE IF EXISTS public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insert policies if they exist to prevent duplicates
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Allow system inserts" ON public.financial_audit_log;
DROP POLICY IF EXISTS "financial_audit_log_insert_policy" ON public.financial_audit_log;
DROP POLICY IF EXISTS "Insert financial audit logs" ON public.financial_audit_log;

-- 3. Create a clean INSERT policy for authenticated users
-- This allows users to successfully save their financial/bank settings, 
-- triggering the automatic audit logging without RLS violations.
CREATE POLICY "Allow authenticated inserts" ON public.financial_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 4. Create SELECT policy so only admins and the company owner can read the financial audit trail
DROP POLICY IF EXISTS "Admins and owners can view financial audit logs" ON public.financial_audit_log;
DROP POLICY IF EXISTS "financial_audit_log_select_policy" ON public.financial_audit_log;

CREATE POLICY "Admins and owners can view financial audit logs" ON public.financial_audit_log
    FOR SELECT TO authenticated
    USING (
        public.check_is_admin()
        OR (company_id = public.get_my_company_id())
    );

-- 5. Grant necessary permissions to roles
GRANT INSERT, SELECT ON public.financial_audit_log TO authenticated;
GRANT ALL ON public.financial_audit_log TO service_role;

COMMIT;
