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
  assert.equal(calls[1].pathname,'/functions/v1/media'); assert.equal(calls[1].searchParams.get('action'),'list'); assert.equal(calls[1].searchParams.get('prefix'),'preview/media/');
 }
 global.fetch=async()=>new Response('',{status:401});
 await assert.rejects(compiled.exports.listMediaObjects('preview/media/'), /401/);
 global.fetch=async()=>Response.json({objects:[{pathname:'media/private.png',size:1},{pathname:'preview/media/fixture.png',size:2}]});
 assert.equal((await compiled.exports.listMediaObjects('preview/media/')).length,1);
 global.fetch=async()=>Response.json({objects:[],nextCursor:'repeated',hasMore:true});
 await assert.rejects(compiled.exports.listMediaObjects('preview/media/'), /MEDIA_CURSOR_REPEATED/);
 console.log('Media listing regression: 404/405 invocation fallback, namespace isolation, authorization failure and cursor guard PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
