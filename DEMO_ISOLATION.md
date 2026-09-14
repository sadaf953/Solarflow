# SolarFlow demo isolation

This working copy is disconnected from the original application's backend and deployment. It is intentionally an offline development shell, not a migrated database or a fully functional CRM backend.

Run `npm run dev` and use http://127.0.0.1:5186. The original project's servers were observed on 5173 and 5174; do not use those for this demo. Preview builds use http://127.0.0.1:4186.

## What was verified and changed

- The original `.env` Supabase URL/key were blank, but load-test account details remained. `.env` is now comments only.
- No named Git remote or Supabase project-link files remained. However, old branch configuration contained a credential-bearing GitHub URL, and the copied build still contained the live Supabase endpoint.
- Removed all three copied GitHub workflows (backup, deployment, keep-alive), the GitHub homepage, deployment scripts/tool, and custom-domain file.
- Removed the old build and Vite cache, then rebuilt from isolated source.
- Replaced backend transport with a client that ignores environment credentials, never restores browser sessions or auth URL tokens, blocks every backend fetch, and disables realtime. No old project sign-out request was sent.
- Added a browser Content Security Policy blocking external connections/resources, a dedicated localhost port, an isolation banner, and an automatic check before dev/build/preview.
- Started fresh local Git history on `codex/demo-isolated`, without remotes; `.githooks/pre-push` blocks accidental pushes.
- The original Git directory is archived outside this project at `/Users/mahvishsadafv2/Desktop/solarflow_demo_git_recovery_20260914/original.git`. Its credential-bearing local configuration and FETCH_HEAD were removed before archival. The archive can still contain historical secrets/customer data. Do not publish it or restore it into this demo.

## Scope and limits

Real login, password reset, database reads/writes, uploads, emails and realtime are disabled. The development quotation fixture remains available at `/quotation-preview.html`, using synthetic in-memory records. No live database or storage files were copied. Copied local screenshots/PDFs under `scratch/` and `output/` were removed during the requested branding/data cleanup. New QA artifacts, if generated, use synthetic demo data.

This audit verifies this working copy, not account-wide Supabase/GitHub logout. No standard Supabase CLI token file was found, but browser login, OS credential stores and app connectors were not revoked or verified. Global credentials and the original project were left unchanged. A GitHub token was found in the copied Git configuration; revoke/rotate that token in GitHub settings.

These are safeguards against accidents, not a sandbox for arbitrary future commands. Do not point tools, connectors, CLI commands or code at the original project. Changing security guards or running the old project bypasses the protections.

For a functional backend, create a distinct demo-only project or local database with synthetic data, its own credentials, schema, storage and auth settings. Review every integration before explicitly replacing the disconnected transport. No backend has been provisioned by this isolation task.

## Verification

- `npm run check:isolation`: rejects populated env files, live Supabase URLs/credential patterns in app/build files, project bindings, Git remotes and workflows.
- `npm run test:isolation`: exercises auth, queries, writes, uploads, email functions and realtime with an instrumented network function, requiring zero network calls.
- `npm run build`: rebuilds the demo with the transport lock and browser policy.

Final verification on 2026-09-14: the isolation transport test and all 18 existing quotation tests passed. Headless Chrome loaded the main demo and synthetic quotation fixture with zero external requests and zero page errors. An active-tree scan found no token patterns or live Supabase endpoint. Build succeeded (existing Vite plugin deprecation/chunk warnings remain).

Branding cleanup: all original company logo assets were removed and replaced with SolarFlow SVG artwork. Company/customer names, bank/account/registration details, addresses and telephone fixtures use demo placeholders. Old partner artwork was replaced with fictional demo badges. Local storage namespaces and fixture keys were changed to avoid reusing old snapshots.
