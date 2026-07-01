// Builds the extension and zips it as dehu-unificado-<version>.zip.
// Version comes from package.json (the source of truth release-please keeps current).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const name = `dehu-unificado-${version}.zip`;

execSync("node build.mjs", { stdio: "inherit" });
execSync(`rm -f dehu-unificado-*.zip && zip -r ${name} manifest.json dist icons LICENSE README.md`, { stdio: "inherit" });
console.log(`\npackaged: ${name}`);
