import "server-only";
import { createCrmWebsiteOrder, type WebsiteOrderPayload, type CrmOrderResult } from "@/lib/crm-order-integration";
import { createStructuredJsonOnce, readStructuredJson, writeStructuredJson, listStructuredJson, acquireRecordLease, releaseRecordLease } from "@/lib/structured-record-store";
import { recordOrderSettlement } from "@/lib/payment-settlement";
import { recordShipmentIntent } from "@/lib/courier-shipment";
import { recordCustomerOrderForAccount } from "@/lib/customer-auth";
import { cancelPendingCartRecoveries } from "@/lib/cart-recovery";

type Intent = { payload: WebsiteOrderPayload; accountId?: string; state: "pending"|"completed"|"attention"; result?: CrmOrderResult; attempts: number; createdAt: string; updatedAt: string; nextAttemptAt?: string; error?: string; };
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+":"+canonical(v)).join(",") + "}";
  return JSON.stringify(value);
}
const PREFIX="sync/orders/";
function path(id: string) { return PREFIX+id+".json"; }
export async function submitDurableOrder(payload: WebsiteOrderPayload, accountId?: string) {
  const now=new Date().toISOString();
  await createStructuredJsonOnce(path(payload.externalOrderId), {payload, accountId, state:"pending",attempts:0,createdAt:now,updatedAt:now} satisfies Intent);
  const stored=await readStructuredJson<Intent>(path(payload.externalOrderId));
  if (!stored || canonical(stored.payload)!==canonical(payload) || stored.accountId!==accountId) return {ok:false as const,status:409,body:{error:"This checkout reference already belongs to another request.",code:"CHECKOUT_CONFLICT"}};
  return processOrderIntent(payload.externalOrderId);
}
export async function processOrderIntent(id: string) {
  const token=await acquireRecordLease(path(id));
  if (!token) return {ok:false as const,status:503,body:{error:"Your order is being checked. Retry this same checkout shortly.",code:"ORDER_SYNC_BUSY"}};
  try {
    const intent=await readStructuredJson<Intent>(path(id));
    if (!intent) throw new Error("ORDER_INTENT_NOT_FOUND");
    if (intent.state==="completed" && intent.result) return {ok:true as const,status:200,body:intent.result};
    intent.attempts++;
    if (!intent.result) {
      const crm=await createCrmWebsiteOrder(intent.payload);
      if (!crm.ok) {
        intent.state=crm.status>=500||crm.status===429?"pending":"attention";
        intent.error=crm.body.code||"CRM_ORDER_FAILED";
        intent.nextAttemptAt=new Date(Date.now()+Math.min(3600000,30000*2**Math.min(intent.attempts,7))).toISOString();
        intent.updatedAt=new Date().toISOString();
        await writeStructuredJson(path(id),intent); return crm;
      }
      intent.result=crm.body;
      await writeStructuredJson(path(id),intent);
    }
    const order=intent.result;
    try {
      const settlement=await recordOrderSettlement({externalOrderId:id,crmOrderId:order.orderId,orderNumber:order.orderNumber,method:intent.payload.paymentMethod,orderTotal:order.total});
      const shipment=await recordShipmentIntent({externalOrderId:id,crmOrderId:order.orderId,orderNumber:order.orderNumber,paymentMethod:intent.payload.paymentMethod,orderTotal:order.total});
      if (!settlement||!shipment) throw new Error("ORDER_RECORDING_UNAVAILABLE");
      if(intent.accountId) await recordCustomerOrderForAccount(intent.accountId,{orderNumber:order.orderNumber,phone:intent.payload.customer.phone,createdAt:intent.createdAt,total:order.total});
      if(intent.payload.customer.email) await cancelPendingCartRecoveries(intent.payload.customer.email);
      intent.state="completed"; delete intent.error; delete intent.nextAttemptAt;
    } catch(error) {
      intent.state=intent.attempts>=10?"attention":"pending";
      intent.error=error instanceof Error?error.message.slice(0,160):"ORDER_EFFECT_FAILED";
      intent.nextAttemptAt=new Date(Date.now()+60000).toISOString();
    }
    intent.updatedAt=new Date().toISOString(); await writeStructuredJson(path(id),intent);
    return {ok:true as const,status:200,body:order};
  } finally { await releaseRecordLease(path(id),token); }
}
export async function runOrderSync(limit=50) {
  let offset=0, processed=0; const errors:string[]=[];
  while(processed<limit){
    const rows=await listStructuredJson<Intent>(PREFIX,100,offset); if(!rows.length)break; offset+=rows.length;
    for(const row of rows){if(row.value.state!=="pending" || Date.parse(row.value.nextAttemptAt||"")>Date.now())continue;
      try{await processOrderIntent(row.value.payload.externalOrderId);}catch{errors.push(row.value.payload.externalOrderId);}
      if(++processed>=limit)break;
    }
    if(rows.length<100)break;
  }
  return {processed,errors};
}
export async function orderSyncHealth() {
  let offset=0; const totals={pending:0,completed:0,attention:0}; const issues:Array<{id:string;state:string;error?:string;updatedAt:string}>=[];
  for(;;){const rows=await listStructuredJson<Intent>(PREFIX,200,offset); for(const row of rows){totals[row.value.state]++;if(row.value.state!=="completed")issues.push({id:row.value.payload.externalOrderId,state:row.value.state,error:row.value.error,updatedAt:row.value.updatedAt});} offset+=rows.length;if(rows.length<200)break;}
  return {totals,issues};
}
