/* eslint-disable @typescript-eslint/no-require-imports -- Test production route functions against isolated authentication and CRM fixtures. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const root = path.resolve(__dirname, '../src');
const original = Module._load;
const orders = new Map();
const created = [];
const analytics = [];
let allowRequests = true;
let quoteAvailable = true;
let session = {
  session: { method: 'google', createdAt: new Date().toISOString() },
  account: {
    id: 'fixture-account', displayName: 'Fixture Customer',
    email: 'verified@example.test', phone: '01712345678', savedAddresses: [],
  },
};

Module._load = function(name, parent, isMain) {
  if (name === 'server-only') return {};
  if (name === '@/lib/customer-auth') return {currentCustomerSession:async()=>session};
  if (name === '@/lib/request-rate-limit') return {rateAllowed:async()=>allowRequests,requestIp:()=> 'fixture-ip'};
  if (name === '@/lib/order-sync') return {submitDurableOrder:async(payload, accountId)=>{
    const stored = orders.get(payload.externalOrderId);
    if (stored) {
      if (stored.accountId!==accountId || JSON.stringify(stored.payload)!==JSON.stringify(payload))
        return {ok:false,status:409,body:{error:'Checkout reference conflict',code:'CHECKOUT_CONFLICT'}};
      return {ok:true,status:200,body:stored.order};
    }
    const order={orderId:'crm-fixture',orderNumber:'WEB-FIXTURE-12345678',total:829};
    orders.set(payload.externalOrderId,{payload,accountId,order});
    created.push(payload);
    return {ok:true,status:201,body:order};
  }};
  if (name === '@/lib/crm-order-integration') return {createCrmWebsiteOrder:async()=>{throw new Error('Unexpected direct CRM call');}};
  if (name === '@/lib/analytics-store') return {recordConfirmedOrderAnalytics:async(value)=>{analytics.push(value);}};
  if (name === '@/lib/crm-promotion-integration') return {quoteCrmPromotion:async(value)=>{
    if (!quoteAvailable) return {ok:false,status:503,body:{error:'CRM unavailable',code:'PROMOTION_SERVICE_UNAVAILABLE'}};
    if (value.code==='BAD') return {ok:false,status:400,body:{error:'Code cannot be redeemed',code:'INVALID_PROMOTION'}};
    const applied=value.code==='SAVE10';
    return {ok:true,status:200,body:{
      productsSubtotal:749,discount:applied?75:0,discountedSubtotal:applied?674:749,
      deliveryChargeBeforeDiscount:80,shippingDiscount:0,deliveryCharge:80,total:applied?754:829,
      savings:applied?75:0,requestedCode:value.code,codeApplied:applied,
      promotion:applied?{id:'promo-fixture',name:'Save ten',code:'SAVE10',badgeText:'SAVE10',kind:'fixed',value:75,freeShipping:false}:null,
    }};
  }};
  if (name === 'next/navigation') return {redirect:(to)=>{throw new Error('REDIRECT:'+to);},unstable_rethrow:()=>{}};
  if (name === '@/components/checkout-client') return {CheckoutClient:()=>null};
  if (name.startsWith('@/')) name=path.join(root,name.slice(2)+'.ts');
  return original.call(this,name,parent,isMain);
};
for (const ext of ['.ts','.tsx'])
  require.extensions[ext]=function(mod,file){
    mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
    }).outputText,file);
  };

process.env.ALOYRI_ORDERING_ENABLED='1';
const {POST:placeOrder}=require('../src/app/api/orders/route.ts');
const {POST:promotionQuote}=require('../src/app/api/promotions/quote/route.ts');
const CheckoutPage=require('../src/app/checkout/page.tsx').default;
const {initialCheckoutDraft}=require('../src/lib/checkout.ts');
const {prefillCheckoutAccount,chooseCheckoutAddress,checkoutQuoteKey,promotionQuoteReady}=require('../src/lib/checkout-conversion.ts');
let passes=0;
async function check(name, fn) {await fn();passes++;console.log('PASS '+name);}

const checkoutBody=()=>({
  externalOrderId:'checkout-fixture-20261009',
  customer:{name:'Customer Fixture',phone:'+8801712345678',email:'spoof@other.test',address:'123 Fixture Road',district:'Dhaka',area:'Dhanmondi'},
  items:[{productId:'shop-ux-cleanser',qty:1}],promotionCode:'',deliveryZone:'inside-dhaka',paymentMethod:'COD',
});
const orderRequest=(body, origin='https://store.example.test')=>new Request('https://store.example.test/api/orders',{
  method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body),
});
const promoRequest=(code, extra={})=>new Request('https://store.example.test/api/promotions/quote',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({items:[{productId:'shop-ux-cleanser',qty:1}],deliveryZone:'inside-dhaka',code,...extra}),
});

(async()=>{
 await check('checkout login gate requires verified Google session',async()=>{
   session=null; await assert.rejects(CheckoutPage(),/REDIRECT:\/account\/setup\?next=\/checkout/);
   session={session:{method:'email-link'},account:{displayName:'Fixture Customer',phone:'01712345678'}};
   await assert.rejects(CheckoutPage(),/REDIRECT:/);
   session={session:{method:'google'},account:{displayName:'F',phone:'01712345678'}};
   await assert.rejects(CheckoutPage(),/REDIRECT:/);
   session={session:{method:'google'},account:{displayName:'Fixture Customer',phone:'01212345678'}};
   await assert.rejects(CheckoutPage(),/REDIRECT:/);
   session={session:{method:'google'},account:{id:'fixture-account',displayName:'Fixture Customer',phone:'01712345678',email:'verified@example.test',savedAddresses:[]}};
   assert.ok((await CheckoutPage()).props.children);
 });
 await check('checkout profile uses account identity, not an unselected saved address',async()=>{
   const account={...session.account,savedAddresses:[{id:'addr-1',label:'Work',recipientName:'Other Recipient',phone:'01812345678',district:'Chattogram',area:'Pahartali',address:'123 Street Address'}]};
   const filled=prefillCheckoutAccount(initialCheckoutDraft,account);
   assert.equal(filled.fullName,'Fixture Customer');
   assert.equal(filled.phone,'01712345678');
   assert.equal(filled.email,'verified@example.test');
   assert.equal(filled.address,'');
   const selected=chooseCheckoutAddress(filled,account,'addr-1');
   assert.equal(selected.fullName,'Other Recipient');
   assert.equal(selected.phone,'01812345678');
   assert.equal(selected.deliveryZone,'outside-dhaka');
   assert.equal(selected.area,'Pahartali');
   assert.deepEqual(chooseCheckoutAddress(selected,account,''),selected);
   assert.equal(chooseCheckoutAddress(selected,account,'made-up'),null);
 });
 await check('promotion totals are bound to cart and zone',async()=>{
   const a=checkoutQuoteKey([{productId:'shop-ux-cleanser',qty:1}],'inside-dhaka','SAVE10');
   const b=checkoutQuoteKey([{productId:'shop-ux-cleanser',qty:2}],'inside-dhaka','SAVE10');
   const c=checkoutQuoteKey([{productId:'shop-ux-cleanser',qty:1}],'outside-dhaka','SAVE10');
   assert.notEqual(a,b);assert.notEqual(a,c);
   const quoted=(await (await promotionQuote(promoRequest('SAVE10'))).json());
   assert.equal(quoted.total,754);
   assert.equal(promotionQuoteReady(a,a,'SAVE10',quoted,'',false),true);
   assert.equal(promotionQuoteReady(b,a,'SAVE10',quoted,'',false),false);
   assert.equal(promotionQuoteReady(a,a,'BAD',quoted,'',false),false);
   assert.equal(promotionQuoteReady(a,a,'SAVE10',quoted,'',true),false);
   assert.equal(promotionQuoteReady(a,a,'SAVE10',quoted,'unavailable',false),false);
 });
 await check('promotion rejects invalid code, bad payload and CRM outage',async()=>{
   assert.equal((await promotionQuote(promoRequest('BAD'))).status,400);
   assert.equal((await promotionQuote(promoRequest('SAVE10',{items:[{productId:'x',qty:0}]}))).status,400);
   quoteAvailable=false;assert.equal((await promotionQuote(promoRequest('SAVE10'))).status,503);quoteAvailable=true;
 });
 await check('server rejects cross-origin requests before creating orders',async()=>{
   assert.equal((await placeOrder(orderRequest(checkoutBody(),'https://evil.example'))).status,403);
   assert.equal(created.length,0);
 });
 await check('server rejects unauthenticated and incomplete profiles',async()=>{
   session=null;assert.equal((await placeOrder(orderRequest(checkoutBody()))).status,401);
   session={session:{method:'google'},account:{id:'fixture-account',displayName:'F',phone:'01712345678',email:'verified@example.test'}};
   assert.equal((await placeOrder(orderRequest(checkoutBody()))).status,403);
   session={session:{method:'google'},account:{id:'fixture-account',displayName:'Fixture Customer',phone:'01212345678',email:'verified@example.test'}};
   assert.equal((await placeOrder(orderRequest(checkoutBody()))).status,403);
   session={session:{method:'google'},account:{id:'fixture-account',displayName:'Fixture Customer',phone:'01712345678',email:'verified@example.test'}};
 });
 await check('server validates names, phone, COD, products and promotions',async()=>{
   let body=checkoutBody();body.customer.phone='12345';assert.equal((await placeOrder(orderRequest(body))).status,400);
   body=checkoutBody();body.customer.address='a';assert.equal((await placeOrder(orderRequest(body))).status,400);
   body=checkoutBody();body.paymentMethod='bKash';assert.equal((await placeOrder(orderRequest(body))).status,400);
   body=checkoutBody();body.promotionCode='@@';assert.equal((await placeOrder(orderRequest(body))).status,400);
   body=checkoutBody();body.items=[{productId:'shop-ux-cleanser',qty:101}];assert.equal((await placeOrder(orderRequest(body))).status,400);
   assert.equal(created.length,0);
 });
 await check('server enforces rate limit and ordering disabled',async()=>{
   allowRequests=false;assert.equal((await placeOrder(orderRequest(checkoutBody()))).status,429);allowRequests=true;
   process.env.ALOYRI_ORDERING_ENABLED='0';assert.equal((await placeOrder(orderRequest(checkoutBody()))).status,503);
   process.env.ALOYRI_ORDERING_ENABLED='1';
 });
 await check('confirmed orders use Google email, normalized phone and account ownership',async()=>{
   let response=await placeOrder(orderRequest(checkoutBody()));
   assert.equal(response.status,201);
   assert.equal((await response.json()).orderNumber,'WEB-FIXTURE-12345678');
   assert.equal(created.length,1);
   assert.equal(created[0].customer.email,'verified@example.test');
   assert.equal(created[0].customer.phone,'01712345678');
   assert.equal(orders.get(checkoutBody().externalOrderId).accountId,'fixture-account');
   assert.equal(analytics.length,1);
 });
 await check('replay uses original order and cannot switch payload or account',async()=>{
   assert.equal((await placeOrder(orderRequest(checkoutBody()))).status,200);
   assert.equal(created.length,1);
   const changed=checkoutBody();changed.items[0].qty=2;
   assert.equal((await placeOrder(orderRequest(changed))).status,409);
   session={session:{method:'google'},account:{id:'another-account',displayName:'Another Customer',phone:'01712345678',email:'other@example.test'}};
   assert.equal((await placeOrder(orderRequest(checkoutBody()))).status,409);
   assert.equal(created.length,1);
 });
 console.log(passes+' isolated customer checkout, CRM-contract, identity and promotion checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
