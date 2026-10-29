# DSLN Capital Command Center — Repository and Environment Audit Report

**Date:** 2026-10-24  
**Phase:** 1 — Repository and Environment Audit (read-only)  
**Status:** Audit completed. No source-code refactor or broad modifications performed.  
**Repository root:** `D:\paperclip-master`  
**Application name in manifests:** `paperclip` (version `0.3.1` across `@paperclipai/server`, `@paperclipai/shared`, `@paperclipai/ui`)

## 1. Executive Summary

The working directory contains a large, monorepo-style Paperclip-derived codebase. It includes the core control plane (`server/`, `ui/`, `packages/db`, `packages/shared`), many agent adapters, a native Rust runner, plugins, chat channels, MCP, connectors, Storybook, and extensive documentation. Git metadata is **not present** in this checkout, so this codebase is already effectively detached from upstream Paperclip Git history. No remote, commit SHA, branch, or working-tree status could be obtained from Git.

The codebase is dependency-heavy and currently has **no installed `node_modules`** in the repository root. `pnpm` is also not available on `PATH`. Therefore the default test/typecheck/build baseline could **not** be executed in this environment. This is a documented blocker, not a claimed pass.

## 2. Git and Source Provenance Audit

- `git status`: failed with `fatal: not a git repository`.
- `git remote -v`: failed with `fatal: not a git repository`.
- `git log`: failed with `fatal: not a git repository`.
- `git rev-parse HEAD`: failed with `fatal: not a git repository`.
- `.git` directory: absent.
- `.gitignore` and `.dockerignore`: present.
- Referenced source baseline in repository docs:
  - `doc/RUNNER-INTEGRATION-PLAYBOOK.md`: source baseline `c6a0cf4bce42449f617fb1cfbe25b8500d8a9fb9`.
  - `doc/DATABASE.md` / `doc/DEVELOPING.md`: benchmark baseline commit references such as `06689c1b3410000bcd65ff40cb469e600209c4db`, `df80616d98119cbf5abd40549794d9980a5fabf6`, `6c9b87d0922f1ebfc43e8b0c36889ac5ba7b9837`.
- No `.paperclip-build-commit` marker or `build-info.json` stamp was found.

**Conclusion:** The checkout is already an independent local codebase. No upstream remote exists to remove. Any future independent repository should preserve attribution/license and should not be made public without explicit approval.

## 3. Architecture Overview

### 3.1 Monorepo and Package Management

- Workspace definition: `pnpm-workspace.yaml`.
- Package manager policy: `pnpm@9.15.4` (`package.json#packageManager`).
- Node engine policy: `>=24.11.0`.
- Runtime observed: Node `v26.7.0`; `pnpm` not installed; `npm` `12.0.1` available.
- Workspaces include: `packages/*`, `packages/adapters/*`, `packages/plugins/*` (with exclusions), `server`, `ui`, `cli`.
- Build orchestration is pnpm-based (`pnpm -r build`, `pnpm -r typecheck`).

### 3.2 Frontend

- Framework: React + Vite.
- Main entry: `ui/src/main.tsx`, `ui/src/App.tsx`.
- Routing: custom router wrapper (`@/lib/router`) with company-scoped board routes.
- State/data: React context + hooks; API client under `ui/src/api`.
- UI components: `ui/src/components`.
- Pages: large surface area under `ui/src/pages`, including `Dashboard.tsx`, `DashboardLive.tsx`, `Org.tsx` / `OrgChart.tsx`, `Agents.tsx`, `Costs.tsx`, `Issues.tsx`, `Approvals.tsx`, `AuditHub.tsx`, `CompanyActivity.tsx`, `Workspaces.tsx`, `CompanyConnections.tsx`, etc.
- Design system: `DESIGN.md` is source of truth; token-only rule enforced by `scripts/check-token-gates.mjs`.
- Storybook present under `ui/storybook`.
- Responsive and mobile preview scripts exist.

### 3.3 Backend

