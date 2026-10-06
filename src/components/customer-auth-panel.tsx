"use client";
import { FormEvent, useEffect, useState } from "react";
import { readSavedProductIds, writeSavedProductIds } from "@/lib/product-preferences";

type Prefs={postDelivery:boolean;reviewRequest:boolean;reorderReminder:boolean};
type Account={id:string;email:string;displayName:string;savedProductIds:string[];emailPreferences:Prefs};
type Status={enabled:boolean;authenticated:boolean;account?:Account};

export function CustomerAuthPanel(){
 const [status,setStatus]=useState<Status|null>(null);
 const [notice,setNotice]=useState(""); const [error,setError]=useState(""); const [saving,setSaving]=useState(false);
 async function refresh(){
  try{
   const r=await fetch("/api/customer-auth/status",{cache:"no-store",credentials:"same-origin"});
   if(!r.ok)return; const b=await r.json() as Status; setStatus(b);
   if(b.authenticated&&b.account){
    const local=readSavedProductIds(); const merged=[...new Set([...b.account.savedProductIds,...local])].slice(0,100);
    if(JSON.stringify(merged)!==JSON.stringify(local)) writeSavedProductIds(merged);
    if(JSON.stringify(merged)!==JSON.stringify(b.account.savedProductIds)){
      void fetch("/api/customer/account",{method:"PUT",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({savedProductIds:merged})});
    }
   }
  }catch{}
 }
 useEffect(()=>{void refresh();},[]);
 if(!status?.enabled)return null;

 async function requestLink(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); setError(""); setNotice(""); setSaving(true);
  const f=new FormData(e.currentTarget);
  try{
   const r=await fetch("/api/customer-auth/request",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({email:f.get("email"),nextPath:"/account"})});
   const b=await r.json() as {error?:string;message?:string};
   if(!r.ok){setError(b.error||"Unable to send sign-in link.");return;}
   setNotice(b.message||"Check your email for a secure sign-in link.");
  }catch{setError("Unable to send sign-in link.");}finally{setSaving(false);}
 }
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault(); if(!status.account)return; setSaving(true);setError("");setNotice("");
  const f=new FormData(e.currentTarget);
  try{
   const r=await fetch("/api/customer/account",{method:"PUT",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({
    displayName:f.get("displayName"),savedProductIds:readSavedProductIds(),
    emailPreferences:{postDelivery:f.get("postDelivery")==="on",reviewRequest:f.get("reviewRequest")==="on",reorderReminder:f.get("reorderReminder")==="on"}
   })});
   const b=await r.json() as {error?:string;account?:Account};
   if(!r.ok||!b.account){setError(b.error||"Unable to update account.");return;}
   setStatus({...status,account:b.account}); setNotice("Secure account preferences saved.");
  }catch{setError("Unable to update account.");}finally{setSaving(false);}
 }
 async function signOut(){await fetch("/api/customer-auth/logout",{method:"POST",credentials:"same-origin"}).catch(()=>undefined);setStatus({enabled:true,authenticated:false});setNotice("Signed out.");}
 return <section className="mt-6 rounded-[1.5rem] border border-[#713a35]/10 bg-[#fffaf7] p-5 sm:p-7">
  <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#713a35]/45">Secure cloud account</p>
  {status.authenticated&&status.account?<form onSubmit={save} className="mt-4 grid gap-4">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-semibold">Signed in as {status.account.email}</p><p className="mt-1 text-xs text-[#321f1c]/45">Passwordless one-time email sign-in · HttpOnly secure session</p></div><button type="button" onClick={()=>void signOut()} className="rounded-full border border-[#713a35]/14 px-4 py-2 text-xs font-semibold text-[#713a35]">Sign out</button></div>
   <label className="text-xs font-medium">Display name<input name="displayName" defaultValue={status.account.displayName} maxLength={80} className="mt-2 h-11 w-full max-w-md rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm"/></label>
   <div className="grid gap-3 rounded-xl bg-[#f5e8e2] p-4 text-xs leading-5"><p className="font-semibold">Lifecycle email preferences</p>
    <label className="flex gap-3"><input type="checkbox" name="postDelivery" defaultChecked={status.account.emailPreferences.postDelivery}/>Post-delivery follow-up</label>
    <label className="flex gap-3"><input type="checkbox" name="reviewRequest" defaultChecked={status.account.emailPreferences.reviewRequest}/>Verified-review reminder</label>
    <label className="flex gap-3"><input type="checkbox" name="reorderReminder" defaultChecked={status.account.emailPreferences.reorderReminder}/>Replenishment reminder</label>
   </div>
   <button disabled={saving} className="w-fit rounded-full bg-[#713a35] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Save account preferences"}</button>
  </form>:<form onSubmit={requestLink} className="mt-4 max-w-xl"><h2 className="display text-3xl">Sign in without a password.</h2><p className="mt-2 text-xs leading-6 text-[#321f1c]/48">Aloyri sends a single-use link that expires after 15 minutes. Sign-in enables cloud wishlist sync and customer-controlled lifecycle preferences.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="h-11 min-w-0 flex-1 rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm"/><button disabled={saving} className="rounded-full bg-[#713a35] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50">{saving?"Sending…":"Email secure sign-in link"}</button></div></form>}
  {notice?<p className="mt-4 text-xs text-emerald-700" aria-live="polite">{notice}</p>:null}{error?<p className="mt-4 text-xs text-red-700" role="alert">{error}</p>:null}
 </section>;
}
