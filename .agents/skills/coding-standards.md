# Superpowers: Coding Standards

## 1. Professionalism & Quality (Senior Agent)
- Code must be clean, modular, and reusable.
- Use explicit types in TypeScript. Avoid `any` at all costs.
- Follow the established project patterns (Lucide, Radix, Tailwind 4).
- Animations should be subtle and smooth using Framer Motion (`motion`).

## 2. Multi-tenant Security (Nuclear Isolation)
- **RLS Awareness**: Every database change MUST be checked for Row Level Security impact.
- **Tenant Context**: Always pull `tenant_id` from the context or current user's session.
- **Data Leaks**: Ensure no data from one tenant is ever leaked to another.

## 3. UI/UX (Premium Feel)
- Every component should feel "premium."
- Dark mode is the primary focus.
- Use glassmorphism where appropriate (`backdrop-blur`).
- Maximize the use of Radix-inspired components for accessibility.

## 4. Documentation First
- Update `PROJECT.md`, `ROADMAP.md`, and `STATE.md` with every significant change.
- Comment complex business logic in the code.
- Keep `package.json` dependencies organized and clean.