- Framework: Express (TypeScript, ESM).
- Entry: `server/src/index.ts`; app setup `server/src/app.ts`.
- Routes: `server/src/routes` (very large surface, ~90 route modules).
- Services: `server/src/services` (856 entries including nested modules).
- Adapters: `server/src/adapters` (http/process adapters, adapter registry/plugin loader).
- Auth: Better Auth / board claim / agent API keys / company memberships; see `server/src/auth`, `server/src/middleware`, `server/src/routes/auth.ts`, `authz.ts`.
- Config: `server/src/config.ts` supports embedded Postgres or external Postgres, deployment modes, secrets/storage providers, UI serving, and runtime settings.
- Observability: OpenTelemetry instrumentation (`server/src/instrumentation.ts`), telemetry module, run-log events.

### 3.4 Database

- Engine: PostgreSQL via Drizzle ORM.
- Dev default: embedded PGlite/PostgreSQL when `DATABASE_URL` is unset (per `doc/DEVELOPING.md`).
- Production: external PostgreSQL recommended; Docker Compose uses `postgres:17-alpine`.
- Schema: `packages/db/src/schema` with ~150+ schema files covering companies, agents, issues/tasks, approvals, runs, costs, assets, chat, connections, cases, pipelines, plugins, workspaces, etc.
- Migrations: `packages/db/src/migrations` plus Drizzle migration tooling.
- Migration safety checks and migration tests are present.

### 3.5 Agent Execution and Orchestration

- Agent adapters: Claude, Codex, Cursor, Gemini, Grok, Kimi, Hermes, Hermes Gateway, OpenClaw Gateway, OpenCode, Pi, plus HTTP/process adapters.
- Native runner: Rust-based `packages/paperclip-runner` with provider pack and ACPX integration.
- Heartbeat and run lifecycle are core services (`server/src/services/heartbeat*`).
- Task checkout, approvals, budgets, activity logging are core control-plane invariants.
- Cases, routines, workflows, pipelines, workspaces, and execution workspaces are implemented.

### 3.6 Integrations

- Hermes and OpenClaw: adapter packages and onboarding docs present (`doc/HERMES_GATEWAY_ONBOARDING.md`, `doc/OPENCLAW_ONBOARDING.md`, smoke scripts).
- n8n: not found as a dedicated integration in the audited top-level paths; plugin/connector framework may support it, but no n8n-specific module was identified.
- Chat channels: Slack, Telegram, Discord, Teams, GitHub, voice and chat channels under `server/src/services/chat-channels`.
- Apps/connectors, MCP, secrets, storage, environments, and cloud integrations are present.
- Plugin system: `packages/plugins`, `server/src/routes/plugins.ts`, plugin SDK.

## 4. Actual Source Directories and Important Files

| Path | Role |
|---|---|
| `package.json` | Root scripts, engine/package manager policy, workspace scripts |
| `pnpm-workspace.yaml` | Workspace and patched dependency definitions |
| `AGENTS.md` | Contributor rules and repo guidance |
| `DESIGN.md` | UI design system source of truth |
| `doc/` | Product/spec/development/database/deployment docs |
| `docs/` | Additional docs, adapters, API, companies, deploy guides |
| `server/` | Express API, services, adapters, routes, build scripts |
| `server/src/index.ts` | Server entry |
| `server/src/app.ts` | Express app wiring |
| `server/src/config.ts` | Runtime configuration |
| `server/src/routes/` | API route modules |
| `server/src/services/` | Business logic and orchestration |
| `ui/` | React/Vite frontend |
| `ui/src/App.tsx` | Route registration |
| `ui/src/pages/` | UI pages and dashboards |
| `packages/db/` | Drizzle schema, migrations, DB client |
| `packages/shared/` | Shared types, constants, validators, API paths |
| `packages/adapters/` | Agent adapter implementations |
| `packages/plugins/` | Plugin system packages/examples |
| `packages/paperclip-runner/` | Native Rust runner |
| `cli/` | Paperclip CLI |
| `docker/` | Compose and deployment assets |
| `Dockerfile` | Production image build |
| `.env.example` | Environment template (dev defaults) |
| `scripts/` | Build, test, migration, smoke, and verification scripts |
| `tests/` | E2E, runner E2E, lifecycle baseline, browser tests |

## 5. Existing Capabilities and Reusable Modules

