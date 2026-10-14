import { test, expect } from "@playwright/test";
import { normalizeCrmBrands } from "../src/lib/crm-brand-directory";
import { normalizeBrandImages } from "../src/lib/brand-image-config";

test("CRM registry owns storefront brand names even when products disagree",()=>{
  const brands=normalizeCrmBrands([{id:"brand-1",name:"Simple"},{id:"brand-2",name:"COSRX"}],
    [{brand:"Simple"},{brand:"Unapproved Website brand"}]);
  expect(brands).toEqual([{id:"brand-1",name:"Simple"},{id:"brand-2",name:"COSRX"}]);
});
test("CRM renames preserve the brand identity used to attach photos",()=>{
  const before=normalizeCrmBrands([{id:"crm-brand-simple",name:"Simple"}],[]);
  const after=normalizeCrmBrands([{id:"crm-brand-simple",name:"Simple Skincare"}],[]);
  const images=normalizeBrandImages({images:{"crm-brand-simple":"media/brand-logo.webp"}});
  expect(before[0].id).toBe(after[0].id);
  expect(images.images[after[0].id]).toBe("media/brand-logo.webp");
});
test("CRM delete hides the brand but retains image assignment for recovery",()=>{
  const images=normalizeBrandImages({images:{"crm-brand-unused":"media/unused.png"}});
  expect(normalizeCrmBrands([],[])).toEqual([]);
  expect(images.images["crm-brand-unused"]).toBe("media/unused.png");
});
test("legacy CRM feed is read only and derives names exclusively from CRM products",()=>{
  expect(normalizeCrmBrands(undefined,[{brand:"COSRX"},{brand:"cosrx"},{brand:"Skin Cafe"}]))
    .toEqual([{id:"crm-brand-cosrx",name:"COSRX"},{id:"crm-brand-skin%20cafe",name:"Skin Cafe"}]);
});
test("malformed brand names and unsafe photo paths are rejected",()=>{
  expect(normalizeCrmBrands([{id:"brand1",name:"Good"},{id:"brand2",name:"good"},{id:"x/y",name:"Bad"}],[]))
    .toEqual([{id:"brand1",name:"Good"}]);
  expect(normalizeBrandImages({images:{"brand1":"media/good.jpg","brand2":"https://bad.example/x.jpg","brand3":"media/../secret.png"}}).images)
    .toEqual({brand1:"media/good.jpg"});
});
