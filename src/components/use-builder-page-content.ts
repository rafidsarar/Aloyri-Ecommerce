"use client";

import { useEffect, useState } from "react";

/** Drafts are local to an embedded, same-origin preview and never written here. */
export function useBuilderPageContent<T extends {title:string;eyebrow:string;intro:string}>(initial:T, key:"content"|"faqContent") {
  const [draft,setDraft]=useState<T | null>(null);
  useEffect(()=>{
    if(window.parent===window || new URLSearchParams(window.location.search).get("builderPreview")!=="1")return;
    function receive(event:MessageEvent) {
      if(event.origin!==window.location.origin || event.source!==window.parent || event.data?.type!=="aloyri-builder-page-draft")return;
      const content=event.data[key];
      if(content && typeof content.title==="string" && typeof content.eyebrow==="string" && typeof content.intro==="string" && (key==="content"?Array.isArray(content.sections):Array.isArray(content.items)))setDraft(content);
    }
    window.addEventListener("message",receive);
    window.parent.postMessage({type:"aloyri-builder-public-ready"},window.location.origin);
    return ()=>window.removeEventListener("message",receive);
  },[key]);
  return draft || initial;
}
