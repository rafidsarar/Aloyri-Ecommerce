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
fs.writeFileSync(path.join(temp, 'next.config.js'), `module.exports = { turbopack: { root: ${JSON.stringify(temp)} }, allowedDevOrigins: ['127.0.0.1'] };`);
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
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', process.argv[2] || '3100'], { cwd: temp, stdio: 'inherit' });
function stop(){ child.kill('SIGTERM'); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
child.on('exit', code => { fs.rmSync(temp, { recursive: true, force: true }); process.exit(code || 0); });
