"use client";
import { useEffect } from "react";
import { writeSavedProductIds } from "@/lib/product-preferences";
export function CustomerDataCleanup() {
 useEffect(()=>{
   // Remove data retained by older releases, without reading or importing it.
   for(const name of ["localStorage","sessionStorage"] as const) {
     try { const storage=window[name]; for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith("aloyri_"))storage.removeItem(key);} } catch { /* Storage can be disabled. */ }
   }
   const controller=new AbortController();
   void fetch("/api/customer/account",{cache:"no-store",credentials:"same-origin",signal:controller.signal})
    .then(async response=>response.ok?await response.json():null)
    .then(body=>{if(!controller.signal.aborted)writeSavedProductIds(body?.account?.savedProductIds||[]);})
    .catch(()=>undefined);
   return()=>controller.abort();
 },[]);
 return null;
}
