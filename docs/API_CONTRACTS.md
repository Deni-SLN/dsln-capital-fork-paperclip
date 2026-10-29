# API Contracts

**Status:** No new API endpoints have been added during this phase. Existing Paperclip API contracts remain unchanged.

## Principle

Reuse existing endpoints before creating new ones. Any future endpoint must include:
- route and method;
- request schema;
- response schema;
- authorization rules;
- company/tenant filtering;
- error responses;
- activity logging for mutations;
- tests.

## Existing Surfaces Reused

- Agents: `server/src/routes/agents.ts`
- Issues/tasks: `server/src/routes/issues.ts`
- Approvals: `server/src/routes/approvals.ts`
- Costs: `server/src/routes/costs.ts`
- Dashboard: `server/src/routes/dashboard.ts`
- Companies: `server/src/routes/companies.ts`
- Activity/audit: `server/src/routes/activity.ts`
- Organization chart: `server/src/routes/org-chart-svg.ts` and related services
- System health: `server/src/routes/health.ts`, `liveness.ts`

## Future Dashboard Endpoints

If aggregation endpoints are required for DSLN Capital dashboard modules, they will be documented here before implementation. No such endpoint has been added yet.
