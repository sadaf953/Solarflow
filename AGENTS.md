# Isolated demo workspace

This is a copied CRM used only as an isolated demo. Read DEMO_ISOLATION.md before changing integrations.

- Never connect to the original Supabase project, GitHub repository, deployment/domain, email service or customer data.
- Never restore the archived original Git history, deleted workflows, old build output, credentials or project-link files into this workspace.
- Do not use account-wide Supabase/GitHub connectors for this project without the user's explicit choice of a new demo-only target.
- Keep backend transport disconnected and external requests blocked unless the user explicitly requests a separate demo backend.
- Run npm run check:isolation and npm run test:isolation after integration changes.
- Work on port 5186 (preview 4186); other running project servers are not this demo.
