import { expect, test } from "@playwright/test";
import { e2eExternalEndpointAllowed } from "../src/lib/e2e-isolation";

test.describe("Ecommerce certification connection isolation", () => {
  test("normal Production integration remains unaffected", () => {
    expect(e2eExternalEndpointAllowed("https://aloyri-crm.vercel.app", undefined, undefined)).toBe(true);
  });

  test("isolated mode denies every connection without an explicit test allowlist", () => {
    for (const target of [
      "https://aloyri-crm.vercel.app",
      "https://aloyri-ecommerce.vercel.app",
      "https://bgkwykjxyghbrtograkh.supabase.co/functions/v1/gateway",
      "https://crm-e2e-not-connected.invalid",
    ]) {
      expect(e2eExternalEndpointAllowed(target, undefined, "1")).toBe(false);
      expect(e2eExternalEndpointAllowed(target, "https://crm-e2e.example.test", "1")).toBe(false);
    }
  });

  test("only the exact HTTPS E2E endpoint can be allowed", () => {
    const allowed = "https://aloyri-crm-e2e-runner-example.vercel.app";
    expect(e2eExternalEndpointAllowed(allowed + "/api/integrations/ecommerce/catalog", allowed, "1")).toBe(true);
    expect(e2eExternalEndpointAllowed("https://aloyri-crm.vercel.app/api/orders", "https://aloyri-crm.vercel.app", "1")).toBe(false);
    expect(e2eExternalEndpointAllowed("http://aloyri-crm-e2e-runner-example.vercel.app", allowed, "1")).toBe(false);
    expect(e2eExternalEndpointAllowed(allowed + ".attacker.example", allowed, "1")).toBe(false);
    expect(e2eExternalEndpointAllowed("https://user:password@aloyri-crm-e2e-runner-example.vercel.app", allowed, "1")).toBe(false);
    expect(e2eExternalEndpointAllowed(allowed, allowed + "/api", "1")).toBe(false);
  });
});

test("E2E readiness endpoint is hidden when certification mode is not enabled", async ({ request }) => {
  test.skip(process.env.ALOYRI_E2E_MODE === "1" && process.env.VERCEL_ENV === "preview", "Active isolated certification preview.");
  const response = await request.get("/api/e2e/readiness");
  expect(response.status()).toBe(404);
});
