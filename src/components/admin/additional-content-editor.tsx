"use client";
import { useState } from "react";
import { customBlockId, visualComponentCatalog, type VisualBlock, type VisualLayout } from "@/lib/visual-builder";
const field="min-h-11 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";
const button="min-h-10 rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold disabled:opacity-30";

/** Ordinary fields preserve and edit saved extra content without a visual builder. */
export function AdditionalContentEditor({initialLayout,mediaPaths=[]}:{initialLayout:VisualLayout;mediaPaths?:string[]}) {
  const [layout,setLayout]=useState(initialLayout);
  function update(next:VisualLayout){setLayout(next);document.getElementById("admin-content")?.dispatchEvent(new Event("admin:dirty"));}
  function edit(id:string,key:keyof VisualBlock,value:VisualBlock[keyof VisualBlock]){update({...layout,blocks:layout.blocks.map(row=>row.id===id?{...row,[key]:value}:row)});}
  const rows=layout.order.flatMap(id=>layout.blocks.filter(row=>customBlockId(row.id)===id));
  function move(id:string,direction:number){const index=layout.order.indexOf(id);const next=index+direction;if(next<0||next>=layout.order.length)return;const order=[...layout.order];[order[index],order[next]]=[order[next],order[index]];update({...layout,order});}
  function add(){const row:VisualBlock={id:"content-"+crypto.randomUUID(),kind:"text",enabled:true,eyebrow:"",title:"",body:"",ctaLabel:"",ctaHref:"",imagePath:"",items:[],align:"left",tone:"light",spacing:"regular",hideMobile:false,hideDesktop:false};update({...layout,blocks:[...layout.blocks,row],order:[...layout.order,customBlockId(row.id)]});}
  return <details className="admin-editor-section"><summary>Additional content ({rows.length})</summary><div className="space-y-4 p-5">
    <input type="hidden" name="layout" value={JSON.stringify(layout)}/>
    <p className="text-sm text-black/60">Edit extra text, images and questions added to this page. Move them up or down in the page order.</p>
    {rows.map((row,index)=><fieldset key={row.id} className="space-y-4 rounded-xl border border-black/10 p-4"><legend className="px-1 text-sm font-semibold">{row.title || `Extra section ${index+1}`}</legend>
      <label className="grid gap-2 text-sm">Content type<select className={field} value={row.kind} onChange={event=>edit(row.id,"kind",event.target.value as VisualBlock["kind"])}>{visualComponentCatalog.map(item=><option key={item.kind} value={item.kind}>{item.name}</option>)}</select></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={row.enabled} onChange={event=>edit(row.id,"enabled",event.target.checked)}/>Show this section</label>
      {(["eyebrow","title","body","ctaLabel","ctaHref"] as const).map(key=><label key={key} className="grid gap-2 text-sm">{{eyebrow:"Short label",title:"Heading",body:"Text",ctaLabel:"Button label",ctaHref:"Button link"}[key]}<textarea aria-label={{eyebrow:"Extra short label",title:"Extra heading",body:"Extra text",ctaLabel:"Extra button label",ctaHref:"Extra button link"}[key]} className={field} rows={key==="body"?4:1} maxLength={{eyebrow:100,title:180,body:1200,ctaLabel:70,ctaHref:200}[key]} value={row[key]} onChange={event=>edit(row.id,key,event.target.value)}/></label>)}
      {row.kind==="image" && <label className="grid gap-2 text-sm">Image<select className={field} value={row.imagePath} onChange={event=>edit(row.id,"imagePath",event.target.value)}><option value="">Choose image</option>{[...new Set([row.imagePath,...mediaPaths].filter(Boolean))].map(path=><option key={path} value={path}>{path.replace(/^media\//,"")}</option>)}</select></label>}
      {["faq","quote","features"].includes(row.kind) && <label className="grid gap-2 text-sm">{row.kind==="faq"?"Questions and answers (question|answer, one per line)":"Items (one per line)"}<textarea className={field} rows={5} maxLength={2000} value={row.items.join("\n")} onChange={event=>edit(row.id,"items",event.target.value.split(/\r?\n/).slice(0,8))}/></label>}
      <div className="grid gap-4 sm:grid-cols-3">{(["tone","align","spacing"] as const).map(key=><label key={key} className="grid gap-2 text-sm">{{tone:"Background",align:"Text alignment",spacing:"Spacing"}[key]}<select className={field} value={row[key]} onChange={event=>edit(row.id,key,event.target.value as VisualBlock[typeof key])}>{(key==="tone"?["light","rose","sage","dark"]:key==="align"?["left","center"]:["compact","regular","spacious"]).map(option=><option key={option}>{option}</option>)}</select></label>)}</div>
      {(["hideMobile","hideDesktop"] as const).map(key=><label key={key} className="flex gap-2 text-sm"><input type="checkbox" checked={row[key]} onChange={event=>edit(row.id,key,event.target.checked)}/>{key==="hideMobile"?"Hide on phones":"Hide on desktop"}</label>)}
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={layout.order.indexOf(customBlockId(row.id))===0} onClick={()=>move(customBlockId(row.id),-1)}>Move up</button><button type="button" className={button} disabled={layout.order.indexOf(customBlockId(row.id))===layout.order.length-1} onClick={()=>move(customBlockId(row.id),1)}>Move down</button><button type="button" className={button} onClick={()=>update({...layout,order:layout.order.filter(id=>id!==customBlockId(row.id)),blocks:layout.blocks.filter(item=>item.id!==row.id)})}>Remove extra section</button></div>
    </fieldset>)}
    <button type="button" className={button} disabled={rows.length>=32} onClick={add}>Add extra section</button>
  </div></details>;
}
