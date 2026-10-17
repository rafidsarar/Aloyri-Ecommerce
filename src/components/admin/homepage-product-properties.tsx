"use client";

import { useState } from "react";
import { campaignScheduleState } from "@/lib/merchandising";
import type { HomepageMerchandisingSection, StorefrontConfig } from "@/lib/storefront-admin-store";
const field="mt-1 min-h-11 w-full rounded-lg border border-black/15 px-3 py-2 text-sm";
const button="min-h-10 rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold disabled:opacity-30";
const kinds=["bestsellers","featured","new-arrivals","collection","campaign"] as const;
export function HomepageProductProperties({config}:{config:StorefrontConfig}) {
  const [sections,setSections]=useState(config.merchandising.homepageSections);
  function update(next:HomepageMerchandisingSection[]) {setSections(next);document.getElementById("admin-content")?.dispatchEvent(new Event("admin:dirty"));}
  function edit(index:number,key:keyof HomepageMerchandisingSection,value:string|boolean|number) {update(sections.map((row,i)=>i===index?{...row,[key]:value}:row));}
  return <details id="home-products" className="admin-editor-section"><summary>Products, campaigns & collection placement</summary><div className="space-y-4 p-3">
    <input type="hidden" name="homepageMerchandising" value={JSON.stringify(sections)}/>
    <p className="text-xs leading-5 text-black/60">Add a Campaign section and choose its reference to show a saved campaign on the homepage. Its active status and schedule still apply.</p>
    <label className="block text-xs font-semibold">Out-of-stock products<select name="outOfStockMode" className={field} defaultValue={config.merchandising.outOfStockMode}><option value="keep">Keep original position</option><option value="push-down">Move to bottom</option><option value="hide">Hide</option></select></label>
    <label className="block text-xs font-semibold">Shop product order<select name="shopSortMode" className={field} defaultValue={config.merchandising.shopSortMode}><option value="priority">Manual priority first</option><option value="featured">Featured first</option></select></label>
    {sections.map((row,index)=><fieldset key={row.id} className="space-y-3 rounded-xl border border-black/10 p-3"><legend className="text-xs font-semibold">Placement {index+1}</legend>
      <label className="flex gap-2 text-xs font-semibold"><input type="checkbox" checked={row.enabled} onChange={event=>edit(index,"enabled",event.target.checked)}/>Show this placement</label>
      <label className="block text-xs font-semibold">Placement type<select className={field} value={row.kind} onChange={event=>{update(sections.map((item,i)=>i===index?{...item,kind:event.target.value as HomepageMerchandisingSection["kind"],referenceId:undefined}:item));}}>{kinds.map(kind=><option key={kind} value={kind}>{kind}</option>)}</select></label>
      {(row.kind==="campaign" || row.kind==="collection") && <label className="block text-xs font-semibold">{row.kind==="campaign"?"Campaign":"Collection"} reference<select className={field} required value={row.referenceId || ""} onChange={event=>edit(index,"referenceId",event.target.value)}><option value="">Choose {row.kind}</option>{(row.kind==="campaign"?config.merchandising.campaigns:config.merchandising.collections).map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      {row.kind==="campaign" && row.referenceId && <p className="text-xs" role="status">Schedule: {(() => {const campaign=config.merchandising.campaigns.find(item=>item.id===row.referenceId);return campaign?campaignScheduleState(campaign):"missing reference";})()}. A hidden, scheduled or ended campaign will not appear live.</p>}
      {(["eyebrow","title","copy"] as const).map(key=><label key={key} className="block text-xs font-semibold capitalize">Placement {key}<textarea className={field} rows={key==="copy"?3:1} maxLength={key==="copy"?700:key==="title"?180:120} value={row[key]} onChange={event=>edit(index,key,event.target.value)}/></label>)}
      {row.kind==="bestsellers" ? <p className="rounded-lg bg-[#fff5ef] px-3 py-2 text-xs leading-5 text-[#713a35]">All-products carousel: every active CRM product is included. The product limit does not apply to this placement.</p> : <label className="block text-xs font-semibold">Maximum products<input type="number" min={1} max={12} className={field} value={row.maxProducts} onChange={event=>edit(index,"maxProducts",Number(event.target.value))}/></label>}
      <div className="flex flex-wrap gap-2">{([-1,1] as const).map(direction=><button key={direction} type="button" className={button} disabled={index+direction<0 || index+direction>=sections.length} aria-label={`Move placement ${index+1} ${direction===-1?"up":"down"}`} onClick={()=>{const next=[...sections];[next[index],next[index+direction]]=[next[index+direction],next[index]];update(next);}}>{direction===-1?"↑ Up":"↓ Down"}</button>)}<button type="button" className={button} onClick={()=>update(sections.filter((_,i)=>i!==index))}>Remove placement {index+1}</button></div>
    </fieldset>)}
    <button type="button" className={button} disabled={sections.length>=20} onClick={()=>update([...sections,{id:"section-"+crypto.randomUUID(),kind:"featured",enabled:true,eyebrow:"",title:"",copy:"",maxProducts:6}])}>Add homepage placement</button>
    <p className="text-xs text-black/60">Save website changes to publish placements. Prices and stock come from CRM.</p>
  </div></details>;
}
