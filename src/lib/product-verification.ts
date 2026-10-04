export type VerifiedProductContent = {
  sourceLabel: string;
  sourceUrl: string;
  verifiedAt: string;
  photo: {
    src: string;
    alt: string;
    sourceLabel: string;
    sourceUrl: string;
    exactVariant: boolean;
  };
  claims: string[];
  directions: string[];
  warnings?: string[];
  ingredients?: string[];
  keyIngredients?: string[];
  ingredientSourceLabel?: string;
  ingredientSourceUrl?: string;
  sourceNote?: string;
};

export const verifiedProductContent: Record<string, VerifiedProductContent> = {
  "simple-wash": {
    sourceLabel: "Simple Official",
    sourceUrl:
      "https://www.simpleskincare.in/products/simple-kind-to-skin-refreshing-facial-wash-150ml",
    verifiedAt: "2026-10-05",
    photo: {
      src: "https://www.simpleskincare.in/cdn/shop/files/27278-H_8909106061781_1080x1440.jpg?v=1769510079",
      alt: "Simple Kind to Skin Refreshing Facial Wash 150ml",
      sourceLabel: "Simple Official",
      sourceUrl:
        "https://www.simpleskincare.in/products/simple-kind-to-skin-refreshing-facial-wash-150ml",
      exactVariant: true,
    },
    claims: [
      "100% soap-free facial wash",
      "pH-balanced",
      "Non-comedogenic",
      "Hypoallergenic and dermatologically tested",
      "Suitable for all skin types, including sensitive skin",
      "No colour, perfume or alcohol",
    ],
    directions: [
      "Wet your face with water.",
      "Massage a small amount gently onto the skin, avoiding the eye area.",
      "Rinse thoroughly. The manufacturer recommends use morning and evening.",
    ],
    keyIngredients: [
      "Pro-Vitamin B5 (Panthenol)",
      "Vitamin E (Tocopheryl Acetate)",
      "Glycerin",
    ],
    ingredients: [
      "Aqua",
      "Cocamidopropyl Betaine",
      "Propylene Glycol",
      "Hydroxypropyl Methylcellulose",
      "Panthenol",
      "Disodium EDTA",
      "Glycerin",
      "Iodopropynyl Butylcarbamate",
      "Phenoxyethanol",
      "Sodium Hydroxide",
      "Tocopheryl Acetate",
      "Citric Acid",
    ],
    sourceNote:
      "Formula and usage are taken from Simple's official regional product page. Always compare the ingredient list on the exact pack you receive because formulations can change by market or over time.",
  },
  "simple-light": {
    sourceLabel: "Simple Official",
    sourceUrl:
      "https://www.simpleskincare.in/products/hydrating-light-moisturiser-with-borage-seed-oil-pro-vit-b5-vit-e-125-ml",
    verifiedAt: "2026-10-05",
    photo: {
      src: "https://www.simpleskincare.in/cdn/shop/files/Module00_1000x1000.jpg?v=1769511700",
      alt: "Simple Hydrating Light Moisturiser 125ml",
      sourceLabel: "Simple Official",
      sourceUrl:
        "https://www.simpleskincare.in/products/hydrating-light-moisturiser-with-borage-seed-oil-pro-vit-b5-vit-e-125-ml",
      exactVariant: true,
    },
    claims: [
      "Lightweight moisturiser",
      "Non-greasy and quick-absorbing",
      "Suitable for all skin types",
      "Formulated with Borage Seed Oil, Pro-Vitamin B5 and Vitamin E",
    ],
    directions: [
      "Apply to clean skin after cleansing.",
      "Smooth gently over the face and neck.",
      "For daytime routines, follow with sunscreen.",
    ],
    keyIngredients: [
      "Borage Seed Oil",
      "Pro-Vitamin B5 (Panthenol)",
      "Vitamin E (Tocopheryl Acetate)",
      "Niacinamide",
      "Glycerin",
    ],
    ingredients: [
      "Aqua",
      "Glycerin",
      "Mineral Oil",
      "Polyglyceryl-3 Methylglucose Distearate",
      "Cetyl Palmitate",
      "Niacinamide",
      "Dimethicone",
      "Acrylates/C10-30 Alkyl Acrylate Crosspolymer",
      "Stearic Acid",
      "Borago Officinalis Seed Oil",
      "Caprylyl Glycol",
      "Carbomer",
      "Cetyl Alcohol",
      "Disodium EDTA",
      "Lactic Acid",
      "Panthenol",
      "Pentylene Glycol",
      "Phenoxyethanol",
      "Potassium Carbonate",
      "Potassium Hydroxide",
      "Citric Acid",
      "Bisabolol",
      "Serine",
      "Sodium Lactate",
      "Sorbitol",
      "Tocopheryl Acetate",
      "Urea",
      "Allantoin",
      "Sodium Chloride",
    ],
    sourceNote:
      "Formula and claims are from Simple's official regional product page. Check the exact pack for the current market-specific ingredient list.",
  },
  "simple-rich": {
    sourceLabel: "Simple Official",
    sourceUrl:
      "https://www.simpleskincare.in/products/replenishing-rich-moisturiser-with-glycerin-pro-vit-b5-125ml",
    verifiedAt: "2026-10-05",
    photo: {
      src: "https://www.simpleskincare.in/cdn/shop/files/00_1000x1000.jpg?v=1769514200",
      alt: "Simple Replenishing Rich Moisturiser 125ml",
      sourceLabel: "Simple Official",
      sourceUrl:
        "https://www.simpleskincare.in/products/replenishing-rich-moisturiser-with-glycerin-pro-vit-b5-125ml",
      exactVariant: true,
    },
    claims: [
      "Rich moisturising formula",
      "Suitable for all skin types",
      "Positioned by Simple for dry, dehydrated and sensitive skin",
      "Fragrance-free",
      "Non-comedogenic",
    ],
    directions: [
      "Apply to clean skin after cleansing.",
      "Smooth gently over the face and neck.",
      "For daytime routines, follow with sunscreen.",
    ],
    keyIngredients: [
      "Glycerin",
      "Pro-Vitamin B5 (Panthenol)",
      "Niacinamide",
      "Vitamin E (Tocopheryl Acetate)",
    ],
    ingredients: [
      "Aqua",
      "Glycerin",
      "Coco-Caprylate/Caprate",
      "Polyglyceryl-3 Methylglucose Distearate",
      "Ethylhexyl Methoxycinnamate",
      "Niacinamide",
      "Stearyl Alcohol",
      "Butyl Methoxydibenzoylmethane",
      "Polyacrylamide",
      "Phenoxyethanol",
      "Stearic Acid",
      "Panthenol",
      "Caprylyl Glycol",
      "C13-14 Isoparaffin",
      "Laureth-7",
      "Disodium EDTA",
      "Sodium Hydroxide",
      "Tocopheryl Acetate",
      "BHT",
      "Bisabolol",
      "Citric Acid",
      "Pentylene Glycol",
      "Urea",
      "Lactic Acid",
      "Sodium Lactate",
      "Serine",
      "Sorbitol",
      "Sodium Chloride",
      "Allantoin",
    ],
    sourceNote:
      "Formula and claims are from Simple's official regional product page. Check the exact pack for the current market-specific ingredient list.",
  },
  "skin-cafe": {
    sourceLabel: "Skin Cafe Official",
    sourceUrl:
      "https://skincafe.co/product/skin-cafe-sunscreen-spf-50-pa-lightweight-non-greasy-60gm/",
    verifiedAt: "2026-10-05",
    photo: {
      src: "https://skincafe.co/storage/media/2026/07/658c2172-f65a-4508-a219-ed0393c8c400.webp",
      alt: "Skin Cafe Sunscreen SPF 50 PA+++ Lightweight and Non-Greasy 60gm",
      sourceLabel: "Skin Cafe Official",
      sourceUrl:
        "https://skincafe.co/product/skin-cafe-sunscreen-spf-50-pa-lightweight-non-greasy-60gm/",
      exactVariant: true,
    },
    claims: [
      "SPF 50 PA+++",
      "UVA and UVB protection",
      "Lightweight and non-greasy",
      "Mattifying finish",
      "No white cast",
      "Non-comedogenic",
      "Dermatologically tested",
      "Suitable for all skin types",
    ],
    directions: [
      "Apply generously and evenly to the face and exposed body.",
      "Apply 20 minutes before sun exposure.",
      "Reapply after sweating, swimming, towel drying or extended sun exposure.",
      "The manufacturer states it can be used under makeup.",
    ],
    warnings: [
      "For external use only.",
      "Avoid contact with eyes and mouth.",
      "If irritation occurs, discontinue use.",
      "Rinse eyes with water if accidental eye contact occurs.",
      "Store in a cool, dry place away from direct sunlight and heat.",
      "Keep out of reach of children.",
      "Patch testing is recommended by the manufacturer.",
    ],
    ingredients: [
      "Aqua",
      "Octocrylene",
      "Octyl Methoxycinnamate",
      "Titanium Dioxide",
      "Octyl Salicylate",
      "Ceteareth-12",
      "PEG-100 Stearate",
      "Glyceryl Stearate",
      "Stearic Acid",
      "Cetyl Alcohol",
      "Stearyl Alcohol",
      "Light Liquid Paraffin",
      "Glycerin",
      "Propylene Glycol",
      "Carbomer",
      "Ethylhexyl Methoxycinnamate",
      "Sodium Hydroxide",
      "Disodium EDTA",
      "Phenoxyethanol",
      "DMDM Hydantoin",
    ],
    sourceNote:
      "Claims, directions, warnings and ingredient list are from Skin Cafe's official product page.",
  },
  "skin-aqua": {
    sourceLabel: "Rohto Official",
    sourceUrl: "https://jp.rohto.com/en/skin-aqua/super-moisture/",
    verifiedAt: "2026-10-05",
    photo: {
      src: "https://mrmax.jp/static_files/product_images/4987241190850_01.jpg",
      alt: "Rohto Skin Aqua Super Moisture UV Gel 110g SPF50+ PA++++",
      sourceLabel: "MrMax exact JAN 4987241190850 packshot",
      sourceUrl: "https://mrmax.jp/products/detail/50736",
      exactVariant: true,
    },
    claims: [
      "SPF50+ / PA++++",
      "UV water resistance★★",
      "Gel type for face and body",
      "Super waterproof",
      "Can be removed with soap",
      "Can be used as a makeup base",
      "Fragrance-free and colorant-free",
      "Mineral oil-free and paraben-free",
    ],
    directions: [
      "Apply an appropriate amount evenly to the skin.",
      "Reapply as needed to maintain UV protection, especially after wiping or sweating.",
      "The manufacturer states it is suitable for face and body use.",
    ],
    warnings: [
      "Do not use on wounds, swelling, eczema or other skin abnormalities.",
      "Stop use and consult a dermatologist if redness, swelling, itching, irritation or discoloration occurs.",
      "If the product gets into the eyes, rinse immediately.",
      "Avoid storage in extreme temperatures or direct sunlight.",
      "Keep out of reach of infants and young children.",
    ],
    keyIngredients: [
      "Sodium Hyaluronate",
      "Hydrolyzed Sodium Hyaluronate",
      "Hydroxypropyltrimonium Hyaluronate",
      "Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine",
      "Silica",
    ],
    ingredientSourceLabel: "Rohto Official — highlighted formulation ingredients",
    ingredientSourceUrl: "https://jp.rohto.com/en/skin-aqua/super-moisture/",
    sourceNote:
      "Manufacturer claims and highlighted formulation ingredients are from Rohto's official Skin Aqua page. The product photo is an exact-JAN 110g retailer packshot because the manufacturer page does not expose a stable exact-pack image suitable for the storefront.",
  },
  cosrx: {
    sourceLabel: "COSRX Official",
    sourceUrl:
      "https://www.cosrx.com/collections/all/products/low-ph-good-morning-gel-cleanser",
    verifiedAt: "2026-10-05",
    photo: {
      src: "https://www.arogga.com/_next/image?q=75&url=https%3A%2F%2Fcdn2.arogga.com%2FeyJidWNrZXQiOiJhcm9nZ2EiLCJrZXkiOiJQcm9kdWN0LXBfaW1hZ2VzXC81MDQ3OVwvNTA0NzktQ09TUlgtTG93LVBILUdvb2QtTW9ybmluZy1HZWwtQ2xlYW5zZXItNTBtbC0xNC11NjlpY2Mud2VicCIsImVkaXRzIjp7InJlc2l6ZSI6eyJ3aWR0aCI6MTAwMCwiaGVpZ2h0IjoxMDAwLCJmaXQiOiJvdXRzaWRlIn0sIm92ZXJsYXlXaXRoIjp7ImJ1Y2tldCI6ImFyb2dnYSIsImtleSI6Im1pc2NcL3dtLnBuZyIsImFscGhhIjo5MH19fQ%3D%3D&w=1280",
      alt: "COSRX Low pH Good Morning Gel Cleanser 50ml",
      sourceLabel: "Arogga exact 50ml packshot",
      sourceUrl:
        "https://www.arogga.com/product/50479/cosrx-low-ph-good-morning-gel-cleanser-50ml",
      exactVariant: true,
    },
    claims: [
      "Mildly acidic gel cleanser",
      "Official pH specification: 5.31 ± 1.00",
      "Designed to cleanse without a stripped feeling",
      "Removes impurities",
      "COSRX positions it for dry, dull, uneven-texture and sensitive skin",
    ],
    directions: [
      "Use morning and night after removing makeup when applicable.",
      "Wet hands and face, then foam a small amount of cleanser.",
      "Massage gently over the face, avoiding the eye and mouth areas.",
      "Rinse with warm water.",
    ],
    keyIngredients: [
      "Betaine Salicylate (BHA)",
      "Melaleuca Alternifolia (Tea Tree) Leaf Oil",
      "Allantoin",
    ],
    ingredients: [
      "Water",
      "Cocamidopropyl Betaine",
      "Sodium Lauroyl Methyl Isethionate",
      "Sodium Chloride",
      "Polysorbate 20",
      "Styrax Japonicus Branch/Fruit/Leaf Extract",
      "Butylene Glycol",
      "Saccharomyces Ferment",
      "Cryptomeria Japonica Leaf Extract",
      "Nelumbo Nucifera Leaf Extract",
      "Pinus Palustris Leaf Extract",
      "Ulmus Davidiana Root Extract",
      "Oenothera Biennis (Evening Primrose) Flower Extract",
      "Pueraria Lobata Root Extract",
      "Melaleuca Alternifolia (Tea Tree) Leaf Oil",
      "Allantoin",
      "Caprylyl Glycol",
      "Ethylhexylglycerin",
      "Betaine Salicylate",
      "Citric Acid",
      "Ethyl Hexanediol",
      "1,2-Hexanediol",
      "Trisodium Ethylenediamine Disuccinate",
      "Sodium Benzoate",
      "Disodium EDTA",
    ],
    sourceNote:
      "Claims, directions and ingredients are from COSRX's official product page. The exact 50ml packshot is sourced from Arogga because COSRX's stable official imagery primarily depicts the larger retail pack.",
  },
};

export function getVerifiedProductContent(productId: string) {
  return verifiedProductContent[productId];
}
