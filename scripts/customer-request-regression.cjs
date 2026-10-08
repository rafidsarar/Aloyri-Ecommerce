/* eslint-disable @typescript-eslint/no-require-imports -- Compile production routes with isolated integration stubs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
let session={account:{id:'fixture',displayName:'Fixture',email:'fixture@example.test',orderRefs:[{orderNumber:'WEB-FIXTURE-12345678',phone:'01712345678'}]}};
let status='New',crmResult={ok:true,status:201,body:{requestId:'crm-request',status:'Requested',duplicate:false}};
const calls=[],support=[];
const original=Module._load;
Module._load=function(name,parent,isMain){
 if(name==='@/lib/customer-auth')return {currentCustomerSession:async()=>session};
 if(name==='@/lib/crm-tracking-integration')return {fetchCrmOrderTracking:async()=>({ok:true,body:{status,items:[{qty:2}]}})};
 if(name==='@/lib/crm-return-integration')return {submitCrmReturnRequest:async input=>{calls.push(input);return crmResult;}};
 if(name==='@/lib/support-cases')return {createCustomerSupportCase:async input=>{support.push(input);return {id:'support',status:'open'};},listSupportCases:async()=>[]};
 if(name==='@/lib/support-ownership')return {ownsSupportCase:()=>false};
 return original.call(this,name,parent,isMain);
};
require.extensions['.ts']=function(mod,file){mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);};
const {POST}=require(path.resolve(__dirname,'../src/app/api/customer/post-purchase/action/route.ts'));
function request(body={},origin='https://store.example.test'){return new Request('https://store.example.test/api/customer/post-purchase/action',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({action:'cancellation',orderNumber:'WEB-FIXTURE-12345678',...body})});}
(async()=>{
 let response=await POST(request());assert.equal(response.status,201);assert.equal((await response.json()).caseId,'crm-request');
 assert.equal(calls[0].requestType,'cancellation');assert.equal(calls[0].phone,'01712345678');assert.deepEqual(calls[0].items,[{line:0,qty:2}]);assert.equal(support.length,1);
 crmResult={ok:false,status:503,body:{error:'Unavailable'}};response=await POST(request());assert.equal(response.status,503);assert.equal(support.length,1);
 status='Packed';let before=calls.length;assert.equal((await POST(request())).status,409);assert.equal(calls.length,before);
 status='New';assert.equal((await POST(request({orderNumber:'WEB-OTHER-12345678'}))).status,404);assert.equal(calls.length,before);
 assert.equal((await POST(request({},'https://other.example.test'))).status,403);
 session=null;assert.equal((await POST(request())).status,401);
 console.log('Customer request route checks passed: CRM-first acceptance, payload, failed sync, fulfillment, ownership, origin and authentication.');
})().catch(error=>{console.error(error);process.exitCode=1;});
