"use client";

import type { InfoPageContent, StorefrontConfig } from "@/lib/storefront-admin-store";

const field = "mt-1 min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm";
const button = "min-h-10 rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold disabled:opacity-30";
function dirty() { document.getElementById("admin-content")?.dispatchEvent(new Event("admin:dirty")); }

export function PreviewContentProperties({content, onChange}: {content: InfoPageContent; onChange: (value: InfoPageContent) => void}) {
  function update(value: InfoPageContent) { dirty(); onChange(value); }
  function section(index: number, next: InfoPageContent["sections"][number]) {
    update({...content, sections: content.sections.map((item, i) => i === index ? next : item)});
  }
  function move(index: number, direction: number) {
    const sections = [...content.sections];
    [sections[index], sections[index + direction]] = [sections[index + direction], sections[index]];
    update({...content, sections});
  }
  return <div className="space-y-4" aria-label="Existing page text editor">
    <p className="text-sm font-semibold">Page content</p>
    {(["eyebrow", "title", "intro"] as const).map(key => <label key={key} className="block text-xs font-semibold capitalize">{key}<textarea rows={key === "intro" ? 3 : 1} className={field} value={content[key]} maxLength={key === "intro" ? 1000 : key === "title" ? 180 : 120} onChange={event => update({...content, [key]: event.target.value})}/></label>)}
    {content.sections.map((item, index) => <fieldset key={index} className="space-y-3 rounded-xl border border-black/10 p-3">
      <legend className="text-xs font-semibold">Section {index + 1}</legend>
      <label className="block text-xs font-semibold">Section {index + 1} heading<input className={field} maxLength={180} value={item.title} onChange={event => section(index, {...item, title:event.target.value})}/></label>
      <label className="block text-xs font-semibold">Paragraphs (one per line)<textarea className={field} rows={5} maxLength={9608} value={(item.paragraphs || []).join("\n")} onChange={event => section(index, {...item, paragraphs: event.target.value.split(/\r?\n/)})}/></label>
      <label className="block text-xs font-semibold">Bullets (one per line)<textarea className={field} rows={4} maxLength={9616} value={(item.bullets || []).join("\n")} onChange={event => section(index, {...item, bullets:event.target.value.split(/\r?\n/)})}/></label>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={index === 0} onClick={() => move(index,-1)} aria-label={`Move section ${index+1} up`}>↑ Up</button><button type="button" className={button} disabled={index === content.sections.length-1} onClick={() => move(index,1)} aria-label={`Move section ${index+1} down`}>↓ Down</button><button type="button" className={button} onClick={() => update({...content,sections:content.sections.filter((_,i)=>i!==index)})}>Remove section {index+1}</button></div>
    </fieldset>)}
    <button type="button" className={button} disabled={content.sections.length>=12} onClick={() => update({...content,sections:[...content.sections,{title:"",paragraphs:[],bullets:[]}]})}>Add section</button>
  </div>;
}

export function PreviewFaqProperties({content, onChange}: {content: StorefrontConfig["faq"]; onChange:(value:StorefrontConfig["faq"])=>void}) {
  function update(value: StorefrontConfig["faq"]) { dirty(); onChange(value); }
  return <div className="space-y-4" aria-label="FAQ properties">
    {(["eyebrow","title","intro"] as const).map(key=><label key={key} className="block text-xs font-semibold capitalize">{key}<textarea className={field} maxLength={key==="intro"?1000:key==="title"?180:120} rows={key==="intro"?3:1} value={content[key]} onChange={event=>update({...content,[key]:event.target.value})}/></label>)}
    {content.items.map((item,index)=><fieldset key={index} className="space-y-3 rounded-xl border border-black/10 p-3"><legend className="text-xs font-semibold">Question {index+1}</legend>
      {(["question","answer"] as const).map(key=><label key={key} className="block text-xs font-semibold capitalize">{key}<textarea className={field} rows={key==="answer"?4:2} required maxLength={key==="answer"?1200:400} value={item[key]} onChange={event=>update({...content,items:content.items.map((row,i)=>i===index?{...row,[key]:event.target.value}:row)})}/></label>)}
      <div className="flex flex-wrap gap-2">{([-1,1] as const).map(direction=><button key={direction} type="button" className={button} disabled={index+direction<0 || index+direction>=content.items.length} aria-label={`Move question ${index+1} ${direction===-1?"up":"down"}`} onClick={()=>{const items=[...content.items];[items[index],items[index+direction]]=[items[index+direction],items[index]];update({...content,items});}}>{direction===-1?"↑ Up":"↓ Down"}</button>)}<button type="button" className={button} onClick={()=>update({...content,items:content.items.filter((_,i)=>i!==index)})}>Remove question {index+1}</button></div>
    </fieldset>)}
    <button type="button" className={button} disabled={content.items.length>=30} onClick={()=>update({...content,items:[...content.items,{question:"",answer:""}]})}>Add question</button>
  </div>;
}
