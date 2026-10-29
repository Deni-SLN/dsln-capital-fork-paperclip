# DSLN Capital Command Center — Architecture

**Status:** Derived from read-only audit of the local Paperclip-derived codebase.  
**Source baseline reference:** `c6a0cf4bce42449f617fb1cfbe25b8500d8a9fb9` (from repository docs; Git metadata is absent in this checkout).

## 1. System Overview

DSLN Capital Command Center is a private, self-hosted AI operations control plane. It manages companies, agents, tasks, approvals, runs, costs, workspaces, integrations, and audit activity. The frontend is a React/Vite single-page application served by an Express/TypeScript backend. PostgreSQL is the system of record.

## 2. Runtime Components

### Frontend (`ui/`)
- React 19 + Vite.
- Router and company-scoped board routes in `ui/src/App.tsx`.
- Pages under `ui/src/pages`, including Dashboard, DashboardLive, Org/OrgChart, Agents, Costs, Issues, Approvals, Audit/CompanyActivity, Workspaces, CompanyConnections.
- API client under `ui/src/api`.
- Design system documented in `DESIGN.md`; token-only enforcement via `scripts/check-token-gates.mjs`.

### Backend (`server/`)
- Express application in `server/src/app.ts`, entry `server/src/index.ts`.
- Route modules under `server/src/routes`.
- Business logic under `server/src/services`.
- Authentication/authorization via Better Auth, board claims, agent API keys, company memberships.
- Configuration in `server/src/config.ts` supports embedded Postgres or external Postgres, deployment modes, secret/storage providers, and UI serving.
- OpenTelemetry instrumentation and telemetry modules for observability.

### Database (`packages/db/`)
- PostgreSQL via Drizzle ORM.
- Schema modules under `packages/db/src/schema`.
- Migrations and migration safety tests under `packages/db/src`.
- Dev default uses embedded PostgreSQL when `DATABASE_URL` is unset.

### Shared Contracts (`packages/shared/`)
- Shared types, constants, validators, API path constants, and telemetry definitions.

### Agent Adapters (`packages/adapters/`, `server/src/adapters/`)
- Local and gateway adapters for Claude, Codex, Cursor, Gemini, Grok, Kimi, Hermes, OpenClaw, OpenCode, Pi, plus HTTP/process adapters.
- Native Rust runner in `packages/paperclip-runner`.

### Integrations
- Hermes and OpenClaw adapter packages and onboarding docs are present.
- Chat channels include Slack, Telegram, Discord, Teams, GitHub, and voice.
- MCP, apps/connectors, secrets, storage, environments, and plugin system are present.
- No dedicated n8n module was identified in this audit.

## 3. Data and Control-Plane Invariants

- Company-scoped entities and authorization.
- Single-assignee task model.
- Atomic issue checkout semantics.
- Approval gates for governed actions.
- Budget hard-stop auto-pause behavior.
- Activity logging for mutating actions.
- Server-side filtering for company/tenant access.
- No direct database access from frontend.

## 4. Deployment Architecture

- Development: `pnpm dev`, API/UI on `http://localhost:3100`, embedded PostgreSQL by default.
- Production: Docker image (`Dockerfile`) and Compose (`docker/docker-compose.yml`) with PostgreSQL 17 and persistent volumes.
- Target production environment: Proxmox, using containerized deployment and PostgreSQL.
- Secrets are injected via environment variables; `.env.example` is development-only.

## 5. Security Boundaries

- Board access is full-control operator context.
- Agent access uses hashed bearer API keys.
- Agent keys must not access other companies.
- Mutating endpoints require authorization checks and activity logging.
- Agent execution and external integrations must remain authenticated and authorized.
- No secrets should be embedded in frontend or committed environment files.

## 6. DSLN Capital Adaptation Strategy

- Preserve core Paperclip capabilities and invariants.
- Rebrand UI and navigation without changing business behavior.
- Build dashboard modules from real data sources; mark unavailable metrics as `Unavailable` or `Not integrated`.
- Reuse existing endpoints before adding new ones.
- Add aggregation services and API contracts only when required.
- Keep Hermes/OpenClaw integrations; audit n8n separately.
- Maintain test, typecheck, build, and rollback discipline.

## 7. Known Gaps

- Git metadata is absent in this checkout.
- Dependencies are not installed; baseline typecheck/tests/build were not run.
- Database runtime state was not inspected.
- n8n integration status is unknown.
- DSLN Capital branding assets are not yet present.
