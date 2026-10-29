# Rollback Plan

## Rollback Triggers

- Failed login or authorization.
- Broken agent execution or heartbeat.
- Database migration incompatibility.
- UI or API regression.
- Integration failure affecting core operations.

## Rollback Strategy

1. Stop the new deployment.
2. Restore the previous container image.
3. Restore previous configuration if changed.
4. Restore database backup if migration incompatibility occurred.
5. Restart services.
6. Verify health, login, agent list, tasks, approvals, and integrations.

## Database Rollback

- Do not run destructive migrations without backup.
- Restore from tested backup if migration cannot be reversed.
- Confirm migration compatibility before production deployment.

## Verification After Rollback

- API health endpoint responds.
- UI loads.
- Users can log in.
- Agent and task data are visible.
- No secret exposure in logs.

## Status

Documentation only. No rollback has been executed.
