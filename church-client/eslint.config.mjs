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
  ]),
  // Legacy store/commerce module — pre-existing `no-explicit-any` debt in its
  // loosely-typed API mappers. Quarantined here so the rule stays strict/blocking
  // everywhere else; a dedicated typing pass is tracked in the multitenant
  // cartography (see project_multitenant_* memories). Do not add new files to
  // these globs — new code must be `any`-free.
  {
    files: ["app/admins/**/store/**", "app/store/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
