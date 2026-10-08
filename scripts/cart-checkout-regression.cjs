/* eslint-disable @typescript-eslint/no-require-imports -- Regression tests transpile the cart module in isolation. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const values = new Map();
const originalLoad = Module._load;
Module._load = function(name, parent, isMain) {
  if (name === "@/lib/volatile-storage") return { volatileStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }};
  return originalLoad.call(this, name, parent, isMain);
};
require.extensions[".ts"] = function(mod, file) {
  mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, file);
};
global.window = { dispatchEvent() {} };
global.Event = class { constructor(type) { this.type = type; } };
const cart = require(path.resolve(__dirname, "../src/lib/cart.ts"));
const fixture = [
  { productId: "cleanser", qty: 1 },
  { productId: "cleanser", qty: 2 },
  { productId: "spf", qty: 9999 },
  { productId: "../unsafe", qty: 1 },
  { productId: "invalid", qty: -4 },
  { productId: "float", qty: 1.5 },
];
assert.deepEqual(cart.normalizeCart(fixture), [
  { productId: "cleanser", qty: 3 },
  { productId: "spf", qty: 99 },
]);
cart.writeCart(fixture);
assert.deepEqual(cart.readCart(), cart.normalizeCart(fixture));
assert.equal(cart.cartCount(cart.readCart()), 102);
values.set(cart.CART_KEY, "{corrupt json");
assert.deepEqual(cart.readCart(), []);
assert.deepEqual(cart.normalizeCart(null), []);
assert.deepEqual(cart.normalizeCart({}), []);
console.log("Cart regression passed: duplicates, quantity bounds, invalid input and corrupted cart recovery.");
