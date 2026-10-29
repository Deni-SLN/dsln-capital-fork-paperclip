# DSLN Capital Command Center — Implementation Plan

**Status:** Planning document based on Phase 1 audit. No implementation has started.  
**Rule:** One phase at a time. Audit and safety precede branding and feature work.

## Phase 1 — Repository and Environment Audit
**Status:** Completed.  
**Output:** `docs/AUDIT_REPORT.md`.

## Phase 2 — Private Codebase and Safety
**Status:** Completed for the current checkout.  
**Findings:**
- No Git metadata exists in this checkout; there is no upstream remote to remove.
- `.gitignore` and `.dockerignore` are present.
- No committed `.env` file was found; only `.env.example`, `.env.runner-e2e.example`, and `docker/.env.aws.example`.
- Development secret string appears only as user-facing guidance in `server/src/auth/better-auth.ts`.
- No repository initialization or destructive action was performed.

**Remaining safety actions before production:**
- Preserve license and attribution.
- Keep the codebase private.
- Back up the directory before any destructive operation.
- Create an independent Git repository only with explicit owner approval.
- Review secret handling and deployment configuration before release.

## Phase 3 — Design System and Branding
**Status:** Not started.  
**Planned work:**
- Rebrand Paperclip UI to DSLN Capital Command Center.
- Preserve existing design tokens and component patterns.
- Add dark-first layout, permanent desktop sidebar, responsive mobile navigation, KPI cards, operational tables, activity feed, organization visualization, and state handling.
- Use IDR display for rupiah reporting with known FX source and timestamp.

## Phase 4 — Dashboard Modules
**Status:** Not started.  
**Planned order:**
1. Executive Overview.
2. Organization Explorer.
3. Agent Directory.
4. Task Operations (read-first).
5. AI Cost Center (only where source data supports it).
6. Activity and Audit.
7. System Health.

**Rule:** No dummy/static metrics in production. Unavailable metrics must be shown as `Unavailable` or `Not integrated`.

## Phase 5 — Frontend and Backend Architecture
**Status:** Not started.  
**Planned work:**
- Reuse existing auth context, API client, components, and endpoints.
- Add aggregation services only when required.
- Document every new API contract.
- Enforce server-side company/tenant filtering and authorization.
- Avoid schema migrations unless documented and necessary.

## Phase 6 — Hermes, OpenClaw, and n8n
**Status:** Not started.  
**Planned work:**
- Preserve existing Hermes/OpenClaw integrations.
- Audit n8n specifically; no dedicated n8n module was identified.
- Design integration contracts before implementation.

## Phase 7 — Testing and Regression
**Status:** Blocked by missing dependencies.  
**Required before claiming completion:**
- Install dependencies in an isolated environment.
- Run recursive typecheck.
- Run unit and integration tests.
- Run production build.
- Run token-gate checks.
- Run relevant E2E and responsive checks.
- Document baseline failures honestly.

## Phase 8 — Deployment
**Status:** Not started.  
**Planned work:**
- Build versioned artifacts/images.
- Separate staging and production databases.
- Test login, agent list, task operations, approvals, and integrations.
- Prepare rollback to previous image/configuration.

## Immediate Next Actions

1. Obtain approval for dependency installation in the isolated development environment.
2. Install dependencies and establish the real test/typecheck/build baseline.
3. Begin Phase 3 branding only after baseline verification.
4. Update `docs/TEST_REPORT.md` with actual results.
