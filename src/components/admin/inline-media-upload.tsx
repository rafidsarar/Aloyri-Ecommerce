"use client";

import { useRef, useState } from "react";
import { uploadPreviewMedia } from "@/app/admin/actions";

/** Upload immediately; choosing the resulting image remains an unsaved website edit. */
export function InlineMediaUpload({onUploaded}:{onUploaded:(path:string)=>void}) {
  const input=useRef<HTMLInputElement>(null);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState("");
  const [failed,setFailed]=useState(false);
  async function upload() {
    const file=input.current?.files?.[0];
    if(!file) {setFailed(true);setMessage("Choose an image first.");return;}
    setPending(true);setMessage("");setFailed(false);
    try {
      const data=new FormData();data.set("image",file);
      const result=await uploadPreviewMedia(data);
      if(result.ok) {onUploaded(result.pathname);setMessage(result.warning || "Image uploaded. Save website changes to publish your selection.");if(input.current)input.current.value="";}
      else {setFailed(true);setMessage(result.error);}
    } catch {setFailed(true);setMessage("Upload failed. Try again.");}
    finally {setPending(false);}
  }
  return <details className="rounded-xl border border-black/10 p-3"><summary className="cursor-pointer text-sm font-semibold">Upload an image</summary><div className="mt-3 space-y-3">
    <label className="block text-xs font-semibold">New website image<input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={pending} className="mt-2 block w-full text-xs"/></label>
    <button type="button" disabled={pending} onClick={upload} className="min-h-11 rounded-lg border border-black/15 px-3 text-xs font-semibold disabled:opacity-40">{pending?"Uploading…":"Upload image here"}</button>
    {message && <p role={failed?"alert":"status"} className="break-words text-xs">{message}</p>}
  </div></details>;
}
