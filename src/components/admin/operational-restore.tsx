"use client";
import { useState } from "react";

export function OperationalRestore() {
  const [snapshot, setSnapshot] = useState<unknown>();
  const [review, setReview] = useState<{records:number;namespace:string;sha256:string}>();
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function validate(file?: File) {
    setReview(undefined); setSnapshot(undefined); setConfirm("");
    if (!file) return;
    if (file.size > 50*1024*1024) { setMessage("Choose a backup smaller than 50 MB."); return; }
    setBusy(true);
    try {
      const value: unknown = JSON.parse(await file.text());
      const response = await fetch("/api/admin/operations/data-backup", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({snapshot:value,dryRun:true})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSnapshot(value); setReview(result); setMessage("Backup validated. Review the record count and namespace before restoring.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Backup validation failed."); }
    finally { setBusy(false); }
  }
  async function restore() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/operations/data-backup", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({snapshot,confirm})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(`${result.restored} records restored. A rollback snapshot was saved. Sign in again if your session was revoked.`); setReview(undefined); setSnapshot(undefined);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Restore failed."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 grid gap-3">
    <p className="text-xs">Restore replaces website records. For production, enable maintenance mode, deploy it and let active requests finish before restoring. Disable maintenance after verification. Uploaded product images remain in media storage.</p>
    <label className="text-sm">Validate an operational backup<input className="mt-2 block" type="file" accept="application/json,.json" disabled={busy} onChange={event=>void validate(event.target.files?.[0])}/></label>
    {review ? <><p className="text-xs">{review.records} records · {review.namespace} · checksum {review.sha256}</p><label className="text-sm">Type RESTORE {review.sha256}<input className="mt-2 block w-full rounded border p-2" value={confirm} onChange={event=>setConfirm(event.target.value)}/></label><button className="w-fit rounded border px-3 py-2 text-sm" disabled={busy || confirm!=="RESTORE "+review.sha256} onClick={()=>void restore()}>Restore reviewed backup</button></> : null}
    <p role="status" className="text-sm">{message}</p>
  </div>;
}
