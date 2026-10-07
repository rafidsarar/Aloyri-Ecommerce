"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalog";
import { readCustomerOrders, rememberCustomerOrder } from "@/lib/customer-orders";

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

export function CustomerPostPurchaseCenter(){
  const [data,setData]=useState<Data|null>(null);
  const [security,setSecurity]=useState<{activeSessions:number;currentSessionCreatedAt:string;currentSessionExpiresAt:string}|null>(null);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");

  const refresh = useCallback(async (page = 1) => {
    const response=await fetch("/api/customer/post-purchase?page="+page,{cache:"no-store",credentials:"same-origin"});
    if(response.status===401){setData(null);return;}
    if(!response.ok)throw new Error("Unable to load account history.");
    const next=await response.json() as Data;
    setData(next);
    for(const row of next.orders){
      if(row.ok){
        rememberCustomerOrder({
          orderNumber:row.order.orderNumber,
          phone:row.phone,
          createdAt:row.order.created,
          items:[],
          total:row.order.total,
        });
      }
    }
  }, []);

  useEffect(()=>{
    let cancelled=false;
    const local=readCustomerOrders().slice(0,12).map(row=>({orderNumber:row.orderNumber,phone:row.phone}));
    void fetch("/api/customer/post-purchase",{
      method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",
      body:JSON.stringify({orders:local}),
    }).catch(()=>undefined).finally(()=>{
      if(!cancelled)void refresh().catch(()=>undefined);
    });
    void fetch("/api/customer/security",{cache:"no-store",credentials:"same-origin"})
      .then(async r=>r.ok?(await r.json()):null).then(v=>{if(!cancelled&&v)setSecurity(v);}).catch(()=>undefined);
    return()=>{cancelled=true;};
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
    await saveAddresses([...data.account.savedAddresses,next].slice(0,5));
    event.currentTarget.reset();
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
    event.preventDefault();const f=new FormData(event.currentTarget);const note=String(f.get("note")||"");
    setBusy("reply"+caseId);setError("");setNotice("");
    try{
      const response=await fetch("/api/customer/post-purchase/action",{
        method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",
        body:JSON.stringify({action:"support-reply",caseId,note}),
      });
      const result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error||"Reply could not be sent.");
      event.currentTarget.reset();setNotice("Reply added to your support case.");await refresh();
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

  if(!data)return null;

  return <section className="mt-8 grid gap-6">
    <div className="rounded-[1.6rem] border border-[#713a35]/10 bg-white/70 p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#713a35]/45">Orders & aftercare</p><h2 className="display mt-2 text-4xl">Your post-purchase center.</h2></div>
        <Link href="/wishlist" className="rounded-full border border-[#713a35]/15 px-4 py-2 text-xs font-semibold text-[#713a35]">Wishlist & alerts</Link>
      </div>
      {notice?<p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700" aria-live="polite">{notice}</p>:null}
      {error?<p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700" role="alert">{error}</p>:null}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {data.orders.length?data.orders.map(row=>row.ok?<article key={row.order.orderNumber} className="rounded-[1.25rem] border border-[#713a35]/10 p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-[#713a35]">{row.order.orderNumber}</p><p className="mt-1 text-xs text-[#321f1c]/45">{dateLabel(row.order.created)} · {row.order.items.reduce((s,i)=>s+i.qty,0)} item(s)</p></div><span className={"rounded-full px-3 py-1 text-[10px] font-semibold "+statusClass(row.order.status)}>{row.order.status}</span></div>
          <p className="mt-4 text-xl font-semibold">{formatPrice(row.order.total)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={"/track-order?order="+encodeURIComponent(row.order.orderNumber)} className="rounded-full bg-[#713a35] px-4 py-2 text-xs font-semibold text-white">Track</Link>
            <a href={"/api/customer/order-summary?order="+encodeURIComponent(row.order.orderNumber)} className="rounded-full border border-[#713a35]/15 px-4 py-2 text-xs font-semibold text-[#713a35]">Download summary</a>
            {row.canRequestCancellation?<button disabled={busy!==""} onClick={()=>void orderAction("cancellation",row.order.orderNumber)} className="rounded-full border border-[#713a35]/15 px-4 py-2 text-xs font-semibold text-[#713a35]">Request cancellation</button>:null}
            {row.canReportDeliveryIssue?<button disabled={busy!==""} onClick={()=>void orderAction("delivery-issue",row.order.orderNumber)} className="rounded-full border border-[#713a35]/15 px-4 py-2 text-xs font-semibold text-[#713a35]">Report delivery issue</button>:null}
            {row.canRequestReturn?<Link href={"/return-request?order="+encodeURIComponent(row.order.orderNumber)} className="rounded-full border border-[#713a35]/15 px-4 py-2 text-xs font-semibold text-[#713a35]">Return review</Link>:null}
          </div>
        </article>:<article key={row.orderNumber} className="rounded-[1.25rem] border border-[#713a35]/10 p-5"><p className="font-mono text-xs">{row.orderNumber}</p><p className="mt-2 text-xs text-[#321f1c]/45">Live CRM status is temporarily unavailable. This order remains linked to your account.</p></article>):<p className="text-sm text-[#321f1c]/50">No cloud-linked orders yet. Orders placed while signed in are added automatically; valid recent orders on this browser are claimed after sign-in.</p>}
      </div>
      <nav aria-label="Order history pages" className="mt-5 flex items-center gap-4"><button disabled={data.pagination.page <= 1} onClick={()=>void refresh(data.pagination.page-1).catch(()=>setError("Unable to load orders."))}>Previous</button><span>Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} orders</span><button disabled={data.pagination.page >= data.pagination.pages} onClick={()=>void refresh(data.pagination.page+1).catch(()=>setError("Unable to load orders."))}>Next</button></nav>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/70 p-5 sm:p-7">
        <p className="text-sm font-semibold">Saved delivery addresses</p>
        <p className="mt-1 text-xs leading-5 text-[#321f1c]/45">Store up to five delivery addresses in your secure account. Checkout can continue using device-local details until you choose a saved address.</p>
        <div className="mt-4 grid gap-2">{data.account.savedAddresses.map(address=><div key={address.id} className="rounded-xl bg-[#f5e8e2] p-4 text-xs leading-5"><div className="flex justify-between gap-3"><strong>{address.label}</strong><button onClick={()=>void saveAddresses(data.account.savedAddresses.filter(row=>row.id!==address.id))} className="text-[#713a35] underline">Remove</button></div><p className="mt-2">{address.recipientName} · {address.phone}</p><p>{address.address}, {address.area}, {address.district}</p>{address.landmark?<p>{address.landmark}</p>:null}</div>)}</div>
        {data.account.savedAddresses.length<5?<form onSubmit={addAddress} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input name="label" placeholder="Home / Office" maxLength={40} className="h-11 rounded-xl border border-[#713a35]/12 px-3 text-sm"/>
          <input name="recipientName" required placeholder="Recipient name" maxLength={120} className="h-11 rounded-xl border border-[#713a35]/12 px-3 text-sm"/>
          <input name="phone" required placeholder="Mobile number" maxLength={30} className="h-11 rounded-xl border border-[#713a35]/12 px-3 text-sm"/>
          <input name="district" required placeholder="District" maxLength={80} className="h-11 rounded-xl border border-[#713a35]/12 px-3 text-sm"/>
          <input name="area" required placeholder="Area / Thana / Upazila" maxLength={160} className="h-11 rounded-xl border border-[#713a35]/12 px-3 text-sm"/>
          <input name="landmark" placeholder="Landmark (optional)" maxLength={200} className="h-11 rounded-xl border border-[#713a35]/12 px-3 text-sm"/>
          <textarea name="address" required minLength={8} maxLength={500} placeholder="Full delivery address" className="min-h-24 rounded-xl border border-[#713a35]/12 p-3 text-sm sm:col-span-2"/>
          <button disabled={busy==="address"} className="w-fit rounded-full bg-[#713a35] px-5 py-3 text-xs font-semibold text-white sm:col-span-2">Save address</button>
        </form>:null}
      </section>

      <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:p-7">
        <p className="text-sm font-semibold">Account security</p>
        {security?<><p className="mt-3 text-3xl font-semibold">{security.activeSessions}</p><p className="text-xs text-[#321f1c]/45">active secure session(s)</p><p className="mt-4 text-xs leading-5 text-[#321f1c]/48">This session expires {dateLabel(security.currentSessionExpiresAt)}. Sign out everywhere else if you used a shared device.</p><button disabled={busy==="security"||security.activeSessions<=1} onClick={()=>void revokeOthers()} className="mt-4 rounded-full bg-[#713a35] px-5 py-3 text-xs font-semibold text-white disabled:opacity-40">Sign out other sessions</button></>:<p className="mt-3 text-xs text-[#321f1c]/45">Loading session security…</p>}
        <p className="mt-6 text-xs leading-5 text-[#321f1c]/48">Aloyri uses Google sign-in. Product back-in-stock and price-drop alerts are tied to your signed-in account and can be managed from product pages.</p>
        {data.productAlerts.length?<div className="mt-4 grid gap-2">{data.productAlerts.map(alert=><Link key={alert.id} href={"/product/"+alert.productSlug} className="rounded-xl bg-white/65 p-3 text-xs"><strong>{alert.productName}</strong><span className="mt-1 block text-[#321f1c]/45">{alert.kinds.map(kind=>kind==="back-in-stock"?"Back in stock":"Price drop").join(" · ")}</span></Link>)}</div>:null}
      </section>
    </div>

    <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/70 p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold">Customer service timeline</p><p className="mt-1 text-xs text-[#321f1c]/45">Returns, refunds, delivery issues and support requests connected to your account.</p></div><Link href="/support-request" className="rounded-full border border-[#713a35]/15 px-4 py-2 text-xs font-semibold text-[#713a35]">New support request</Link></div>
      <div className="mt-5 grid gap-4">{data.supportCases.length?data.supportCases.map(row=><article key={row.id} className="rounded-xl border border-[#713a35]/10 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-sm capitalize">{row.category.replace("-"," ")}</strong>{row.orderNumber?<span className="ml-2 font-mono text-[10px] text-[#713a35]">{row.orderNumber}</span>:null}</div><span className={"rounded-full px-3 py-1 text-[10px] font-semibold "+statusClass(row.status)}>{row.status.replace("-"," ")}</span></div><p className="mt-2 text-xs leading-5 text-[#321f1c]/55">{row.note}</p>{row.events.length?<div className="mt-3 border-l border-[#713a35]/15 pl-3">{row.events.slice(-4).map(event=><p key={event.id} className="mt-2 text-[11px] leading-5 text-[#321f1c]/45">{dateLabel(event.at)} · {event.detail||event.type}</p>)}</div>:null}{!["resolved","closed"].includes(row.status)?<form onSubmit={event=>void replyToCase(event,row.id)} className="mt-4 flex gap-2"><input name="note" required minLength={2} maxLength={1200} placeholder="Reply to this case" className="h-10 min-w-0 flex-1 rounded-xl border border-[#713a35]/12 px-3 text-xs"/><button disabled={busy==="reply"+row.id} className="rounded-full bg-[#713a35] px-4 text-xs font-semibold text-white">Reply</button></form>:null}</article>):<p className="text-sm text-[#321f1c]/50">No support or return cases are linked to this account.</p>}</div>
    </section>
  </section>;
}
