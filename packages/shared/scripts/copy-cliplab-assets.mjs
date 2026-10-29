import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Cross-platform replacement for `mkdir -p dist/cliplab && cp ...`.
// The repo's package scripts must run on Windows as well as POSIX.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(packageRoot, "src", "cliplab");
const targetDir = join(packageRoot, "dist", "cliplab");

mkdirSync(targetDir, { recursive: true });
for (const file of ["LICENSE", "PROVENANCE.md"]) {
  copyFileSync(join(sourceDir, file), join(targetDir, file));
}
