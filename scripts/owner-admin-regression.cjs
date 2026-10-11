/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const records = new Map();
let cookie = '';
const original = Module._load;
Module._load = function(name,parent,isMain) {
 if(name==='server-only')return {};
 if(name==='next/headers')return {cookies:async()=>({get:()=>({value:cookie})})};
 if(name==='next/navigation')return {redirect:url=>{throw new Error('REDIRECT:'+url)}};
 if(name==='@/lib/structured-record-store')return {withAtomicRecordMutation:async fn=>fn()};
 if(name==='@/lib/storefront-admin-store')return {readPrivateJson:async key=>structuredClone(records.get(key)||null),writePrivateJson:async(key,value)=>records.set(key,structuredClone(value)),writeAdminAuditEvent:async()=>{}};
 return original.call(this,name,parent,isMain);
};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const auth=require(path.resolve('src/lib/admin-auth.ts'));
(async()=>{
 await auth.createAdminOwner('fixture-owner','Long-fixture-password-123');
 const owner=await auth.authenticateAdmin('fixture-owner','Long-fixture-password-123'); assert.equal(owner.role,'owner');
 cookie=await auth.createAdminSession('fixture-owner'); assert.equal((await auth.currentAdmin()).role,'owner');
 const [key,directory]=[...records].find(([,record])=>record.version===2 && record.accounts);
 const legacyStaff={...directory.accounts[0],id:'legacy-staff',username:'fixture-staff',role:'content-editor',permissions:[...auth.ADMIN_PERMISSIONS]};
 directory.accounts.push(legacyStaff); records.set(key,directory);
 assert.equal(await auth.authenticateAdmin('fixture-staff','Long-fixture-password-123'),null);
 await assert.rejects(auth.createAdminSession('fixture-staff'),/not available/);
 assert.equal(auth.hasAdminPermission(legacyStaff,'dashboard.view'),false);
 const payload=Buffer.from(JSON.stringify({accountId:legacyStaff.id,username:legacyStaff.username,expiresAt:Date.now()+100000})).toString('base64url');
 const signature=require('node:crypto').createHmac('sha256',Buffer.from(legacyStaff.sessionSecret,'base64url')).update(payload).digest('base64url');
 assert.equal(await auth.verifyAdminSession(payload+'.'+signature),null);
 cookie=payload+'.'+signature; await assert.rejects(auth.requireAdminPermission('settings.edit'),/REDIRECT:\/admin\/login/);
 cookie=await auth.createAdminSession('fixture-owner'); assert.equal((await auth.requireAdminPermission('settings.edit')).role,'owner');
 assert.equal((await auth.listAdminOwners()).length,1);
 assert.equal(auth.createStaffAccount,undefined);
 for(const file of ['src/app/admin/staff/page.tsx','src/app/admin/staff/new/page.tsx','src/app/admin/staff/actions.ts'])assert.equal(fs.existsSync(file),false);
 console.log('Owner-only administration: owner login, rejected staff login and existing session, authorization and removed staff routes PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
