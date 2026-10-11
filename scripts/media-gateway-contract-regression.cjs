/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/lib/media-storage.ts", "utf8");
assert.match(source, /searchParams\.set\("action", "upload"\)/, "Upload must target Edge Function action query");
assert.match(source, /"x-object-path": pathname/, "Upload must identify storage object");
assert.match(source, /"content-type": file\.type/, "Upload must preserve image MIME type");
assert.match(source, /new Uint8Array\(await file\.arrayBuffer\(\)\)/, "Upload must send raw image bytes");
assert.doesNotMatch(source, /fetch\(url \+ "\/upload"/, "Do not call unsupported Edge Function subpath");
assert.match(source, /endpoint\.searchParams\.set\("path", pathname\)/, "Reads must use gateway query routing");
console.log("Media gateway upload/read contract regression: PASS");
const ts = require('typescript');
const Module = require('node:module');
const original = Module._load;
Module._load = function(name,parent,isMain) { if (name === 'server-only') return {}; return original.call(this,name,parent,isMain); };
const compiled = new Module('media-contract');
compiled._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'media-contract');
process.env.SUPABASE_MEDIA_GATEWAY_URL = 'https://gateway.example/functions/v1/media';
process.env.SUPABASE_MEDIA_GATEWAY_KEY = 'fixture';
(async () => {
 for (const status of [404,405]) {
  const calls=[];
  global.fetch=async url => { calls.push(new URL(url)); return calls.length===1 ? new Response('',{status}) : Response.json([{name:'fixture.png',metadata:{size:512},created_at:'2026-10-11'}]); };
  assert.deepEqual(await compiled.exports.listMediaObjects('preview/media/'),[{pathname:'preview/media/fixture.png',size:512,uploadedAt:'2026-10-11'}]);
  assert.equal(calls[0].pathname,'/functions/v1/media'); assert.equal(calls[0].searchParams.get('action'),'list'); assert.equal(calls[0].searchParams.get('pagination'),'1'); assert.equal(calls[1].pathname,'/functions/v1/media/list'); assert.equal(calls[1].searchParams.get('prefix'),'preview/media/');
 }
 global.fetch=async()=>new Response('',{status:401});
 await assert.rejects(compiled.exports.listMediaObjects('preview/media/'), /401/);
 global.fetch=async()=>Response.json({objects:[{pathname:'media/private.png',size:1},{pathname:'preview/media/fixture.png',size:2}]});
 assert.equal((await compiled.exports.listMediaObjects('preview/media/')).length,1);
 global.fetch=async()=>Response.json({objects:[],nextCursor:'repeated',hasMore:true});
 await assert.rejects(compiled.exports.listMediaObjects('preview/media/'), /MEDIA_CURSOR_REPEATED/);
 const gatewaySource=fs.readFileSync('supabase/functions/aloyri-media-gateway/index.ts','utf8');
 let handler;
 const offsets=[];
 const fixtures=Array.from({length:205},(_,i)=>({name:'fixture-'+String(i).padStart(3,'0')+'.png',metadata:{size:i+1},created_at:'2026-10-11'}));
 global.Deno={env:{get:key=>key==='SUPABASE_MEDIA_GATEWAY_KEY'?'fixture':'fixture-env'},serve:fn=>{handler=fn;}};
 Module._load=function(name,parent,isMain){
  if(name.startsWith('jsr:'))return {};
  if(name==='npm:jose@6')return {createRemoteJWKSet:()=>({}),jwtVerify:async()=>{throw new Error('Unauthorized');}};
  if(name==='npm:@supabase/supabase-js@2')return {createClient:()=>({storage:{from:()=>({list:async(folder,{offset,limit,sortBy})=>{assert.equal(folder,'preview/media');assert.deepEqual(sortBy,{column:'name',order:'desc'});offsets.push(offset);return {data:fixtures.slice(offset,offset+limit)};}})}})};
  return original.call(this,name,parent,isMain);
 };
 const gatewayModule=new Module('gateway-contract');
 gatewayModule._compile(ts.transpileModule(gatewaySource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,'gateway-contract');
 global.fetch=async(url,options)=>handler(new Request(url,options));
 const listed=await compiled.exports.listMediaObjects('preview/media/');
 assert.equal(listed.length,205);assert.equal(new Set(listed.map(item=>item.pathname)).size,205);assert.deepEqual(offsets,[0,100,200]);
 assert.equal((await handler(new Request('https://gateway.example?action=list&pagination=1&prefix=preview/media/&cursor=-1',{headers:{'x-aloyri-storage-key':'fixture'}}))).status,400);
 assert.equal((await handler(new Request('https://gateway.example?action=list&prefix=preview/media/'))).status,401);
 const legacy=await handler(new Request('https://gateway.example?action=list&prefix=preview/media/',{headers:{'x-aloyri-storage-key':'fixture'}}));assert.equal((await legacy.json()).length,100);
 console.log('Media gateway pagination: 205 images, three pages, namespace, malformed cursor, authentication and legacy compatibility PASS');
 console.log('Media listing regression: 404/405 invocation fallback, namespace isolation, authorization failure and cursor guard PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
