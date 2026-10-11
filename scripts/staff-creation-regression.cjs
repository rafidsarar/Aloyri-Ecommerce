/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let failure, denied, input;
const redirects = [];
const auth = {
 ADMIN_PERMISSIONS: ['pages.edit', 'media.edit'],
 ADMIN_ROLES: ['owner', 'content-editor', 'analyst'],
 ROLE_TEMPLATES: {'content-editor': ['pages.edit'], analyst: []},
 requireAdminPermission: async () => { if (denied) throw new Error('Forbidden'); return {username:'owner'}; },
 createStaffAccount: async (_, value) => { input = value; if (failure) throw new Error(failure); return {id:'new-staff'}; },
};
const original = Module._load;
Module._load = function(name, parent, isMain) {
 if (name === '@/lib/admin-auth') return auth;
 if (name === 'next/navigation') return {redirect: url => { redirects.push(url); throw new Error('NEXT_REDIRECT'); }};
 if (name === '@/components/admin/admin-shell') return {AdminShell: ({children}) => React.createElement('main',null,children), AdminCard: ({children}) => React.createElement('section',null,children), AdminNotice: ({children}) => React.createElement('p',null,children)};
 if (name.startsWith('@/')) return original.call(this,path.resolve('src',name.slice(2)),parent,isMain);
 return original.call(this,name,parent,isMain);
};
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (mod,file) => mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
const {createStaffAction} = require(path.resolve('src/app/admin/staff/actions.ts'));
(async () => {
 const form = new FormData(); form.set('username','fixture'); form.set('displayName','Fixture'); form.set('role','analyst'); form.set('permission_media.edit','on');
 await assert.rejects(createStaffAction(form), /NEXT_REDIRECT/);
 assert.deepEqual(redirects, ['/admin/staff/new-staff?created=1']);
 assert.equal(input.role,'analyst'); assert.deepEqual(input.permissions,['media.edit']);
 failure = 'Duplicate username'; redirects.length=0;
 await assert.rejects(createStaffAction(form), /NEXT_REDIRECT/);
 assert.deepEqual(redirects,['/admin/staff/new?error=Duplicate%20username']);
 denied = true; redirects.length=0;
 await assert.rejects(createStaffAction(form), /Forbidden/); assert.equal(redirects.length,0);
 denied = false;
 const Page = require(path.resolve('src/app/admin/staff/new/page.tsx')).default;
 const html = renderToStaticMarkup(await Page({searchParams:Promise.resolve({})}));
 assert.match(html, /name="role"/); assert.match(html, /Content Editor/); assert.match(html, /name="permission_pages.edit"/); assert.match(html, /name="permission_media.edit"/);
 console.log('Staff creation regression: role and permission form, successful redirect, validation error and authorization PASS');
})().catch(error => {console.error(error); process.exitCode=1;});
