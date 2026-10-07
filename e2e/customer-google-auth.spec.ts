import { expect, test } from "@playwright/test";

test.describe("customer Google authentication", () => {
  test("Google auth status stays fail-closed until provider activation", async ({
    request,
  }) => {
    const status = await request.get("/api/customer-auth/status");
    expect(status.status()).toBe(200);
    const body = (await status.json()) as {
      authenticated?: boolean;
      authMethods?: { google?: boolean };
    };
    expect(body.authenticated).toBe(false);

    const start = await request.get("/api/customer-auth/google/start", {
      maxRedirects: 0,
    });

    if (body.authMethods?.google) {
      expect([302, 303, 307, 308]).toContain(start.status());
      expect(start.headers()["location"]).toContain(
        "/auth/v1/authorize",
      );
    } else {
      expect(start.status()).toBe(503);
    }
  });

  test("Google callback does not create a session without PKCE state", async ({
    request,
  }) => {
    const callback = await request.get(
      "/api/customer-auth/google/callback?code=fake",
      { maxRedirects: 0 },
    );
    expect([302, 303, 307, 308]).toContain(callback.status());
    expect(callback.headers()["location"]).toContain("/account");
  });
});
