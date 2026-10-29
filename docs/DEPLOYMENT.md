# Deployment

**Target production environment:** Proxmox.  
**Deployment method identified in repository:** Docker image + Docker Compose.

## Runtime Requirements

- Node.js >= 24.11.0
- pnpm 9.15.4
- PostgreSQL 17 (external recommended for production)
- Docker for image builds
- Rust toolchain for native runner builds (if rebuilding runner)

## Configuration

Use environment variables. Do not commit production secrets.

Important variables:
- `DATABASE_URL`
- `PORT`
- `SERVE_UI`
- `BETTER_AUTH_SECRET`
- `PAPERCLIP_TOOL_ACTION_SIGNING_SECRET`
- `PAPERCLIP_DEPLOYMENT_MODE`
- `PAPERCLIP_DEPLOYMENT_EXPOSURE`
- `PAPERCLIP_PUBLIC_URL`

Development defaults are in `.env.example` and must not be reused in production.

## Compose Deployment

`docker/docker-compose.yml` defines:
- PostgreSQL 17 service with persistent `pgdata` volume.
- Paperclip server service with persistent `paperclip-data` volume.
- Health-checked database dependency.
- Private deployment exposure by default.

## Build

```sh
docker build -t dsl-capital-command-center:<version> .
```

The Dockerfile builds UI, plugin SDK, server, and runtime bundle. It also supports cloud variants.

## Pre-Deployment Checklist

1. Build image from a known version.
2. Use a separate staging database.
3. Configure production secrets outside the image.
4. Run migration checks in staging.
5. Test login, agent list, task operations, approvals, and integrations.
6. Confirm backup and restore.
7. Document rollback target.

## Data and Backup

- Preserve PostgreSQL volume.
- Preserve `/paperclip` instance data volume.
- Use `pnpm db:backup` / `scripts/backup-db.sh` where applicable.
- Test restore in an isolated environment before production use.

## Status

Documentation only. No production deployment has been performed.
