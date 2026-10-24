/**
 * Preserve legacy bestseller text as the new all-products carousel default,
 * while allowing the Owner to customize its heading in Ecommerce Admin.
 */
export function resolveAllProductsCarouselCopy({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title?: string;
}) {
  const label = eyebrow?.trim() || "";
  const heading = title?.trim() || "";
  return {
    eyebrow: !label || label.toLowerCase() === "bestsellers"
      ? "Shop all products"
      : label,
    title: !heading || heading === "The products people start with."
      ? "Discover all our skincare."
      : heading,
  };
}