Reusable capabilities already present and suitable for DSLN Capital adaptation:

- Company-scoped data model and authorization.
- Agent registry, agent detail, runtime/model metadata, heartbeat runs.
- Task/issue system with checkout semantics, comments, attachments, relations, dependencies.
- Approvals and approval comments.
- Cost events and cost views (`Costs.tsx`, `costs.ts`).
- Organization chart (`Org.tsx`, `OrgChart.tsx`, `org-chart-svg.ts`).
- Activity and audit (`CompanyActivity.tsx`, `AuditHub.tsx`, `activity.ts`).
- Dashboard and live dashboard (`Dashboard.tsx`, `DashboardLive.tsx`).
- Workspaces, execution workspaces, environments.
- Secrets and storage abstractions.
- Plugin and connector framework.
- Chat integrations and MCP.
- Native runner and provider pack.
- Storybook and design-guide infrastructure.

## 6. Existing Test Baseline

### 6.1 Documented Test Commands

From root `package.json`:

- `pnpm test` / `pnpm test:run`: stable Vitest runner.
- `pnpm -r typecheck`: recursive TypeScript typecheck.
- `pnpm build`: preflight + recursive build.
- `pnpm test:e2e`: Playwright E2E.
- `pnpm test:release-smoke`: release smoke browser suite.
- `pnpm check:token-gates`: UI token gate checks.
- `pnpm db:generate`, `pnpm db:migrate`.

Server and UI also define their own test/typecheck/build scripts.

### 6.2 Test Surface

- Server tests: many `*.test.ts` files under `server/src`.
- Migration safety tests under `packages/db/src`.
- UI component/page tests under `ui/src` and `ui/tests`.
- Playwright E2E under `tests/e2e`, runner E2E under `tests/runner-e2e`, release smoke under `tests/release-smoke`.
- Storybook visual baseline tests under `tests/storybook-visual`.

### 6.3 Baseline Execution Result

**Not executed.** The environment lacks:

- `node_modules` at repository root and package directories.
- `pnpm` executable on `PATH`.
- Git metadata (not required for tests, but relevant for build stamping).

No test pass/fail claim is made. The baseline is therefore **unknown/unrun** in this audit. Running it requires installing dependencies (network/package-manager availability) and then executing the documented commands.

## 7. Deployment and Database Findings

- Development can run with embedded PostgreSQL by leaving `DATABASE_URL` unset.
- Production deployment target in this repo is Docker/Proxmox-friendly: `Dockerfile` (Node 24 base, tini, production runtime bundle) and `docker/docker-compose.yml` (Postgres 17 + server).
- Persistent data paths include `/paperclip` (instance data) and Postgres volume.
- Database backups: `pnpm db:backup` maps to `scripts/backup-db.sh`; server has instance database backup routes/services.
- Secrets: Better Auth secret and tool-action signing secret are required; `.env.example` contains dev-only values.
- Build stamping depends on Git commit or `PAPERCLIP_BUILD_COMMIT`; absent in this checkout.
- Rust toolchain is required for native runner builds.
- No production database was touched during this audit.

## 8. Security Risks

1. **No installed dependencies / unverified baseline:** Cannot currently verify typecheck, tests, or build.
2. **Secrets in dev templates:** `.env.example` contains development secrets (`paperclip-dev-secret`). These must never be reused in production.
3. **Broad operational surface:** The platform can execute agents, run commands, manage workspaces, and integrate with external providers. Access control and approval gates must remain intact during rebranding.
4. **Agent execution exposure:** Agent execution endpoints and external bot/webhook integrations must remain authenticated and authorized. No public exposure should be added.
5. **Cost/usage accuracy risk:** Token usage must not be conflated with cost; overlapping usage must not be double-counted; unavailable metrics must be shown as unavailable rather than fabricated.
6. **Data isolation:** Company/tenant filtering must be enforced server-side. Frontend must not receive direct database access.
7. **Audit integrity:** Dashboard must not create fake audit records; use existing activity/audit systems or controlled extensions.
8. **Git provenance loss:** Original Git history is absent. Source baseline references should be preserved in documentation, but exact commit ancestry cannot be reconstructed from Git.

