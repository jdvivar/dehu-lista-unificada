import * as esbuild from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const common = { bundle: true, format: "iife", target: "chrome110", logLevel: "info" };
await esbuild.build({ ...common, entryPoints: ["src/page/content.ts"], outfile: "dist/content.js" });
await esbuild.build({ ...common, entryPoints: ["src/page/token-hook.ts"], outfile: "dist/token-hook.js" });
await esbuild.build({ ...common, entryPoints: ["src/background/service-worker.ts"], outfile: "dist/service-worker.js" });

// Keep manifest.json in sync with package.json (the single source of truth).
// Chrome's numeric `version` can't hold a prerelease tag, so strip it there and
// put the full semver in `version_name`. Value-only string replace preserves formatting.
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const numeric = version.split("-")[0];
const before = readFileSync("manifest.json", "utf8");
const after = before
  .replace(/"version":\s*"[^"]*"/, `"version": "${numeric}"`)
  .replace(/"version_name":\s*"[^"]*"/, `"version_name": "${version}"`);
if (after !== before) writeFileSync("manifest.json", after);

console.log(`build complete — manifest ${numeric} (version_name ${version})`);
