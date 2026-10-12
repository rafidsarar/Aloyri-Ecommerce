import type { ReactNode } from "react";

/** Shared geometry and surfaces for every banner in the homepage carousel. */
export function HeroBannerFrame({ copy, visual, style = "soft", alignment = "left", stacked = false, showImageOnMobile = true }: {
  copy: ReactNode;
  visual: ReactNode;
  style?: "soft" | "minimal" | "contrast";
  alignment?: "left" | "center";
  stacked?: boolean;
  showImageOnMobile?: boolean;
}) {
  return <div className={`store-hero store-hero-${style} store-hero-align-${alignment} grid min-h-[490px] min-w-0 overflow-hidden rounded-[2rem] border ${stacked ? "grid-cols-1" : "lg:grid-cols-[1.03fr_.97fr]"}`}>
    <div className="store-hero-copy min-w-0 relative z-10 flex flex-col justify-between p-7 sm:p-10 lg:p-14">{copy}</div>
    <div className={`store-hero-art min-w-0 relative min-h-[280px] lg:min-h-[420px] p-6 sm:p-9 lg:p-12 ${showImageOnMobile ? "" : "hidden lg:block"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,255,255,.85),transparent_36%)]" />
      <div className="relative mx-auto flex h-full max-w-[580px] items-center"><div className="relative w-full">{visual}</div></div>
    </div>
  </div>;
}
