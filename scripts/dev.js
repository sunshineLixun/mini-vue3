import esbuild from "esbuild";
import minimist from "minimist";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const args = minimist(process.argv.slice(2));

const target = args._[0] || "reactivity";
const format = args.f || "global";
const pkg = require(`../packages/${target}/package.json`);

// resolve output
const outputFormat = format.startsWith("global")
  ? "iife"
  : format === "cjs"
  ? "cjs"
  : "esm";

// packages/reactivity/dist/reactivity.esm.js
// packages/reactivity/dist/reactivity.global.js
const outfile = resolve(
  __dirname,
  `../packages/${target}/dist/${target}.${format}.js`
);

esbuild
  .context({
    entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
    outfile,
    bundle: true,
    sourcemap: true,
    format: outputFormat,
    globalName: pkg.buildOptions?.name,
    platform: format === "cjs" ? "node" : "browser",
    target: "es2016",
  })
  .then((ctx) => ctx.watch());
