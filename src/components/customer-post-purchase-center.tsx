"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalog";

type Address = {
  id: string; label: string; recipientName: string; phone: string;
  district: string; area: string; address: string; landmark?: string;
};
type Account = {
  email: string; displayName: string; savedAddresses: Address[];
};
type OrderRow =
  | { ok: true; phone: string; canRequestCancellation: boolean; canReportDeliveryIssue: boolean; canRequestReturn: boolean; order: {
      orderNumber: string; created: string; status: string; total: number; items: Array<{name:string;brand:string;size:string;qty:number;unitPrice:number}>;
    }}
  | { ok: false; orderNumber: string; createdAt: string; total?: number };
type SupportCase = { id:string; category:string; status:string; orderNumber?:string; note:string; createdAt:string; updatedAt:string; events:Array<{id:string;at:string;type:string;detail?:string}> };
type ProductAlert = { id:string; productName:string; productSlug:string; kinds:string[]; createdAt:string };
type Data = { pagination: { page: number; pages: number; total: number }; account: Account; orders: OrderRow[]; supportCases: SupportCase[]; productAlerts: ProductAlert[] };

function dateLabel(value:string){
  const d=new Date(value);
  return Number.isNaN(d.getTime())?value:d.toLocaleDateString("en-BD",{day:"numeric",month:"short",year:"numeric"});
}
function statusClass(value:string){
  if(value==="Delivered"||value==="resolved")return "bg-emerald-50 text-emerald-700";
  if(value==="Cancelled"||value==="closed")return "bg-red-50 text-red-700";
  return "bg-[#f5e8e2] text-[#713a35]";
}

