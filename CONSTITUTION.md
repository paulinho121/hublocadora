# CineHub Constitution

This document defines the immutable principles and standards for the CineHub project. All AI agents and developers must adhere to these rules.

## 1. Security & Isolation (Nuclear Security)
- **RLS is Absolute**: No data should be fetched or modified without going through Supabase Row Level Security.
- **Tenant Context**: All queries must respect the `tenant_id`. Never leak data between rental houses.
- **Service Layer**: Database interactions must be encapsulated in services (e.g., `EquipmentService.ts`) to ensure consistent policy application.

## 2. Technical Stack
- **Frontend**: React 19, Vite, Tailwind CSS 4.
- **State**: React Query for server state, Zustand for client state.
- **Database**: PostgreSQL (Supabase).
- **AI**: Google Gemini 2.5 Flash + Firebase Genkit.

## 3. Design System (Premium UX)
- **Aesthetics**: Dark mode first, High-contrast (Black/Lime/Orange), Glassmorphism (blur + semi-transparent borders).
- **Animations**: Use `motion` (framer-motion) for all transitions. Avoid static state changes where a transition is possible.
- **Typography**: Modern, sans-serif (Inter/Outfit).
- **Responsiveness**: Mobile-first design is mandatory.

## 4. Coding Standards
- **TypeScript**: Strict mode is on. Avoid `any` at all costs. Use Zod for runtime validation if needed.
- **Components**: Functional components only. Use hooks for logic.
- **Documentation**: Code should be self-documenting, but complex logic requires JSDoc.

## 5. AI Agent Workflow (Spec-Driven)
- **Spec First**: Before implementing a feature, a `.spec.md` must be created in `specs/`.
- **Plan Second**: A `.plan.md` must be created in `plans/` to outline the technical steps.
- **Implementation**: Implementation only happens after the Plan is approved.
