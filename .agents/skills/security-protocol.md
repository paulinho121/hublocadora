# Superpowers: Security Protocol

## 1. Row Level Security (RLS) Rules
- **No tenant leakage**: All queries must filter by `tenant_id` or let the RLS handle it.
- **Master API Access**: Only specific, authorized administrative keys can bypass RLS for maintenance.
- **Data Integrity**: Use Postgres constraints (`CHECK`, `UNIQUE`, `FOREIGN KEY`) to reinforce business logic.

## 2. Authentication & Authorization
- Use Supabase `authenticated` and `service_role` appropriately.
- Ensure only `admin` role can access `/admin` resources.
- Validate JWT on all sensitive operations.

## 3. Deployment & Secrets
- Never commit `.env` or sensitive variables.
- Audit `package.json` for vulnerabilities.
- Keep `supabase-schema.sql` up to date with production.

## 4. Audit Checklist (Before Committing)
- [ ] Are RLS policies in place for the new table?
- [ ] Does the UI handle error states for unauthorized users?
- [ ] Is sensitive data handled securely?
- [ ] Does the `tenant_id` match the active session?

## 5. Automated Scanners (CI/CD)
- **Gitleaks**: Scans for secrets in the commit history.
- **Semgrep**: Scans for code vulnerabilities (SAST).
- **NPM Audit**: Scans for vulnerabilities in third-party libraries.
- *Check the "Actions" tab in GitHub for results after every push.*
