/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const path=require('node:path');

let allowed=new Set(),crmOnline=true,uploaded=0,mutations=0;
let record={version:1,images:{}};
const brand={id:'crm-brand-simple',name:'Simple'};
const old=Module._load;
Module._load=function(name,parent,isMain){
  if(name==='next/cache')return {revalidatePath:()=>{}};
  if(name==='next/navigation')return {redirect:url=>{throw Error('REDIRECT:'+url)}};
  if(name==='@/lib/admin-auth')return {requireAdminPermission:async permission=>{
    if(!allowed.has(permission))throw Error('FORBIDDEN:'+permission);
    return {username:'fixture-admin'};
  }};
  if(name==='@/lib/crm-catalog-integration')return {fetchCrmCatalog:async()=>crmOnline?{ok:true,body:{brands:[brand]}}:{ok:false}};
  if(name==='@/lib/storefront-admin-store')return {
    uploadStorefrontMedia:async file=>{uploaded++;return 'media/upload.webp'},
    writeAdminAuditEvent:async()=>{},
  };
  if(name==='@/lib/brand-image-store')return {
    readBrandImageAssignments:async()=>structuredClone(record),
    writeBrandImageAssignments:async value=>{record=structuredClone(value);mutations++},
  };
  if(name==='@/lib/structured-record-store')return {withAtomicRecordMutation:async fn=>fn()};
  return old.call(this,name,parent,isMain);
};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,file);
const {saveBrandPhoto}=require(path.resolve('src/app/admin/brands/actions.ts'));
const upload=()=>{const form=new FormData();form.set('brandId',brand.id);
  form.set('image',new File(['valid-test-data'],'brand.webp',{type:'image/webp'}));return form;};
(async()=>{
  allowed=new Set(['media.edit']);
  await assert.rejects(saveBrandPhoto(upload()),/FORBIDDEN:merchandising.edit/);
  allowed=new Set(['merchandising.edit']);
  await assert.rejects(saveBrandPhoto(upload()),/FORBIDDEN:media.edit/);
  assert.equal(mutations,0);assert.equal(uploaded,0);
  allowed=new Set(['merchandising.edit','media.edit']);
  const forged=upload();forged.set('brandId','website-created-brand');
  await assert.rejects(saveBrandPhoto(forged),/REDIRECT:.*not in CRM/);
  assert.equal(mutations,0);
  crmOnline=false;
  await assert.rejects(saveBrandPhoto(upload()),/REDIRECT:.*Cannot verify/);
  assert.equal(uploaded,0);
  crmOnline=true;
  await assert.rejects(saveBrandPhoto(upload()),/REDIRECT:\/admin\/brands\?saved=1/);
  assert.equal(uploaded,1);assert.equal(record.images[brand.id],'media/upload.webp');
  const remove=new FormData();remove.set('brandId',brand.id);remove.set('remove','on');
  await assert.rejects(saveBrandPhoto(remove),/REDIRECT:\/admin\/brands\?saved=1/);
  assert.equal(record.images[brand.id],undefined);assert.equal(uploaded,1);
  assert.equal(mutations,2);
  console.log('Brand media permissions, CRM source of truth, upload/remove and fail-closed sync PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
