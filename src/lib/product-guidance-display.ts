/**
 * Determine which instructions are shown on public product pages.
 * Explicit website-owned product text takes precedence over manufacturer
 * reference copy; verified material remains the fallback.
 */
export function resolveProductGuidance({
  ownerDirections,
  ownerCareNotes,
  verifiedDirections,
  verifiedWarnings,
  productDirections,
  productCareNotes,
}: {
  ownerDirections?: readonly string[] | null;
  ownerCareNotes?: readonly string[] | null;
  verifiedDirections?: readonly string[] | null;
  verifiedWarnings?: readonly string[] | null;
  productDirections: readonly string[];
  productCareNotes: readonly string[];
}) {
  const meaningful = (values?: readonly string[] | null) =>
    values?.map((value) => value.trim()).filter(Boolean) ?? [];
  const firstPopulated = (...sources: (readonly string[] | null | undefined)[]) => {
    for (const source of sources) {
      const values = meaningful(source);
      if (values.length > 0) return values;
    }
    return [] as string[];
  };
  return {
    directions: firstPopulated(ownerDirections, verifiedDirections, productDirections),
    careNotes: firstPopulated(ownerCareNotes, verifiedWarnings, productCareNotes),
  };
}
