const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const script = join(__dirname, "seed-e2e-certification-fixtures.mjs");
const base = {
  PATH: process.env.PATH || "",
  HOME: process.env.HOME || "/tmp",
  NODE_ENV: "test",
  DATABASE_URL: "postgres://blocked:blocked@localhost/not-real",
  ALOYRI_E2E_NEON_PROJECT_ID: "isolated-fixture-db",
  NEON_PROJECT_ID: "isolated-fixture-db",
  CRM_INTEGRATION_URL: "https://aloyri-crm-e2e-runner-example.vercel.app",
  CRM_INTEGRATION_SECRET: "test-only-not-a-real-secret",
  ALOYRI_ORDERING_ENABLED: "0",
  ALOYRI_CUSTOMER_AUTH_ENABLED: "0",
  ALOYRI_GOOGLE_AUTH_ENABLED: "0",
  ALOYRI_LEGACY_BLOB_FALLBACK: "0",
};
const run = (extra) => spawnSync(process.execPath, [script], {
  encoding: "utf8", timeout: 20_000, env: { ...base, ...extra },
});

const normal = run({ ALOYRI_E2E_MODE: "0", VERCEL_ENV: "production" });
assert.equal(normal.status, 0);
assert.match(normal.stdout, /skipped outside isolated mode/);

for (const [label, extra] of [
  ["production mode", {
    ALOYRI_E2E_MODE: "1", VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: "feature/unified-storefront-control-center-20261010",
  }],
  ["wrong branch", {
    ALOYRI_E2E_MODE: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "main",
  }],
  ["wrong Neon project", {
    ALOYRI_E2E_MODE: "1", VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "feature/unified-storefront-control-center-20261010",
    NEON_PROJECT_ID: "production-project",
  }],
  ["ordering enabled", {
    ALOYRI_E2E_MODE: "1", VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "feature/unified-storefront-control-center-20261010",
    ALOYRI_ORDERING_ENABLED: "1",
  }],
]) {
  const result = run(extra);
  assert.notEqual(result.status, 0, label + " must reject fixture writes");
  assert.match(result.stderr, /E2E_FIXTURE_ISOLATION_INVARIANT_FAILED/, label);
}
console.log("PASS: certification seeder runs only on strictly isolated Preview; no network writes during regression");
