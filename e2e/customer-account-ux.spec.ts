import { expect, test } from "@playwright/test";

test.describe("customer account entry and signup UX", () => {
  test("separates Google sign-in and first-time signup without collecting passwords", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/account");

    await expect(page.getByRole("heading", { name: "Welcome to your account." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    const login = page.getByRole("link", { name: "Sign in with Google" });
    const register = page.getByRole("link", { name: "Create account with Google" });
    await expect(login).toBeVisible();
    await expect(register).toBeVisible();

    const loginDestination = new URL(await login.getAttribute("href") || "", page.url());
    const registerDestination = new URL(await register.getAttribute("href") || "", page.url());
    expect(loginDestination.pathname).toBe("/api/customer-auth/google/start");
    expect(loginDestination.searchParams.get("next")).toBe("/account");
    expect(registerDestination.pathname).toBe("/api/customer-auth/google/start");
    expect(registerDestination.searchParams.get("next")).toBe("/account/setup?next=%2Faccount");

    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Track your order" })).toHaveAttribute("href", "/track-order");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("checkout entry keeps cart and post-signup return destination", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/account\/setup\?next=(?:%2F|\/)checkout/);
    await expect(page.getByRole("heading", { name: "Your account, then checkout." })).toBeVisible();
    const login = page.getByRole("link", { name: "Sign in with Google" });
    const register = page.getByRole("link", { name: "Create account with Google" });
    const loginHref = new URL(await login.getAttribute("href") || "", page.url());
    const registerHref = new URL(await register.getAttribute("href") || "", page.url());
    expect(loginHref.searchParams.get("next")).toBe("/checkout");
    expect(registerHref.searchParams.get("next")).toBe("/account/setup?next=%2Fcheckout");
    await expect(page.getByRole("link", { name: "Return to your cart" })).toHaveAttribute("href", "/cart");
  });

  test("mobile entry stays readable and Google failure gets actionable feedback", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/account?auth=google-failed");
    await expect(page.getByRole("alert")).toContainText("could not complete");
    await expect(page.getByRole("link", { name: "Sign in with Google" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account with Google" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("order-support destination survives the Google sign-in entry", async ({ page }) => {
    await page.goto("/account?section=support");
    const login = page.getByRole("link", { name: "Sign in with Google" });
    const loginHref = new URL(await login.getAttribute("href") || "", page.url());
    expect(loginHref.searchParams.get("next")).toBe("/account?section=support");
    const register = page.getByRole("link", { name: "Create account with Google" });
    const registerHref = new URL(await register.getAttribute("href") || "", page.url());
    expect(registerHref.searchParams.get("next")).toBe("/account/setup?next=%2Faccount%3Fsection%3Dsupport");
  });

  test("signup entry cannot be redirected to an external website", async ({ page }) => {
    await page.goto("/account/setup?next=" + encodeURIComponent("//example.com"));
    const register = page.getByRole("link", { name: "Create account with Google" });
    const registerHref = new URL(await register.getAttribute("href") || "", page.url());
    expect(registerHref.searchParams.get("next")).toBe("/account/setup?next=%2Faccount");
  });
});

test("mobile shoppers can find account login directly in the header", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  const accountLink = page.getByRole("link", { name: "Customer account and sign in" });
  await expect(accountLink).toBeVisible();
  await accountLink.click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
