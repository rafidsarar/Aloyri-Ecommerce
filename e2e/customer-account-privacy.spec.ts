import { expect, test } from "@playwright/test";

test("signed-out account hides personal sections and clears legacy browser records",async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem("aloyri_customer_profile_v1",JSON.stringify({fullName:"Private legacy customer",phone:"01712345678"}));
  localStorage.setItem("aloyri_customer_orders_v1",JSON.stringify([{orderNumber:"WEB-PRIVATE-12345678",phone:"01712345678"}]));
  sessionStorage.setItem("aloyri_checkout_draft",JSON.stringify({fullName:"Private legacy customer"}));
 });
 await page.goto("/account");
 await expect(page.getByRole("heading",{name:"Welcome to your account."})).toBeVisible();
 await expect(page.getByRole("link",{name:"Sign in with Google"})).toBeVisible();
 await expect(page.getByRole("navigation",{name:"Account sections"})).toHaveCount(0);
 await expect(page.getByText("Private legacy customer")).toHaveCount(0);
 await expect(page.getByText("WEB-PRIVATE-12345678")).toHaveCount(0);
 await expect(page.getByText("Save on this device")).toHaveCount(0);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith("aloyri_")))).toEqual([]);
 expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(key=>key.startsWith("aloyri_")))).toEqual([]);
});

test("wishlist is consolidated into the authenticated account area",async({page})=>{
 await page.goto("/wishlist");
 await expect(page).toHaveURL(/\/account\?section=wishlist/);
 await expect(page.getByRole("link",{name:"Sign in with Google"})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Wishlist."})).toHaveCount(0);
});

test("order tracking remains independent while personal account APIs require login",async({page,request})=>{
 await page.goto("/track-order");
 await expect(page.getByLabel("Order number")).toBeVisible();
 await expect(page.getByLabel("Mobile number")).toBeVisible();
 expect((await request.get("/api/customer/account")).status()).toBe(401);
 expect((await request.put("/api/customer/account",{data:{wishlistChange:{productId:"simple-wash",saved:true}}})).status()).toBe(401);
 expect((await request.post("/api/customer/post-purchase",{data:{orders:[]}})).status()).toBe(401);
});
