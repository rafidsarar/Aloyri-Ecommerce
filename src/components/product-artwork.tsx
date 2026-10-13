import type { Product } from "@/lib/catalog";

/** A single coordinate system keeps fallback packaging proportional in every slot. */
export function ProductArtwork({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { visual } = product;
  const tube = visual.package === "tube";
  const pump = visual.package === "pump";

  return (
    <div
      className={`product-artwork relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(145deg, ${visual.from} 0%, ${visual.to} 72%)`,
      }}
      aria-hidden="true"
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 360" fill="none" focusable="false">
        <circle cx="270" cy="35" r="85" fill={visual.accent} opacity=".08" />
        <circle cx="25" cy="330" r="95" fill={visual.accent} opacity=".08" />
        <ellipse cx="150" cy="294" rx="57" ry="9" fill={visual.ink} opacity=".08" />
        {pump ? <>
          <rect x="137" y="63" width="26" height="25" rx="4" fill="white" />
          <rect x="138" y="59" width="45" height="8" rx="4" fill={visual.ink} />
        </> : null}
        <rect x="103" y="83" width="94" height="204" rx={tube ? 30 : 20} fill="white" fillOpacity=".9" />
        {tube
          ? <path d="M103 268H197V273Q197 287 181 287H119Q103 287 103 273Z" fill={visual.ink} />
          : <path d="M103 107V103Q103 83 123 83H177Q197 83 197 103V107Z" fill={visual.ink} />}
        {/* Decorative label marks stay inside the package even at 40px thumbnail size.
            Product names, brands and categories are rendered by the surrounding UI. */}
        <rect x="121" y="151" width="58" height="7" rx="2" fill={visual.ink} opacity=".75" />
        <rect x="129" y="166" width="42" height="4" rx="2" fill={visual.ink} opacity=".45" />
        <path d="M133 192H167" stroke={visual.ink} strokeOpacity=".3" />
        <rect x="125" y="209" width="50" height="4" rx="2" fill={visual.ink} opacity=".35" />
        <rect x="135" y="220" width="30" height="4" rx="2" fill={visual.ink} opacity=".25" />
      </svg>
    </div>
  );
}
