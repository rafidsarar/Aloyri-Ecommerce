/* eslint-disable @typescript-eslint/no-require-imports -- Runs real server actions with isolated permissions and persistence. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve('src');
const original=Module._load;
let saved=null,permissions=[],allow=true;
const redirect=url=>{const error=new Error('REDIRECT:'+url);error.url=url;throw error;};
let config;
Module._load=function(name,parent,isMain){
 if(name==='server-only')return {};
 if(name==='next/cache')return {revalidatePath:()=>{}};
 if(name==='next/headers')return {};
 if(name==='next/navigation')return {redirect};
 if(name==='@/lib/admin-auth')return {requireAdminPermission:async permission=>{permissions.push(permission);if(!allow)redirect('/admin/login');return {username:'fixture-owner'};}};
 if(name==='@/lib/admin-save')return {saveAdminStorefront:async(data,updater,options)=>{assert.equal(options.expectedUpdatedAt,'fixture-version');const next=updater(structuredClone(config));saved=next;config=next;}};
 if(name==='@/lib/storefront-admin-store')return {uploadStorefrontMedia:async()=> 'media/fixture-upload.webp',writeAdminAuditEvent:async()=>{}};
 if(name.startsWith('@/')) name=path.join(root,name.slice(2)+'.ts');
 return original.call(this,name,parent,isMain);
};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
// The actual defaults are needed without initializing a live datastore.
const source=fs.readFileSync(path.join(root,'lib/storefront-admin-store.ts'),'utf8');
const defaults=source.slice(source.indexOf('export type ContentSection'),source.indexOf('const PUBLISHED_CONFIG_PATH'));
const defaultsModule=new Module(path.join(root,'lib/fixture-defaults.ts'),module);
defaultsModule.filename=path.join(root,'lib/fixture-defaults.ts');
defaultsModule._compile(ts.transpileModule('import {defaultPrivacyContent,defaultTermsContent} from "@/lib/default-policy-content";import {defaultPresentation} from "@/lib/storefront-presentation";import {defaultHomepageOrder} from "@/lib/homepage-builder";import {defaultVisualLayout,visualPageKeys} from "@/lib/visual-builder";import {defaultRecommendationConfig} from "@/lib/recommendations";'+defaults,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,defaultsModule.filename);
config=structuredClone(defaultsModule.exports.defaultStorefrontConfig);
const actions=require('../src/app/admin/actions.ts');
function form(page,extras={}) {const data=new FormData();data.set('pageKey',page);data.set('editorView','layout');data.set('layout',JSON.stringify(page==='home'?config.homepage.visualLayout:config.visualPages[page]));data.set('storefrontVersion','fixture-version');for(const [key,value] of Object.entries(extras))data.set(key,value);return data;}
async function save(data){await assert.rejects(actions.saveVisualBuilder(data),error=>error.url?.includes('saved=1'));}
(async()=>{
 const page={eyebrow:'Owner page',title:'Owner privacy',intro:'Intro',sections:[{title:'Added section',paragraphs:['Complete paragraph'],bullets:['Full bullet']}]};
 await save(form('privacy',{pageContent:JSON.stringify(page)}));assert.deepEqual(saved.pages.privacy,page);assert.ok(permissions.includes('pages.edit'));
 const faq={eyebrow:'FAQ',title:'Owner FAQ',intro:'FAQ intro',items:[{question:'New question?',answer:'Complete answer.'}]};
 await save(form('faq',{faqContent:JSON.stringify(faq)}));assert.deepEqual(saved.faq,faq);
 config.merchandising.campaigns=[{id:'puja',title:'Puja Uthshob'}];
 const placements=[{id:'puja-placement',kind:'campaign',enabled:true,referenceId:'puja',eyebrow:'',title:'Puja',copy:'Festival',maxProducts:6}];
 await save(form('home',{homepageMerchandising:JSON.stringify(placements),outOfStockMode:'hide',shopSortMode:'featured'}));assert.deepEqual(saved.merchandising.homepageSections,placements);assert.ok(permissions.includes('merchandising.edit'));
 const before=structuredClone(config);saved=null;
 const bad=[{...placements[0],referenceId:'missing'}];
 await assert.rejects(actions.saveVisualBuilder(form('home',{homepageMerchandising:JSON.stringify(bad)})),/missing-reference/);assert.equal(saved,null);assert.deepEqual(config,before);
 const longPage={...page,sections:[{title:'Bad',paragraphs:['x'.repeat(1201)]}]};await assert.rejects(actions.saveVisualBuilder(form('privacy',{pageContent:JSON.stringify(longPage)})),/error=invalid/);assert.equal(saved,null);
 const data=form('about',{settingsControls:'1',announcement:'Owner announcement',footerDescription:'Owner footer',supportEmail:'owner@example.test',supportPhone:'123',supportHours:'Daily',appearance:'sage',contentWidth:'comfortable',desktopColumns:'3',showAnnouncement:'on',stickyHeader:'on',showRoutine:'on',showHeroImageOnMobile:'on',navLabel0:'Discover',navHref0:'/shop',pageContent:JSON.stringify(page)});
 await save(data);assert.equal(saved.site.appearance,'sage');assert.deepEqual(saved.presentation.navigation,[{label:'Discover',href:'/shop'}]);assert.equal(saved.presentation.contentWidth,'comfortable');assert.deepEqual(saved.pages.about,page);assert.ok(permissions.includes('settings.edit'));
 saved=null;data.set('navHref0','https://evil.test');await assert.rejects(actions.saveVisualBuilder(data),/REDIRECT:\/admin\/builder/);assert.equal(saved,null);
 allow=false;await assert.rejects(actions.saveVisualBuilder(form('about',{pageContent:JSON.stringify(page)})),/\/admin\/login/);await assert.rejects(actions.uploadPreviewMedia(new FormData()),/\/admin\/login/);
 allow=true;const image=new FormData();image.set('image',new File(['fixture'],'banner.webp',{type:'image/webp'}));assert.deepEqual(await actions.uploadPreviewMedia(image),{ok:true,pathname:'media/fixture-upload.webp'});assert.ok(permissions.includes('media.edit'));
 const large=new FormData();large.set('image',new File([new Uint8Array(4*1024*1024+1)],'large.webp',{type:'image/webp'}));assert.deepEqual(await actions.uploadPreviewMedia(large),{ok:false,error:'Use images up to 4 MB.'});
 console.log('Preview Properties: complete pages/FAQ, campaign references, navigation, atomic save boundary, validation, permissions and inline media PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
