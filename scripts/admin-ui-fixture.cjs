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
for (const file of ['admin-navigation.tsx', 'admin-submit-button.tsx']) fs.copyFileSync(path.join(root, 'src/components/admin', file), path.join(temp, 'components/admin', file));
// Only this disposable fixture substitutes auth; production components remain protected.
let shell = fs.readFileSync(path.join(root, 'src/components/admin/admin-shell.tsx'), 'utf8');
shell = shell.replace('import { logoutAdmin } from "@/app/admin/actions";', 'import { logoutAdmin } from "@/fixture-actions";');
shell = shell.replace(/import \{\s*currentAdmin,\s*hasAdminPermission,\s*type AdminPermission,\s*\} from "@\/lib\/admin-auth";/, 'type AdminPermission = string;\nconst currentAdmin = async () => ({ displayName: "Preview owner", role: "owner" });\nconst hasAdminPermission = () => true;');
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
for(const file of ['customer-account-hub.tsx','customer-auth-panel.tsx','customer-auth-landing.tsx','customer-post-purchase-center.tsx','checkout-client.tsx','catalog-provider.tsx','icons.tsx','product-media.tsx','product-artwork.tsx'])fs.copyFileSync(path.join(root,'src/components',file),path.join(temp,'components',file));
for(const file of ['catalog.ts','product-preferences.ts','volatile-storage.ts','checkout.ts','cart.ts','promotions.ts','analytics.ts','product-verification.ts'])fs.copyFileSync(path.join(root,'src/lib',file),path.join(temp,'lib',file));
fs.writeFileSync(path.join(temp,'components/saved-products-client.tsx'),'export function SavedProductsClient(){return <section><h2>Your account wishlist</h2></section>}');
fs.mkdirSync(path.join(temp,'app/account'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/account/page.tsx'),'import {CustomerAccountHub} from "@/components/customer-account-hub"; export default function Page(){return <CustomerAccountHub authenticated={true} displayName="Preview customer" profileComplete={true}/>}');
// Render the actual customization fields with isolated configuration.
fs.copyFileSync(path.join(root,'src/components/admin/storefront-layout-fields.tsx'),path.join(temp,'components/admin/storefront-layout-fields.tsx'));
fs.copyFileSync(path.join(root,'src/lib/storefront-presentation.ts'),path.join(temp,'lib/storefront-presentation.ts'));
fs.mkdirSync(path.join(temp,'app/admin/settings'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/admin/settings/page.tsx'),`import {AdminShell} from "@/components/admin/admin-shell"; import {StorefrontLayoutFields} from "@/components/admin/storefront-layout-fields"; import {defaultPresentation} from "@/lib/storefront-presentation"; export default function Page(){return <AdminShell username="preview" title="Store settings" subtitle="Customize the storefront"><form><StorefrontLayoutFields value={defaultPresentation}/></form></AdminShell>}`);
// Isolated Visual Builder interaction preview: reuses the production editor,
// replacing only the server save action in this disposable test application.
for (const file of ['visual-builder-studio.tsx', 'storefront-core-preview.tsx']) fs.copyFileSync(path.join(root, 'src/components/admin', file), path.join(temp, 'components/admin', file));
fs.copyFileSync(path.join(root,'src/components/visual-builder-block.tsx'),path.join(temp,'components/visual-builder-block.tsx'));
for (const file of ['visual-builder.ts','homepage-builder.ts']) fs.copyFileSync(path.join(root,'src/lib',file),path.join(temp,'lib',file));
fs.mkdirSync(path.join(temp,'app/admin/builder'),{recursive:true});
fs.writeFileSync(path.join(temp,'app/admin/actions.ts'), '"use server"; export async function saveVisualBuilder(_formData: FormData) {}');
fs.writeFileSync(path.join(temp,'app/admin/builder/page.tsx'),
  `import {AdminShell} from "@/components/admin/admin-shell";
import {VisualBuilderStudio} from "@/components/admin/visual-builder-studio";
import {defaultVisualLayout} from "@/lib/visual-builder";
import type {BuilderPreviewData} from "@/components/admin/storefront-core-preview";
const homepage = {
  eyebrow:"The Aloyri edit", headline:"Skincare worth discovering", intro:"Find an easy everyday routine",
  primaryLabel:"Shop the edit",primaryHref:"/shop",secondaryLabel:"Explore sunscreen",secondaryHref:"/category/sunscreen",
  heroProductId:"simple-wash",heroImagePath:"",heroStyle:"soft",heroAlignment:"left",heroLayout:"split",
  showHero:true,showBrowse:true,showCategories:true,showFocus:true,showRoutineFinder:true,showRoutineSteps:true,showBrandStory:true,
  browseEyebrow:"Explore",browseTitle:"Find your skincare",browseIntro:"Browse by concern",browsePlaceholder:"Search by product",
  categoriesEyebrow:"Curated selection",categoriesTitle:"Shop by category",categoriesIntro:"Explore a step in your routine",
  routineFinderHeadline:"Your routine, made simple",routineFinderIntro:"Take three quick steps to discover skincare",
  ideaEyebrow:"Our story",ideaHeadline:"Less noise. Better choices.",ideaCopy:"Considered skincare for everyday care",
  featureChips:["Curated selection","BDT pricing"],sectionOrder:[],visualLayout:defaultVisualLayout,
  promoBanners:[{enabled:true,eyebrow:"Limited offer",title:"October skin edit",copy:"Explore this month's picks",ctaLabel:"Browse now",ctaHref:"/shop",layout:"split",mobileLayout:"stacked",imagePath:"",startAt:"",endAt:""}],
  promoPlacement:"before-products",
  editorialSections:[{enabled:true,kind:"story",title:"Our daily essentials",eyebrow:"The routine",copy:"Everyday skin care",ctaLabel:"",ctaHref:"",position:"before-products",layout:"split"}],
} as unknown as BuilderPreviewData["homepage"];
const previewData:BuilderPreviewData={
  homepage,showRoutine:true,
  products:[{id:"simple-wash",name:"Refreshing Facial Wash",brand:"Simple",category:"Cleanser",price:749,availableStock:5},
            {id:"daily-spf",name:"Everyday sunscreen",brand:"Aloyri",category:"Sunscreen",price:899,availableStock:5}],
  sections:[{id:"fixture-products",kind:"featured",enabled:true,eyebrow:"Popular products",title:"Featured skincare",copy:"Our selection",maxProducts:2}],
  campaigns:[],
};
export default function Page(){return <AdminShell username="preview" title="Visual Builder preview" subtitle="Disposable UI fixture">
  <VisualBuilderStudio pageKey="home" initialLayout={defaultVisualLayout} initialCoreContent={homepage}
    initialPreviewData={previewData}
    advancedSettings={<div><label>Advanced hero headline<input name="headline" defaultValue={homepage.headline}/></label>
      {["showHero","showBrowse","showCategories","showFocus","showRoutineFinder","showRoutineSteps","showBrandStory"].map(name=><input key={name} type="checkbox" name={name} defaultChecked aria-label={name}/>)}
    </div>}/>
</AdminShell>}`);

// Isolated checkout renderer: uses the real client component but a disposable
// Next.js app and mocked HTTP endpoints. Never bypasses production authentication.
fs.mkdirSync(path.join(temp, 'app/test-cart'), {recursive:true});
fs.writeFileSync(path.join(temp,'app/test-cart/page.tsx'),
  '"use client"; import {useRouter} from "next/navigation"; import {writeCart} from "@/lib/cart"; export default function Page(){const router=useRouter();return <main className="shell py-12"><h1 className="text-3xl">Checkout fixture cart</h1><button onClick={()=>{writeCart([{productId:"simple-wash",qty:1}]);router.push("/checkout");}} className="mt-8 rounded-full bg-[#713a35] px-5 py-3 text-white">Start fixture checkout</button></main>}');
fs.mkdirSync(path.join(temp, 'app/checkout'), {recursive:true});
fs.writeFileSync(path.join(temp,'app/checkout/page.tsx'),
  '"use client"; import {useEffect,useState} from "react"; import {CatalogProvider} from "@/components/catalog-provider"; import {CheckoutClient} from "@/components/checkout-client"; import {writeCart} from "@/lib/cart"; export default function Page(){const [ready,setReady]=useState(false);useEffect(()=>{writeCart([{productId:"simple-wash",qty:1}]);setReady(true);},[]);return ready?<CatalogProvider><CheckoutClient/></CatalogProvider>:<main className="shell py-12"><p role="status">Preparing isolated checkout…</p></main>;}');
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', process.argv[2] || '3100'], { cwd: temp, stdio: 'inherit' });
function stop(){ child.kill('SIGTERM'); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
child.on('exit', code => { fs.rmSync(temp, { recursive: true, force: true }); process.exit(code || 0); });