export function CustomerPostPurchaseCenter({section}:{section:string}){
  const [data,setData]=useState<Data|null>(null);
  const [security,setSecurity]=useState<{activeSessions:number;currentSessionCreatedAt:string;currentSessionExpiresAt:string}|null>(null);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");

  const refresh = useCallback(async (page = 1) => {
    const response=await fetch("/api/customer/post-purchase?page="+page,{cache:"no-store",credentials:"same-origin"});
    if(response.status===401){setData(null);window.dispatchEvent(new Event("aloyri:customer-signed-out"));return;}
    if(!response.ok)throw new Error("Unable to load account history.");
    const next=await response.json() as Data;
    setData(next);

  }, []);

  useEffect(()=>{
    let cancelled=false;
    const timer=window.setTimeout(()=>{void refresh().catch(()=>{if(!cancelled)setError("Unable to load your account. Please try again.");});},0);
    void fetch("/api/customer/security",{cache:"no-store",credentials:"same-origin"})
      .then(async r=>r.ok?(await r.json()):null).then(v=>{if(!cancelled&&v)setSecurity(v);}).catch(()=>undefined);
    return()=>{cancelled=true;window.clearTimeout(timer);};
  },[refresh]);

  async function saveAddresses(addresses:Address[]){
    setBusy("address");setError("");setNotice("");
    try{
      const response=await fetch("/api/customer/account",{
        method:"PUT",headers:{"content-type":"application/json"},credentials:"same-origin",
        body:JSON.stringify({savedAddresses:addresses}),
      });
      const result=await response.json() as {account?:Account;error?:string};
      if(!response.ok||!result.account)throw new Error(result.error||"Unable to save address.");
      setData(current=>current?{...current,account:{...current.account,savedAddresses:result.account!.savedAddresses}}:current);
      setNotice("Saved delivery details updated.");
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to save address.");}
    finally{setBusy("");}
  }

  async function addAddress(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(!data)return;
    const f=new FormData(event.currentTarget);
    const next:Address={
      id:crypto.randomUUID().replace(/-/g,""),
      label:String(f.get("label")||"Delivery address"),
      recipientName:String(f.get("recipientName")||""),
      phone:String(f.get("phone")||""),
      district:String(f.get("district")||""),
      area:String(f.get("area")||""),
      address:String(f.get("address")||""),
      landmark:String(f.get("landmark")||""),
    };
    const form=event.currentTarget;
    await saveAddresses([...data.account.savedAddresses,next].slice(0,5));
    form.reset();
  }

  async function orderAction(action:"cancellation"|"delivery-issue",orderNumber:string){
    setBusy(action+orderNumber);setError("");setNotice("");
    try{
      const response=await fetch("/api/customer/post-purchase/action",{
        method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",
        body:JSON.stringify({action,orderNumber}),
      });
      const result=await response.json() as {caseId?:string;error?:string};
      if(!response.ok)throw new Error(result.error||"Request could not be submitted.");
      setNotice("Request submitted to Aloyri Customer Service · "+result.caseId);
      await refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:"Request could not be submitted.");}
    finally{setBusy("");}
  }

  async function replyToCase(event:FormEvent<HTMLFormElement>,caseId:string){
    event.preventDefault();const form=event.currentTarget;const f=new FormData(form);const note=String(f.get("note")||"");
    setBusy("reply"+caseId);setError("");setNotice("");
    try{
      const response=await fetch("/api/customer/post-purchase/action",{
        method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",
        body:JSON.stringify({action:"support-reply",caseId,note}),
      });
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error||"Reply could not be sent.");
      form.reset();setNotice("Reply added to your support case.");await refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:"Reply could not be sent.");}
    finally{setBusy("");}
  }

  async function revokeOthers(){
    setBusy("security");setError("");setNotice("");
    try{
      const response=await fetch("/api/customer/security",{method:"POST",credentials:"same-origin"});
      const result=await response.json() as {revoked?:number;error?:string};
      if(!response.ok)throw new Error(result.error||"Unable to update sessions.");
      setNotice((result.revoked||0)+" other session(s) signed out.");
      const latest=await fetch("/api/customer/security",{cache:"no-store",credentials:"same-origin"});
      if(latest.ok)setSecurity(await latest.json());
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to update sessions.");}
    finally{setBusy("");}
  }

  if(!data)return <p className="py-8 text-sm text-[#321f1c]/65" role="status">{error||"Loading your account…"}</p>;
  return <section className="grid gap-5">
    {notice?<p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</p>:null}
    {error?<p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>:null}
    {section==="orders" ? <div>
      <h2 className="mb-5 text-xl font-semibold">Your orders</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.orders.length?data.orders.map(row=>row.ok?<article key={row.order.orderNumber} className="rounded-2xl border border-[#713a35]/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{row.order.orderNumber}</p><p className="mt-1 text-xs text-[#321f1c]/60">{dateLabel(row.order.created)} · {row.order.items.reduce((s,i)=>s+i.qty,0)} items</p></div><span className={"rounded-full px-3 py-1 text-xs "+statusClass(row.order.status)}>{row.order.status}</span></div>
          <p className="mt-4 text-xl font-semibold">{formatPrice(row.order.total)}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[#713a35]">
            <Link href={"/track-order?order="+encodeURIComponent(row.order.orderNumber)}>Track order</Link>
            <a href={"/api/customer/order-summary?order="+encodeURIComponent(row.order.orderNumber)}>Download summary</a>
            {row.canRequestCancellation?<button disabled={busy!==""} onClick={()=>void orderAction("cancellation",row.order.orderNumber)}>Request cancellation</button>:null}
            {row.canReportDeliveryIssue?<button disabled={busy!==""} onClick={()=>void orderAction("delivery-issue",row.order.orderNumber)}>Report delivery issue</button>:null}
            {row.canRequestReturn?<Link href={"/return-request?order="+encodeURIComponent(row.order.orderNumber)}>Request return</Link>:null}
          </div>
        </article>:<article key={row.orderNumber} className="rounded-2xl border p-5"><p className="text-sm font-semibold">{row.orderNumber}</p><p className="mt-2 text-sm">Live status is temporarily unavailable. Your order remains in your account.</p></article>):<div className="rounded-2xl border border-[#713a35]/10 bg-white p-8"><p>No orders yet.</p><p className="mt-2 text-sm text-[#321f1c]/60">Orders placed while signed in will appear here.</p><Link href="/shop" className="mt-5 inline-block text-sm font-semibold text-[#713a35]">Start shopping →</Link></div>}
      </div>
      {data.pagination.pages>1?<nav aria-label="Order history pages" className="mt-5 flex flex-wrap items-center gap-4 text-sm"><button disabled={data.pagination.page<=1} onClick={()=>void refresh(data.pagination.page-1).catch(()=>setError("Unable to load orders."))}>Previous</button><span>Page {data.pagination.page} of {data.pagination.pages}</span><button disabled={data.pagination.page>=data.pagination.pages} onClick={()=>void refresh(data.pagination.page+1).catch(()=>setError("Unable to load orders."))}>Next</button></nav>:null}
    </div>:null}
    {section==="addresses"?<div className="rounded-2xl border border-[#713a35]/10 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-semibold">Delivery addresses</h2><p className="mt-2 text-sm text-[#321f1c]/60">Save up to five addresses to your account for quicker checkout.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{data.account.savedAddresses.map(address=><article key={address.id} className="rounded-xl bg-[#f5e8e2] p-4 text-sm leading-6"><div className="flex justify-between gap-3"><strong>{address.label}</strong><button disabled={busy!==""} onClick={()=>void saveAddresses(data.account.savedAddresses.filter(row=>row.id!==address.id))} className="text-xs text-[#713a35] underline">Remove</button></div><p className="mt-2">{address.recipientName} · {address.phone}</p><p>{address.address}, {address.area}, {address.district}</p>{address.landmark?<p>{address.landmark}</p>:null}</article>)}</div>
      {data.account.savedAddresses.length<5?<details className="mt-6" open={!data.account.savedAddresses.length}><summary className="cursor-pointer text-sm font-semibold text-[#713a35]">Add a delivery address</summary><form onSubmit={addAddress} className="mt-5 grid gap-4 sm:grid-cols-2">
        {[['label','Address label','Home / Office',false,40],['recipientName','Recipient name','',true,120],['phone','Mobile number','',true,30],['district','District','',true,80],['area','Area / Thana / Upazila','',true,160],['landmark','Landmark (optional)','',false,200]].map(([name,label,placeholder,required,max])=><label key={String(name)} className="grid gap-2 text-sm">{String(label)}<input name={String(name)} required={Boolean(required)} placeholder={String(placeholder)} maxLength={Number(max)} className="h-11 rounded-lg border border-[#713a35]/15 px-3"/></label>)}
        <label className="grid gap-2 text-sm sm:col-span-2">Full delivery address<textarea name="address" required minLength={8} maxLength={500} className="min-h-24 rounded-lg border border-[#713a35]/15 p-3"/></label>
        <button disabled={busy!==""} className="w-fit rounded-full bg-[#713a35] px-5 py-3 text-sm font-semibold text-white sm:col-span-2">{busy==="address"?"Saving…":"Save address"}</button>
      </form></details>:null}
    </div>:null}
    {section==="support"?<div className="rounded-2xl border border-[#713a35]/10 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Support & returns</h2><Link href="/support-request" className="text-sm font-semibold text-[#713a35]">New support request →</Link></div>
      <div className="mt-5 grid gap-4">{data.supportCases.length?data.supportCases.map(row=><article key={row.id} className="rounded-xl border border-[#713a35]/10 p-4"><div className="flex flex-wrap justify-between gap-3"><strong className="text-sm capitalize">{row.category.replaceAll('-',' ')}</strong><span className={"rounded-full px-3 py-1 text-xs "+statusClass(row.status)}>{row.status}</span></div>{row.orderNumber?<p className="mt-2 text-xs">{row.orderNumber}</p>:null}<p className="mt-3 text-sm">{row.note}</p><div className="mt-3 border-l pl-3">{row.events.slice(-4).map(event=><p key={event.id} className="mt-2 text-xs text-[#321f1c]/60">{dateLabel(event.at)} · {event.detail||event.type}</p>)}</div>{!["resolved","closed"].includes(row.status)?<form onSubmit={event=>void replyToCase(event,row.id)} className="mt-4 flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Reply to {row.id}</span><input name="note" required minLength={2} maxLength={1200} placeholder="Write a reply" className="h-11 w-full rounded-lg border px-3 text-sm"/></label><button disabled={busy!==""} className="rounded-full bg-[#713a35] px-4 text-sm font-semibold text-white">Reply</button></form>:null}</article>):<p className="text-sm text-[#321f1c]/60">No support or return requests yet.</p>}</div>
    </div>:null}
    {section==="preferences"?<div className="rounded-2xl border border-[#713a35]/10 bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold">Account security</h2>{security?<><p className="mt-3 text-sm">{security.activeSessions} active sessions</p><button disabled={busy!==""||security.activeSessions<=1} onClick={()=>void revokeOthers()} className="mt-4 rounded-full border border-[#713a35]/15 px-5 py-3 text-sm text-[#713a35] disabled:opacity-40">Sign out other sessions</button></>:<p className="mt-3 text-sm">Loading session information…</p>}{data.productAlerts.length?<div className="mt-6"><h3 className="text-sm font-semibold">Product alerts</h3>{data.productAlerts.map(alert=><Link key={alert.id} href={"/product/"+alert.productSlug} className="mt-3 block text-sm text-[#713a35]">{alert.productName} · {alert.kinds.map(kind=>kind==="back-in-stock"?"Back in stock":"Price drop").join(' · ')}</Link>)}</div>:null}</div>:null}
  </section>;
}
