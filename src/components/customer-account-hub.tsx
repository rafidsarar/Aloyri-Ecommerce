"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CustomerAuthPanel } from "@/components/customer-auth-panel";
import { CustomerPostPurchaseCenter } from "@/components/customer-post-purchase-center";
import { SavedProductsClient } from "@/components/saved-products-client";
const sections = [["orders", "Orders"], ["addresses", "Addresses"], ["wishlist", "Wishlist"], ["support", "Support"], ["preferences", "Preferences"]] as const;
export function CustomerAccountHub({ authenticated, displayName }: { authenticated: boolean; displayName: string }) {
 const [signedOut,setSignedOut]=useState(false);
 useEffect(()=>{const clear=()=>setSignedOut(true);window.addEventListener("aloyri:customer-signed-out",clear);return()=>window.removeEventListener("aloyri:customer-signed-out",clear);},[]);
 const signedIn=authenticated&&!signedOut;
 const params=useSearchParams(); const router=useRouter();
 const requested=params.get("section") || "orders";
 const section=sections.some(([id])=>id===requested)?requested:"orders";
 return <main className="shell min-h-[65vh] py-10 md:py-14">
   <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
     <div><h1 className="display text-4xl sm:text-5xl">Customer account.</h1><p className="mt-3 text-sm text-[#321f1c]/65">{signedIn ? `Welcome${displayName ? ", " + displayName : ""}. Your orders and details, together.` : "Sign in with Google to see your personal information and orders."}</p></div>
     <Link href="/track-order" className="text-sm font-semibold text-[#713a35] underline underline-offset-4">Track an order without signing in</Link>
   </div>
   {!signedIn ? <CustomerAuthPanel /> : <>
     <nav aria-label="Account sections" className="mb-6 flex gap-2 overflow-x-auto border-b border-[#713a35]/10 pb-4">
       {sections.map(([id,label])=><button key={id} type="button" aria-current={section===id?"page":undefined} onClick={()=>router.replace("/account?section="+id,{scroll:false})} className={"min-h-11 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold "+(section===id?"bg-[#713a35] text-white":"bg-[#f5e8e2] text-[#713a35]")}>{label}</button>)}
     </nav>
     {section==="wishlist" ? <SavedProductsClient /> : null}
     {section==="preferences" ? <CustomerAuthPanel /> : null}
     <CustomerPostPurchaseCenter section={section} />
   </>}
 </main>;
}
