import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // The exported Claude Design canvas. It is the design specification we
    // read from, not source we own — its bundled runtime is vendor output and
    // linting it only produces noise. See AGENTS.md section 1.
    "Ledgerline/**",
  ]),
]);

export default eslintConfig;
