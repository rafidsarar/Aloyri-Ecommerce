import { expect, test } from "@playwright/test";

test.describe("Google account checkout integration", () => {
  test("customer auth exposes Google as the only live account login", async ({
    request,
  }) => {
    const response = await request.get("/api/customer-auth/status");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      authMethods?: { google?: boolean; emailLink?: boolean };
      authenticated?: boolean;
    };
    expect(body.authMethods?.emailLink).toBe(false);
    expect(body.authenticated).toBe(false);
  });

  test("legacy email-link login is disabled", async ({ request }) => {
    const response = await request.post("/api/customer-auth/request", {
      data: { email: "customer@example.com", nextPath: "/account" },
    });
    expect(response.status()).toBe(503);
  });

  test("account completion banner is safe for a valid web order reference", async ({
    page,
  }) => {
    const response = await page.goto(
      "/account?checkout=complete&order=WEB-TEST-12345678",
    );
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Order confirmed.")).toBeVisible();
    await expect(page.getByText(/WEB-TEST-12345678 is now linked/)).toBeVisible();
  });
});
