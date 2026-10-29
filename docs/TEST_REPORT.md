# Test Report

**Date:** 2026-10-24  
**Scope:** Baseline verification attempt for DSLN Capital Command Center (Paperclip-derived codebase).

## Environment

- OS: Windows 10/11 (win32)
- Node: v26.7.0
- pnpm: 9.15.4 (installed during audit)
- Repository: `D:\paperclip-master`
- Git metadata: absent

## Commands Attempted

### Dependency installation

Command:
```sh
pnpm install --frozen-lockfile
```

Result: Mostly completed. Dependencies were downloaded and installed. Two environment-specific issues occurred:

1. Native optional modules `cpu-features` and `ssh2` failed to build because Visual Studio C++ build tools are not available for Node 26 on this machine. These are optional dependencies and do not block core TypeScript typecheck for most packages.
2. `postinstall` (`scripts/link-plugin-dev-sdk.mjs`) failed with `EPERM` while creating a symlink for excluded sandbox-provider plugins. This is a Windows symlink-permission limitation.

### Recursive typecheck

Command:
```sh
pnpm typecheck
```

Result: Failed before completion.

Observed blockers:
- `packages/plugins/sdk` build uses Unix shell syntax (`mkdir -p`, `cp`) in its npm script, which fails on Windows PowerShell.
- `packages/shared` TypeScript compilation itself succeeded when run directly.
- `packages/db` migration checks passed.
- Several packages completed typecheck before the failure.

### Targeted shared compilation

Command:
```sh
pnpm --filter @paperclipai/shared exec tsc
```

Result: Passed after manual creation of `packages/shared/dist/cliplab` copied files.

## Summary

The full automated baseline could not be completed in this Windows environment due to:
- missing Visual Studio C++ tooling for native optional dependencies;
- Windows symlink permission limitations during postinstall;
- Unix-specific shell commands in package scripts.

No test pass/fail claim is made for the full suite. The codebase still requires a Linux/macOS or properly configured Windows development environment (with C++ build tools and symlink permissions) for complete baseline verification.

## Next Verification Steps

1. Run dependency installation in an environment with Visual Studio C++ build tools or use a Linux/macOS/WSL environment.
2. Run `pnpm typecheck`.
3. Run `pnpm test:run`.
4. Run `pnpm build`.
5. Run `pnpm check:token-gates`.
6. Run targeted Playwright suites only when UI/routing changes are complete.
