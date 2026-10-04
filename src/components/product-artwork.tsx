import type { Product } from "@/lib/catalog";

export function ProductArtwork({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const packageClasses = {
    tube: "h-[62%] w-[31%] rounded-[2rem_2rem_1rem_1rem]",
    bottle: "h-[58%] w-[33%] rounded-[1.4rem_1.4rem_1rem_1rem]",
    pump: "h-[58%] w-[31%] rounded-[1.3rem_1.3rem_.9rem_.9rem]",
  }[product.visual.package];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(145deg, ${product.visual.from} 0%, ${product.visual.to} 72%)`,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute -right-[12%] -top-[8%] h-[42%] w-[42%] rounded-full opacity-35 blur-3xl"
        style={{ background: product.visual.accent }}
      />
      <div
        className="absolute -bottom-[15%] -left-[8%] h-[42%] w-[42%] rounded-full opacity-25 blur-3xl"
        style={{ background: product.visual.accent }}
      />

      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/88 shadow-[0_32px_70px_rgba(50,31,28,.16)] ${packageClasses}`}
      >
        {product.visual.package === "pump" ? (
          <>
            <div className="absolute -top-[10%] left-1/2 h-[11%] w-[34%] -translate-x-1/2 rounded-t-lg bg-white/95" />
            <div
              className="absolute -top-[13%] left-[48%] h-[4%] w-[30%] rounded-full"
              style={{ background: product.visual.ink }}
            />
          </>
        ) : null}

        {product.visual.package === "tube" ? (
          <div
            className="absolute bottom-0 left-0 right-0 h-[9%] rounded-b-[.9rem]"
            style={{ background: product.visual.ink }}
          />
        ) : (
          <div
            className="absolute top-0 left-0 right-0 h-[12%] rounded-t-[1.1rem]"
            style={{ background: product.visual.ink }}
          />
        )}

        <div className="absolute inset-x-[12%] top-[29%] text-center">
          <p
            className="text-[clamp(.45rem,1.2vw,.72rem)] font-semibold uppercase tracking-[0.14em]"
            style={{ color: product.visual.ink }}
          >
            {product.brand}
          </p>
          <div
            className="mx-auto mt-3 h-px w-8 opacity-45"
            style={{ background: product.visual.ink }}
          />
          <p
            className="mt-3 text-[clamp(.42rem,1vw,.62rem)] leading-tight opacity-80"
            style={{ color: product.visual.ink }}
          >
            {product.category}
          </p>
        </div>
      </div>

      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-60"
          style={{ color: product.visual.ink }}
        >
          {product.routineStep}
        </p>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: product.visual.accent }}
        />
      </div>
    </div>
  );
}
