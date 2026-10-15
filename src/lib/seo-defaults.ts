// Upgrade only the original short defaults; preserve Owner-written titles.
const titles: Record<string, readonly [string, string]> = {
  "/shop": ["Shop skincare", "Shop Skincare in Bangladesh"],
  "/category/cleansers": ["Cleansers", "Facial Cleansers for Your Skincare Routine"],
  "/category/moisturizers": ["Moisturizers", "Face Moisturizers for Daily Skincare"],
  "/category/sunscreen": ["Sunscreen", "Daily Sunscreen for Your Skincare Routine"],
  "/about": ["About Aloyri", "About Aloyri and Our Skincare Store"],
  "/contact": ["Contact Aloyri", "Contact Aloyri for Shopping Support"],
  "/customer-care": ["Customer care", "Customer Care and Order Support"],
  "/privacy": ["Privacy policy", "Privacy Policy for Aloyri Shoppers"],
};

export function descriptiveSeoTitle(title: string, canonical: string) {
  const entry = titles[canonical];
  return entry && title === entry[0] ? entry[1] : title;
}

export const defaultSocialImagePath = "/social-image";