## 9. Proposed Implementation Plan

### Phase 2 — Private Codebase and Safety

- Record this audit and provenance findings.
- Preserve license/attribution.
- Do not add upstream remotes or sync automation.
- If a new independent repository is desired, create it only after owner approval and after backing up this directory.
- Review `.gitignore`, `.dockerignore`, and secret handling before any commit.

### Phase 3 — Design System and Branding

- Rebrand Paperclip UI to DSLN Capital Command Center using existing design tokens and components.
- Keep business behavior unchanged.
- Add dark-first, permanent desktop sidebar, responsive mobile nav, KPI cards, operational tables, activity feed, org visualization, loading/empty/error/stale/permission states.
- Use IDR display where financial reporting is shown, with known source and timestamp for FX.

### Phase 4 — Dashboard Modules

Implement incrementally, read-first:

1. Executive Overview using real counts from existing APIs.
2. Organization Explorer from stored agent/reporting relationships.
3. Agent Directory from agent records and runtime status.
4. Task Operations read-only views.
5. AI Cost Center only where source data supports it; otherwise mark `Unavailable` / `Not integrated`.
6. Activity and Audit from stored events.
7. System Health with explicit `Healthy`, `Degraded`, `Unavailable`, `Unknown` definitions.

### Phase 5 — Frontend and Backend Architecture

- Reuse existing auth context, API client, components, and endpoints.
- Add aggregation services only when needed.
- Document every new API contract.
- Enforce server-side company/tenant filtering and authorization.
- Avoid schema migrations unless documented and necessary.

### Phase 6 — Hermes, OpenClaw, and n8n

- Preserve existing Hermes/OpenClaw integrations.
- Audit n8n specifically; no dedicated n8n module was identified in this pass.
- Design integration contracts before implementation; do not assume compatibility.

### Phase 7 — Testing and Regression

- Install dependencies in an isolated environment.
- Run typecheck, unit/integration tests, build, token gates, and relevant E2E.
- Document baseline failures honestly.
- Add tests for new dashboard modules and authorization.

### Phase 8 — Deployment

- Build versioned artifacts/images.
- Separate staging and production databases.
- Test login, agent list, task operations, approvals, integrations.
- Prepare rollback to previous image/config.

## 10. Files Expected to Change

Initial branding/dashboard work is expected to touch:

- `ui/src/index.css` and design tokens (if branding requires token updates within allowed process).
- `ui/src/components/Layout*` and navigation components.
- `ui/src/pages/Dashboard.tsx`, `DashboardLive.tsx`, `Org.tsx`, `OrgChart.tsx`, `Agents.tsx`, `Costs.tsx`.
- New dashboard components under `ui/src/components` or `ui/src/features`.
- `server/src/routes/dashboard.ts` and related aggregation services if new endpoints are required.
- `packages/shared` types/validators if new contracts are added.
- Documentation under `docs/` and `doc/`.
- Tests under `ui/src`, `server/src`, and `tests/`.

No files were changed during this audit except this report.

## 11. Unknowns and Blockers

1. **Dependency installation:** `node_modules` is absent and `pnpm` is not installed. Typecheck, tests, lint, and build could not be run.
2. **Git provenance:** No Git metadata exists; exact original commit cannot be determined from Git. Doc-referenced baseline `c6a0cf4b...` should be treated as a hint only.
3. **Database state:** No database was inspected or modified. Runtime database connectivity and migration state are unknown.
4. **n8n integration:** No dedicated n8n module was identified; integration status is unknown.
5. **Branding assets:** No DSLN Capital-specific assets/logo/token set was found; must be provided or designed.
6. **Organization data:** Existing organization categories are proposed; actual stored reporting relationships must be inspected before changes.
7. **Cost data sources:** Availability and correctness of cost/usage telemetry for Hermes/OpenClaw/external providers must be verified before Cost Center claims.

## 12. Audit Completion Statement

Phase 1 is complete as a read-only audit. The codebase is a large Paperclip-derived platform with substantial reusable functionality. The next safe step is Phase 2 (private codebase safety/provenance) followed by targeted branding and dashboard implementation using real data sources, with dependency installation and baseline verification before any production-facing change.
