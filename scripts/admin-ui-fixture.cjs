/* eslint-disable @typescript-eslint/no-require-imports -- Disposable Next.js UI fixture runner. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aloyri-admin-ui-'));
fs.mkdirSync(path.join(temp, 'app'), { recursive: true });
fs.mkdirSync(path.join(temp, 'components/admin'), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(temp, 'node_modules'), 'dir');
fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ private: true, dependencies: { next: '16.3.8', react: '19.3.0', 'react-dom': '19.3.0' } }));
fs.writeFileSync(path.join(temp, 'tsconfig.json'), JSON.stringify({ compilerOptions: { jsx: 'react-jsx', moduleResolution: 'bundler', paths: { '@/*': ['./*'] } } }));
fs.writeFileSync(path.join(temp, 'next.config.js'), `module.exports = { turbopack: { root: ${JSON.stringify(temp)} }, allowedDevOrigins: ['127.0.0.1'], images: { unoptimized: true } };`);
fs.copyFileSync(path.join(root, 'postcss.config.mjs'), path.join(temp, 'postcss.config.mjs'));
fs.copyFileSync(path.join(root, 'src/app/globals.css'), path.join(temp, 'app/globals.css'));
for (const file of ['admin-navigation.tsx', 'admin-submit-button.tsx', 'admin-edit-guard.tsx', 'admin-section-links.tsx', 'editable-content-list.tsx', 'additional-content-editor.tsx', 'owner-dashboard.tsx']) fs.copyFileSync(path.join(root, 'src/components/admin', file), path.join(temp, 'components/admin', file));
// Only this disposable fixture substitutes auth; production components remain protected.
let shell = fs.readFileSync(path.join(root, 'src/components/admin/admin-shell.tsx'), 'utf8');
shell = shell.replace('import { logoutAdmin } from "@/app/admin/actions";', 'import { logoutAdmin } from "@/fixture-actions";');
shell = shell.replace(/import \{\s*currentAdmin,\s*hasAdminPermission,\s*type AdminPermission,\s*\} from "@\/lib\/admin-auth";/, 'type AdminPermission = string;\nconst currentAdmin = async () => ({ displayName: "Preview owner", role: "owner" });\nconst hasAdminPermission = () => true;');
shell = shell.replace('import { readStorefrontConfig } from "@/lib/storefront-admin-store";', 'const readStorefrontConfig = async () => ({updatedAt: "2026-10-11T00:00:00.000Z"});');
fs.writeFileSync(path.join(temp, 'components/admin/admin-shell.tsx'), shell);
fs.writeFileSync(path.join(temp, 'fixture-actions.ts'), '"use server"; export async function logoutAdmin() {}');
fs.writeFileSync(path.join(temp, 'app/layout.tsx'), 'import "./globals.css"; export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}');
const fixturePage = `import {AdminShell,AdminCard,AdminNotice} from "@/components/admin/admin-shell";
export default function Page(){return <AdminShell username="preview" title="Homepage" subtitle="Edit your homepage, save a draft, then preview and publish when ready."><AdminNotice>Draft saved. Preview and publish when ready.</AdminNotice><AdminCard><h2 className="mb-4 text-sm font-semibold">Main banner</h2><label className="grid gap-2 text-sm">Headline<input defaultValue="Skincare that earns a place in your routine." className="border p-3" /></label></AdminCard><div className="mt-5 grid gap-5 sm:grid-cols-2"><AdminCard><h2 className="text-sm font-semibold">Main button</h2><p className="mt-2 text-sm text-black/60">Shop skincare · /shop</p></AdminCard><AdminCard><h2 className="text-sm font-semibold">Brand story</h2><p className="mt-2 text-sm text-black/60">Simple care for your daily routine.</p></AdminCard></div><div className="admin-save-bar mt-5"><p className="text-xs text-black/60">Saving updates your draft.</p><button className="rounded-lg bg-[#713a35] px-5 py-3 text-sm text-white">Save draft</button></div></AdminShell>}`;
fs.mkdirSync(path.join(temp, 'app/admin/homepage'), { recursive: true });
fs.writeFileSync(path.join(temp, 'app/admin/homepage/page.tsx'), fixturePage);
fs.mkdirSync(path.join(temp, 'app/admin/products/item'), { recursive: true });
fs.writeFileSync(path.join(temp, 'app/admin/products/item/page.tsx'), fixturePage);
// Account UI preview uses the real hub and aftercare components with fixture API data.
fs.mkdirSync(path.join(temp, 'lib'), {recursive:true});
for(const file of ['storefront-motion.tsx','storefront-motion.css','customer-account-hub.tsx','customer-auth-panel.tsx','customer-auth-landing.tsx','customer-post-purchase-center.tsx','checkout-client.tsx','catalog-provider.tsx','icons.tsx','product-media.tsx','product-artwork.tsx'])fs.copyFileSync(path.join(root,'src/components',file),path.join(temp,'components',file));
for(const file of ['catalog.ts','product-preferences.ts','volatile-storage.ts','checkout.ts','cart.ts','promotions.ts','hero-banner-offers.ts','analytics.ts','product-verification.ts','storefront-categories.ts'])fs.copyFileSync(path.join(root,'src/lib',file),path.join(temp,'lib',file));
fs.writeFileSync(path.join(temp,'components/saved-products-client.tsx'),'export function SavedProductsClient(){return <section><h2>Your account wishlist</h2></section>}');
fs.mkdirSync(path.join(temp,'app/account'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/account/page.tsx'),'import {CustomerAccountHub} from "@/components/customer-account-hub"; export default function Page(){return <CustomerAccountHub authenticated={true} displayName="Preview customer" profileComplete={true}/>}');
// Render the actual customization fields with isolated configuration.
fs.copyFileSync(path.join(root,'src/components/admin/storefront-layout-fields.tsx'),path.join(temp,'components/admin/storefront-layout-fields.tsx'));
fs.copyFileSync(path.join(root,'src/lib/storefront-presentation.ts'),path.join(temp,'lib/storefront-presentation.ts'));
fs.copyFileSync(path.join(root,'src/lib/social-links.ts'),path.join(temp,'lib/social-links.ts'));
fs.mkdirSync(path.join(temp,'app/admin/settings'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/admin/settings/page.tsx'),`import {AdminShell} from "@/components/admin/admin-shell"; import {StorefrontLayoutFields} from "@/components/admin/storefront-layout-fields"; import {defaultPrivacyContent,defaultTermsContent} from "@/lib/default-policy-content"; import {defaultPresentation} from "@/lib/storefront-presentation"; export default function Page(){return <AdminShell username="preview" title="Store settings" subtitle="Customize the storefront"><form><StorefrontLayoutFields value={defaultPresentation}/></form></AdminShell>}`);
// Isolated Visual Builder interaction preview: reuses the production editor,
// replacing only the server save action in this disposable test application.
for (const file of ['visual-builder-studio.tsx', 'builder-preview-viewport.tsx', 'preview-content-properties.tsx', 'inline-media-upload.tsx']) fs.copyFileSync(path.join(root, 'src/components/admin', file), path.join(temp, 'components/admin', file));
fs.copyFileSync(path.join(root,'src/components/visual-builder-block.tsx'),path.join(temp,'components/visual-builder-block.tsx'));
for (const file of ['visual-builder.ts','homepage-builder.ts','recommendations.ts','default-policy-content.ts']) fs.copyFileSync(path.join(root,'src/lib',file),path.join(temp,'lib',file));
fs.mkdirSync(path.join(temp,'app/admin/builder'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/admin/actions.ts'), '"use server"; export async function saveVisualBuilder(_formData: FormData) {}');
fs.writeFileSync(path.join(temp,'app/admin/builder/page.tsx'),
  'import {AdminShell} from "@/components/admin/admin-shell"; import {VisualBuilderStudio} from "@/components/admin/visual-builder-studio"; import {defaultVisualLayout} from "@/lib/visual-builder"; export default function Page(){return <AdminShell username="preview" title="Visual Builder preview" subtitle="Disposable UI fixture"><VisualBuilderStudio pageKey="home" initialLayout={defaultVisualLayout}/></AdminShell>}');

// Production page/FAQ editors and simple homepage, isolated from live records.
for(const file of ['website-settings-editor.tsx','website-page-editor.tsx','simple-homepage-editor.tsx','hero-background-field.tsx','homepage-advanced-controls.tsx','homepage-section-organizer.tsx','banner-product-picker.tsx','media-image-picker.tsx','storefront-device-preview.tsx']) fs.copyFileSync(path.join(root,'src/components/admin',file),path.join(temp,'components/admin',file));
const storeSource = fs.readFileSync(path.join(root,'src/lib/storefront-admin-store.ts'),'utf8');
const defaults = storeSource.slice(storeSource.indexOf('export type ContentSection'),storeSource.indexOf('const PUBLISHED_CONFIG_PATH'));
fs.writeFileSync(path.join(temp,'lib/storefront-admin-store.ts'),
  'import {defaultPrivacyContent,defaultTermsContent} from "@/lib/default-policy-content"; import {defaultPresentation} from "@/lib/storefront-presentation"; import {defaultHomepageOrder} from "@/lib/homepage-builder"; import {defaultVisualLayout,visualPageKeys} from "@/lib/visual-builder"; import {defaultRecommendationConfig} from "@/lib/recommendations";\n'+defaults+'\nexport async function readStorefrontMediaLibrary(){return {media:[{pathname:"media/fixture-banner.webp"}],unavailable:false}}');
fs.writeFileSync(path.join(temp,'lib/crm-catalog-integration.ts'),'export async function fetchCrmCatalog(){return {ok:true,body:{products:[{id:"fixture-product",name:"Fixture cleanser",brand:"Aloyri",availableStock:10}]}}}');
fs.writeFileSync(path.join(temp,'app/admin/actions.ts'),'"use server"; export async function saveVisualBuilder(_formData: FormData) {} export async function saveFaq(_formData:FormData) {} export async function saveInfoPage(_formData:FormData) {} export async function saveSiteSettings(_formData:FormData) {} export async function uploadPreviewMedia(_formData:FormData) {return {ok:true,pathname:"media/fixture-upload.webp"}}');
for(const key of ['faq','about','privacy','terms']) {
  fs.mkdirSync(path.join(temp,'app/admin/pages',key),{recursive:true});
  fs.writeFileSync(path.join(temp,'app/admin/pages',key,'page.tsx'),'import {AdminShell} from "@/components/admin/admin-shell"; import {WebsitePageEditor} from "@/components/admin/website-page-editor"; import {defaultStorefrontConfig} from "@/lib/storefront-admin-store"; export default function Page(){return <AdminShell username="preview" title="Edit '+key+'" subtitle="Isolated content editor"><WebsitePageEditor config={defaultStorefrontConfig} page="'+key+'"/></AdminShell>}');
}
fs.mkdirSync(path.join(temp,'app/admin/website'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/admin/website/page.tsx'),'import {AdminShell} from "@/components/admin/admin-shell"; import {SimpleHomepageEditor} from "@/components/admin/simple-homepage-editor"; import {defaultStorefrontConfig} from "@/lib/storefront-admin-store"; export default function Page(){return <AdminShell username="preview" title="Edit your website" subtitle="Isolated homepage editor"><SimpleHomepageEditor config={defaultStorefrontConfig}/></AdminShell>}');

fs.mkdirSync(path.join(temp,'app/admin/store-settings'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/admin/store-settings/page.tsx'),'import {AdminShell} from "@/components/admin/admin-shell"; import {WebsiteSettingsEditor} from "@/components/admin/website-settings-editor"; import {defaultStorefrontConfig} from "@/lib/storefront-admin-store"; export default function Page(){return <AdminShell username="preview" title="Store settings" subtitle="Isolated settings editor"><WebsiteSettingsEditor config={defaultStorefrontConfig}/></AdminShell>}');

// Full preview + Properties fixture uses real fields and reactive public page components.
for(const file of ['homepage-product-properties.tsx'])fs.copyFileSync(path.join(root,'src/components/admin',file),path.join(temp,'components/admin',file));
fs.copyFileSync(path.join(root,'src/lib/merchandising.ts'),path.join(temp,'lib/merchandising.ts'));
for(const file of ['customer-info-page.tsx','faq-page-content.tsx','public-page-preview-bridge.tsx','use-builder-page-content.ts'])fs.copyFileSync(path.join(root,'src/components',file),path.join(temp,'components',file));
fs.mkdirSync(path.join(temp,'app/admin/preview-properties'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/admin/preview-properties/page.tsx'),`import {AdminShell} from "@/components/admin/admin-shell";import {VisualBuilderStudio} from "@/components/admin/visual-builder-studio";import {HomepageAdvancedControls} from "@/components/admin/homepage-advanced-controls";import {WebsiteSettingsFields} from "@/components/admin/website-settings-editor";import {HomepageProductProperties} from "@/components/admin/homepage-product-properties";import {defaultStorefrontConfig} from "@/lib/storefront-admin-store";export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){const {page='home'}=await searchParams;const config=structuredClone(defaultStorefrontConfig);config.merchandising.campaigns=[{id:'puja',title:'Puja Uthshob',active:true,startAt:'',endAt:'',productIds:[],showProducts:true,promotionOnly:false}];const home=page==='home';return <AdminShell username="preview" title="Preview and Properties" wide><VisualBuilderStudio pageKey={page as any} initialVersion="fixture-content-version" initialLayout={home?config.homepage.visualLayout:config.visualPages[page]} initialCoreContent={home?config.homepage:undefined} initialPresentation={config.presentation} initialSiteContent={config.site} initialPageContent={config.pages[page]} initialFaqContent={page==='faq'?config.faq:undefined} siteSettings={<WebsiteSettingsFields config={config} homepage={home}/>} advancedSettings={home?<HomepageAdvancedControls config={config} inProperties/>:undefined} merchandisingSettings={home?<HomepageProductProperties config={config}/>:undefined}/></AdminShell>}`);
for(const key of ['about','privacy','terms','faq']){fs.mkdirSync(path.join(temp,'app',key),{recursive:true});fs.writeFileSync(path.join(temp,'app',key,'page.tsx'),`import {CustomerInfoPage} from "@/components/customer-info-page";import {FaqPageContent} from "@/components/faq-page-content";import {PublicPagePreviewBridge} from "@/components/public-page-preview-bridge";import {defaultStorefrontConfig} from "@/lib/storefront-admin-store";export default function Page(){return <><header><p className="store-announcement">Original announcement</p></header>${key==='faq'?'<FaqPageContent initial={defaultStorefrontConfig.faq}/>':'<CustomerInfoPage {...defaultStorefrontConfig.pages.'+key+'}/>'}<footer><p className="store-footer-description">Original footer</p></footer><PublicPagePreviewBridge/></>}`);}

fs.copyFileSync(path.join(root,'src/components/homepage-live-draft.tsx'),path.join(temp,'components/homepage-live-draft.tsx'));
fs.writeFileSync(path.join(temp,'app/page.tsx'),`import {HomepageLiveDraft} from "@/components/homepage-live-draft";import {PublicPagePreviewBridge} from "@/components/public-page-preview-bridge";import {defaultVisualLayout} from "@/lib/visual-builder";export default function Page(){return <><header><p className="store-announcement">Preview announcement</p></header><main><HomepageLiveDraft initialLayout={defaultVisualLayout} sections={[{id:'hero',content:<div className="store-hero store-hero-soft store-hero-align-left grid grid-cols-1"><h1 className="store-hero-heading">Homepage preview</h1><div className="store-hero-art"><p>Product gallery</p></div></div>}]}/></main><footer><p className="store-footer-description">Preview footer</p></footer><PublicPagePreviewBridge/></>}`);

fs.mkdirSync(path.join(temp,'app/admin/dashboard'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/admin/dashboard/page.tsx'),'import {AdminShell} from "@/components/admin/admin-shell";import {OwnerDashboard} from "@/components/admin/owner-dashboard";import {defaultStorefrontConfig} from "@/lib/storefront-admin-store";export default function Page(){return <AdminShell username="preview" title="Dashboard" subtitle="Manage your website, one task at a time."><OwnerDashboard config={defaultStorefrontConfig} productCount={9}/></AdminShell>}');
// Isolated checkout renderer: uses the real client component but a disposable
// Next.js app and mocked HTTP endpoints. Never bypasses production authentication.
fs.mkdirSync(path.join(temp, 'app/test-cart'), {recursive:true});
fs.writeFileSync(path.join(temp,'app/test-cart/page.tsx'),
  '"use client"; import {useRouter} from "next/navigation"; import {writeCart} from "@/lib/cart"; import {volatileStorage} from "@/lib/volatile-storage"; import {claimOffer,HERO_BANNER_CLAIM_KEY} from "@/lib/hero-banner-offers"; export default function Page(){const router=useRouter();return <main className="shell py-12"><h1 className="text-3xl">Checkout fixture cart</h1><button onClick={()=>{writeCart([{productId:"simple-wash",qty:1}]);if(window.location.search.includes("hero5=1")){const offer=claimOffer({bannerId:"promo-0",mode:"checkout",promotionCode:"HERO5",productIds:["simple-wash"]});if(offer)volatileStorage.setItem(HERO_BANNER_CLAIM_KEY,JSON.stringify(offer));}router.push("/checkout");}} className="mt-8 rounded-full bg-[#713a35] px-5 py-3 text-white">Start fixture checkout</button></main>}');
fs.mkdirSync(path.join(temp, 'app/checkout'), {recursive:true});
fs.writeFileSync(path.join(temp,'app/checkout/page.tsx'),
  '"use client"; import {useEffect,useState} from "react"; import {CatalogProvider} from "@/components/catalog-provider"; import {CheckoutClient} from "@/components/checkout-client"; import {writeCart} from "@/lib/cart"; export default function Page(){const [ready,setReady]=useState(false);useEffect(()=>{writeCart([{productId:"simple-wash",qty:1}]);setReady(true);},[]);return ready?<CatalogProvider><CheckoutClient/></CatalogProvider>:<main className="shell py-12"><p role="status">Preparing isolated checkout…</p></main>;}');
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', process.argv[2] || '3100'], { cwd: temp, stdio: 'inherit' });
function stop(){ child.kill('SIGTERM'); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
child.on('exit', code => { fs.rmSync(temp, { recursive: true, force: true }); process.exit(code || 0); });
