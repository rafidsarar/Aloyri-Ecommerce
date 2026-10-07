import { writeSavedProductIds } from "@/lib/product-preferences";
async function updateWishlist(body: unknown) {
 const response=await fetch("/api/customer/account",{method:"PUT",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify(body)});
 if(response.status===401)throw new Error("SIGN_IN_REQUIRED");
 const result=await response.json();
 if(!response.ok||!result.account)throw new Error("Unable to save your wishlist. Please try again.");
 writeSavedProductIds(result.account.savedProductIds);
}
export function syncSignedInWishlist(ids:string[]) { return updateWishlist({savedProductIds:ids}); }
export function changeSignedInWishlist(productId:string,saved:boolean) { return updateWishlist({wishlistChange:{productId,saved}}); }
