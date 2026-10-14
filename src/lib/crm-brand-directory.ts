/** Brand names and identities always come from the signed Aloyri CRM catalog. */
export type CrmBrand={id:string;name:string};
export type CatalogBrandProduct={brand:string};

const key=(name:string)=>name.trim().toLocaleLowerCase('en');
const legacyId=(name:string)=>'crm-brand-'+encodeURIComponent(key(name));

export function normalizeCrmBrands(value:unknown,products:readonly CatalogBrandProduct[]):CrmBrand[]{
  const seenNames=new Set<string>(),seenIds=new Set<string>();
  const brands:CrmBrand[]=[];
  // A missing field means the older CRM contract. A present but empty registry
  // means CRM has no brands and MUST NOT be filled from Website settings.
  const input:Array<{id:string;name:string}>=Array.isArray(value)
    ? value.filter((entry):entry is {id:string;name:string}=>Boolean(entry)&&typeof entry==='object'
      &&typeof (entry as CrmBrand).id==='string'&&typeof (entry as CrmBrand).name==='string')
    : products.map(item=>item.brand.trim()).filter(Boolean)
      .map(name=>({id:legacyId(name),name}));
  for(const entry of input){
    const name=entry.name.trim(),id=entry.id.trim(),folded=key(name);
    if(!name||name.length>160||!id||id.length>1024||/[\u0000-\u001f/]/.test(id)||seenNames.has(folded)||seenIds.has(id))continue;
    seenIds.add(id);seenNames.add(folded);brands.push({id,name});
  }
  return brands;
}
