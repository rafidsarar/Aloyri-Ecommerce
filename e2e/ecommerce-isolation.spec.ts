import { expect, test } from "@playwright/test";
import { e2eExternalEndpointAllowed, e2eMediaEndpointAllowed } from "../src/lib/e2e-isolation";

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

test("E2E media isolation approves only the dedicated Supabase function, never Production media", () => {
  const beforeMode = process.env.ALOYRI_E2E_MODE;
  const beforeOrigin = process.env.ALOYRI_E2E_MEDIA_ORIGIN;
  try {
    process.env.ALOYRI_E2E_MODE = "1";
    process.env.ALOYRI_E2E_MEDIA_ORIGIN = "https://bgkwykjxyghbrtograkh.supabase.co";
    const allowed = "https://bgkwykjxyghbrtograkh.supabase.co/functions/v1/aloyri-e2e-media-gateway";
    expect(e2eMediaEndpointAllowed(allowed)).toBe(true);
    for (const denied of [
      "https://bgkwykjxyghbrtograkh.supabase.co/functions/v1/aloyri-media-gateway",
      "https://bgkwykjxyghbrtograkh.supabase.co/functions/v1/ecommerce-media",
      allowed + "?action=delete",
      "http://bgkwykjxyghbrtograkh.supabase.co/functions/v1/aloyri-e2e-media-gateway",
      "https://attacker.supabase.co/functions/v1/aloyri-e2e-media-gateway",
      "https://bgkwykjxyghbrtograkh.supabase.co.evil.example/functions/v1/aloyri-e2e-media-gateway",
    ]) expect(e2eMediaEndpointAllowed(denied)).toBe(false);
    delete process.env.ALOYRI_E2E_MEDIA_ORIGIN;
    expect(e2eMediaEndpointAllowed(allowed)).toBe(false);
  } finally {
    if (beforeMode === undefined) delete process.env.ALOYRI_E2E_MODE;
    else process.env.ALOYRI_E2E_MODE = beforeMode;
    if (beforeOrigin === undefined) delete process.env.ALOYRI_E2E_MEDIA_ORIGIN;
    else process.env.ALOYRI_E2E_MEDIA_ORIGIN = beforeOrigin;
  }
});
