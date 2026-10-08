"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CustomerAuthPanel } from "@/components/customer-auth-panel";
import { volatileStorage } from "@/lib/volatile-storage";
import { writeSavedProductIds } from "@/lib/product-preferences";
import { CustomerPostPurchaseCenter } from "@/components/customer-post-purchase-center";
import { SavedProductsClient } from "@/components/saved-products-client";
const sections = [["orders", "Orders"], ["addresses", "Addresses"], ["wishlist", "Wishlist"], ["support", "Support"], ["preferences", "Preferences"]] as const;
export function CustomerAccountHub({ authenticated, displayName }: { authenticated: boolean; displayName: string }) {
 const [signedOut,setSignedOut]=useState(false);
 const [signingOut,setSigningOut]=useState(false);
 const [signOutError,setSignOutError]=useState("");
 useEffect(()=>{const clear=()=>setSignedOut(true);window.addEventListener("aloyri:customer-signed-out",clear);return()=>window.removeEventListener("aloyri:customer-signed-out",clear);},[]);
 const signedIn=authenticated&&!signedOut;
 async function signOut() {
  if (signingOut) return;
  setSigningOut(true);setSignOutError("");
  try {
   const response=await fetch("/api/customer-auth/logout",{method:"POST",credentials:"same-origin"});
   if(!response.ok)throw new Error("Sign out failed");
   volatileStorage.clear();
   writeSavedProductIds([]);
   window.dispatchEvent(new Event("aloyri:customer-signed-out"));
   window.dispatchEvent(new Event("aloyri-cart-updated"));
   setSignedOut(true);
   router.replace("/account");router.refresh();
  } catch {setSignOutError("Unable to sign out. Please try again.");}
  finally {setSigningOut(false);}
 }
 const params=useSearchParams(); const router=useRouter();
 const requested=params.get("section") || "orders";
 const section=sections.some(([id])=>id===requested)?requested:"orders";
 return <main className="shell min-h-[65vh] py-10 md:py-14">
   <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
     <div><h1 className="display text-4xl sm:text-5xl">Customer account.</h1><p className="mt-3 text-sm text-[#321f1c]/65">{signedIn ? `Welcome${displayName ? ", " + displayName : ""}. Your orders and details, together.` : "Sign in with Google to see your personal information and orders."}</p></div>
     <div className="flex flex-wrap items-center gap-3">
       <Link href="/track-order" className="text-sm font-semibold text-[#713a35] underline underline-offset-4">Track an order without signing in</Link>
       {signedIn ? <button type="button" onClick={()=>void signOut()} disabled={signingOut} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#713a35]/25 px-5 py-2.5 text-sm font-semibold text-[#713a35] transition hover:bg-[#f5e8e2] disabled:opacity-50" aria-label="Sign out of customer account">{signingOut?"Signing out…":"Sign out"}</button> : null}
     </div>
   </div>
   {signOutError ? <p role="alert" className="mb-4 text-sm text-red-700">{signOutError}</p> : null}
   {!signedIn ? <CustomerAuthPanel /> : <>
     <nav aria-label="Account sections" className="mb-6 flex flex-wrap gap-2 border-b border-[#713a35]/10 pb-4">
       {sections.map(([id,label])=><button key={id} type="button" aria-current={section===id?"page":undefined} onClick={()=>router.replace("/account?section="+id,{scroll:false})} className={"min-h-11 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold "+(section===id?"bg-[#713a35] text-white":"bg-[#f5e8e2] text-[#713a35]")}>{label}</button>)}
     </nav>
     {section==="wishlist" ? <SavedProductsClient /> : null}
     {section==="preferences" ? <CustomerAuthPanel /> : null}
     <CustomerPostPurchaseCenter section={section} />
   </>}
 </main>;
}
