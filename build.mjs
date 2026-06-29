import * as esbuild from "esbuild";
const common = { bundle: true, format: "iife", target: "chrome110", logLevel: "info" };
await esbuild.build({ ...common, entryPoints: ["src/page/content.ts"], outfile: "dist/content.js" });
await esbuild.build({ ...common, entryPoints: ["src/page/token-hook.ts"], outfile: "dist/token-hook.js" });
await esbuild.build({ ...common, entryPoints: ["src/background/service-worker.ts"], outfile: "dist/service-worker.js" });
console.log("build complete");
