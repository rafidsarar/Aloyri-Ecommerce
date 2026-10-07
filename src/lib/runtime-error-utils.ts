// Old deployments recorded Next.js render control flow as a CRM failure.
// Keep those records in storage while excluding them from incident counts.
export function isHistoricalRenderSignal(record: {source: string; message: string}) {
  return record.source === "crm.catalog" && /^Dynamic server usage: Route .+couldn't be rendered statically because it used (?:no-store|revalidate: 0) fetch /.test(record.message);
}
