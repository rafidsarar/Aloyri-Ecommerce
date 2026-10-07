/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader intercepts TypeScript modules for disposable PostgreSQL tests. */
/* Execute production record-store SQL against disposable embedded PostgreSQL. */
const { PGlite } = require('@electric-sql/pglite');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const db = new PGlite();
const root=path.resolve(__dirname,'../src');
let crmCalls=0, failAccount=true;
let draftPreview=false, draftSignal=null;
const linked=new Map();
const originalLoad=Module._load;
function sql(strings,...values){
 const query=strings.reduce((result,part,i)=>result+part+(i<values.length?'$'+(i+1):''),'');
 return {query,values,then(resolve,reject){return db.query(query,values).then(result=>result.rows).then(resolve,reject);}};
}
sql.transaction=queries=>db.transaction(async tx=>{const results=[];for(const q of queries)results.push((await tx.query(q.query,q.values)).rows);return results;});
Module._load=function(name,parent,isMain){
 if(name==='server-only')return {};
 if(name==='next/server')return {connection:async()=>{}};
 if(name==='next/headers')return {draftMode:async()=>{if(draftSignal)throw draftSignal;return {isEnabled:draftPreview};}};
 if(name==='@neondatabase/serverless')return {neon:()=>sql};
 if(name==='@/lib/customer-auth')return {recordCustomerOrderForAccount:async(id,order)=>{if(failAccount)throw new Error('injected-account-failure');linked.set(id+':'+order.orderNumber,order);}};
 if(name==='@/lib/cart-recovery')return {cancelPendingCartRecoveries:async()=>{}};
 if(name==='@/lib/crm-order-integration')return {createCrmWebsiteOrder:async()=>{crmCalls++;return {ok:true,status:201,body:{orderId:'crm-fixture',orderNumber:'WEB-FIXTURE-12345678',total:500}};}};
 if(name==='@/lib/storefront-admin-store'){
  const store=originalLoad.call(this,path.join(root,'lib/structured-record-store.ts'),parent,isMain);
  return {blobConfigured:()=>true,readPrivateJson:store.readStructuredJson,writePrivateJson:store.writeStructuredJson,listPrivateJsonRecords:store.listStructuredJson,writeAdminAuditEvent:async()=>{}};
 }
 if(name.startsWith('@/'))name=path.join(root,name.slice(2)+'.ts');
 return originalLoad.call(this,name,parent,isMain);
};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);};
process.env.DATABASE_URL='postgresql://disposable/test';delete process.env.VERCEL_ENV;
const store=require('../src/lib/structured-record-store.ts');
const {ownsSupportCase}=require('../src/lib/support-ownership.ts');
const payments=require('../src/lib/payment-settlement.ts');
const delivery=require('../src/lib/courier-shipment.ts');
const sync=require('../src/lib/order-sync.ts');
const publishing=require('../src/lib/storefront-admin-store.ts');
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await check('draft stays private until publish and subsequent reads see new content',async()=>{
  const initial=await publishing.readPublishedStorefrontConfig();
  initial.homepage.headline='Published fixture';await publishing.saveStorefrontConfig(initial);
  const draft=structuredClone(initial);draft.homepage.headline='New draft fixture';await publishing.saveDraftStorefrontConfig(draft);
  assert.equal((await publishing.readStorefrontConfig()).homepage.headline,'Published fixture');
  draftPreview=true;assert.equal((await publishing.readStorefrontConfig()).homepage.headline,'New draft fixture');draftPreview=false;
  await publishing.publishDraftStorefront('fixture-owner','Acceptance fixture');
  assert.equal((await publishing.readStorefrontConfig()).homepage.headline,'New draft fixture');
 });
 await check('draft-mode rendering signals escape instead of freezing published content',async()=>{
  const {DynamicServerError}=require('next/dist/client/components/hooks-server-context');
  draftSignal=new DynamicServerError('draftMode');
  await assert.rejects(publishing.readStorefrontConfig(),error=>error===draftSignal);
  draftSignal=null;
 });
 await check('phone/email cannot grant unrelated support access',async()=>{
  assert.equal(ownsSupportCase({phone:'01700000000',email:'owner@test'},'account-a',new Set()),false);
  assert.equal(ownsSupportCase({accountId:'account-b',orderNumber:'WEB-OWNED'},'account-a',new Set(['WEB-OWNED'])),false);
  assert.equal(ownsSupportCase({orderNumber:'WEB-OWNED'},'account-a',new Set(['WEB-OWNED'])),true);
 });
 await check('concurrent read-modify-write retains both increments',async()=>{
  await store.writeStructuredJson('test/counter',{n:0});
  await Promise.all([1,2].map(()=>store.withRecordRetry(async()=>{const row=await store.readStructuredJson('test/counter');await new Promise(r=>setTimeout(r,5));await store.writeStructuredJson('test/counter',{n:row.n+1});})));
  assert.equal((await store.readStructuredJson('test/counter')).n,2);
 });
 await check('atomic create has exactly one winner',async()=>{
  const results=await Promise.all([1,2,3].map(n=>store.createStructuredJsonOnce('test/once',{n})));
  assert.equal(results.filter(Boolean).length,1);
 });
 await check('lease prevents concurrent workers and rejects wrong-token release',async()=>{
  const a=await store.acquireRecordLease('test/lease');assert.ok(a);assert.equal(await store.acquireRecordLease('test/lease'),null);
  await store.releaseRecordLease('test/lease','wrong');assert.equal(await store.acquireRecordLease('test/lease'),null);
  await store.releaseRecordLease('test/lease',a);const b=await store.acquireRecordLease('test/lease');assert.ok(b);await store.releaseRecordLease('test/lease',b);
 });
 await check('shared rate limits coordinate parallel requests',async()=>{
  const results=await Promise.all(Array.from({length:10},()=>store.sharedRateAllowed('test/ip',3,60000)));
  assert.equal(results.filter(Boolean).length,3);
 });
 await check('settlement replay survives display-event truncation',async()=>{
  await payments.recordOrderSettlement({externalOrderId:'external123',crmOrderId:'crm',orderNumber:'WEB-PAYMENT-12345678',method:'COD',orderTotal:500});
  const first={eventId:'event-original',orderNumber:'WEB-PAYMENT-12345678',paymentMethod:'COD',state:'paid',orderTotal:500};
  await payments.applyCrmSettlementEvent(first);
  for(let n=0;n<55;n++)await payments.applyCrmSettlementEvent({...first,eventId:'event-'+String(n).padStart(8,'0')});
  assert.equal((await payments.applyCrmSettlementEvent(first)).duplicate,true);
  await assert.rejects(payments.applyCrmSettlementEvent({...first,orderTotal:501}),/EVENT_ID_CONFLICT/);
 });
 await check('courier duplicate does not count another failed attempt',async()=>{
  const e={eventId:'event-courier-0001',orderNumber:'WEB-COURIER-12345678',orderTotal:500,paymentMethod:'COD',provider:'manual',state:'delivery_failed',failureReason:'customer_unreachable'};
  // Seed the valid preceding state through the production model.
  await delivery.recordShipmentIntent({externalOrderId:'courier123',crmOrderId:'crm',orderNumber:e.orderNumber,paymentMethod:'COD',orderTotal:500});
  const record=await delivery.getCourierShipment(e.orderNumber);record.state='out_for_delivery';await store.writeStructuredJson('delivery/shipments/'+e.orderNumber+'.json',record);
  const result=await delivery.applyCrmCourierEvent(e);assert.equal(result.record.deliveryAttempts,1);
  assert.equal((await delivery.applyCrmCourierEvent(e)).duplicate,true);
 });
 await check('confirmed CRM order recovers account and intelligence writes without another order',async()=>{
  const payload={externalOrderId:'checkout-fixture-123',customer:{name:'Fixture',phone:'01700000000',email:'fixture@example.test',address:'Fixture address',district:'Dhaka',area:'Fixture'},items:[{productId:'fixture',qty:1}],deliveryZone:'inside-dhaka',paymentMethod:'COD'};
  const first=await sync.submitDurableOrder(payload,'account-fixture');assert.equal(first.ok,true);
  assert.equal((await store.readStructuredJson('sync/orders/'+payload.externalOrderId+'.json')).state,'pending');
  failAccount=false;await sync.processOrderIntent(payload.externalOrderId);assert.equal(crmCalls,1);assert.equal(linked.size,1);
  assert.equal((await store.readStructuredJson('sync/orders/'+payload.externalOrderId+'.json')).state,'completed');
  assert.equal((await sync.submitDurableOrder({...payload,items:[{productId:'fixture',qty:2}]},'account-fixture')).status,409);
 });
 await check('complete snapshot checksum and atomic restore retain operational records',async()=>{
  const snapshot=await store.createOperationalSnapshot();assert.ok(snapshot.records.some(r=>r.pathname.startsWith('payments/')));assert.ok(snapshot.records.some(r=>r.pathname.startsWith('delivery/')));
  await assert.rejects(store.validateOperationalSnapshot({...snapshot,sha256:'0'.repeat(64)}),/CHECKSUM/);
  await store.writeStructuredJson('test/after-backup',{n:1});await store.restoreOperationalSnapshot(snapshot);
  assert.equal(await store.readStructuredJson('test/after-backup'),null);
  assert.ok(await store.readStructuredJson('sync/orders/checkout-fixture-123.json'));
 });
 await check('production restore requires maintenance and namespace cannot cross environments',async()=>{
  const snapshot=await store.createOperationalSnapshot();process.env.VERCEL_ENV='production';
  await assert.rejects(store.restoreOperationalSnapshot(snapshot),/MAINTENANCE/);
  process.env.ALOYRI_MAINTENANCE_ENABLED='1';await assert.rejects(store.restoreOperationalSnapshot(snapshot),/NAMESPACE/);
  await assert.rejects(store.writeStructuredJson('test/write',{}),/MAINTENANCE/);
  const before=crmCalls; assert.equal((await sync.processOrderIntent("checkout-fixture-123")).status,503); assert.equal(crmCalls,before);
  delete process.env.VERCEL_ENV;delete process.env.ALOYRI_MAINTENANCE_ENABLED;
 });
 console.log(passed+' audit regression checks passed against disposable PostgreSQL.');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.close());
