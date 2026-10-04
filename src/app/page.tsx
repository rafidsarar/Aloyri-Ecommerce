import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ArrowIcon } from "@/components/icons";
import { ProductArtwork } from "@/components/product-artwork";
import { ProductCard } from "@/components/product-card";
import { bestsellers, featuredProducts, products } from "@/lib/catalog";

const heroProduct = products.find((product) => product.id === "skin-aqua") ?? products[0];

const routine = [
  {
    step: "01",
    title: "Cleanse",
    copy: "Start with a comfortable cleanse that fits your morning and evening routine.",
    href: "/shop?category=Cleanser",
  },
  {
    step: "02",
    title: "Moisturize",
    copy: "Choose the texture that feels right for the day, from light hydration to richer comfort.",
    href: "/shop?category=Moisturizer",
  },
  {
    step: "03",
    title: "Protect",
    copy: "Finish the morning with sunscreen and make daily protection part of the routine.",
    href: "/shop?category=Sunscreen",
  },
];

export default function Home() {
  return (
    <main>
      <section className="shell pt-5 md:pt-8">
        <div className="grid min-h-[72vh] overflow-hidden rounded-[2rem] border border-[#713a35]/10 bg-[#f5e8e2] lg:grid-cols-[1.03fr_.97fr]">
          <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/55">
              <span className="h-px w-8 bg-[#b9725f]/55" />
              Aloyri skincare edit
            </div>

            <div className="max-w-2xl py-14 lg:py-20">
              <BrandMark className="items-start" />
              <h1 className="display mt-9 text-[clamp(3.5rem,7.5vw,7rem)] leading-[0.88] text-[#321f1c]">
                Skincare that earns a place in your routine.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-[#321f1c]/60 sm:text-lg">
                A considered edit of cleansers, moisturizers and daily SPF with
                straightforward product information and BDT pricing.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-3 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#60312d]"
                >
                  Shop the edit <ArrowIcon />
                </Link>
                <Link
                  href="/shop?category=Sunscreen"
                  className="rounded-full border border-[#713a35]/18 bg-white/60 px-6 py-3.5 text-sm font-medium text-[#713a35] transition hover:bg-white"
                >
                  Explore sunscreen
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#321f1c]/45">
              <span>Curated selection</span>
              <span>BDT pricing</span>
              <span>Bangladesh-first storefront</span>
            </div>
          </div>

          <div className="relative min-h-[470px] p-6 sm:p-9 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,255,255,.85),transparent_36%)]" />
            <div className="relative mx-auto flex h-full max-w-[580px] items-center">
              <div className="relative w-full">
                <ProductArtwork
                  product={heroProduct}
                  className="aspect-[4/5] rounded-[2rem] soft-shadow"
                />
                <div className="absolute -bottom-5 left-5 right-5 rounded-[1.35rem] border border-white/70 bg-white/82 p-5 backdrop-blur-md sm:left-8 sm:right-8">
                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/50">
                        Featured protection
                      </p>
                      <p className="mt-1 text-sm font-semibold">{heroProduct.brand}</p>
                      <p className="mt-0.5 text-sm text-[#321f1c]/65">{heroProduct.name}</p>
                    </div>
                    <Link
                      href={`/product/${heroProduct.slug}`}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#713a35] text-white"
                      aria-label={`View ${heroProduct.name}`}
                    >
                      <ArrowIcon />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-20 md:py-28">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
              Bestsellers
            </p>
            <h2 className="display mt-3 text-4xl text-[#321f1c] sm:text-5xl">
              The products people start with.
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden items-center gap-2 text-sm font-medium text-[#713a35] md:flex"
          >
            Shop all <ArrowIcon />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bestsellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="border-y border-[#713a35]/10 bg-[#f5e8e2]">
        <div className="shell py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/50">
                Build a simple routine
              </p>
              <h2 className="display mt-4 max-w-md text-5xl leading-[0.94] sm:text-6xl">
                Three steps. Less guesswork.
              </h2>
            </div>

            <div className="grid gap-3">
              {routine.map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  className="group grid gap-5 rounded-[1.4rem] border border-[#713a35]/10 bg-white/55 p-5 transition hover:bg-white sm:grid-cols-[52px_1fr_auto] sm:items-center"
                >
                  <span className="rose-text text-sm font-semibold">{item.step}</span>
                  <div>
                    <p className="text-base font-semibold">{item.title}</p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[#321f1c]/52">
                      {item.copy}
                    </p>
                  </div>
                  <ArrowIcon className="hidden h-4 w-4 text-[#713a35] transition group-hover:translate-x-1 sm:block" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-20 md:py-28">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_.7fr] lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
              Aloyri selection
            </p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">
              Everyday skincare, clearly presented.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[#321f1c]/52 lg:justify-self-end">
            Browse the same core product identities and selling prices used by
            Aloyri operations, presented here for customers without exposing
            internal cost, supplier or stock-batch information.
          </p>
        </div>

        <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="shell pb-20 md:pb-28">
        <div className="overflow-hidden rounded-[2rem] bg-[#713a35] text-[#fff8f5]">
          <div className="grid lg:grid-cols-[1.18fr_.82fr]">
            <div className="p-8 sm:p-10 lg:p-14">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
                The Aloyri idea
              </p>
              <h2 className="display mt-4 max-w-3xl text-5xl leading-[0.94] sm:text-6xl lg:text-7xl">
                Less noise. Better product choices.
              </h2>
              <p className="mt-7 max-w-xl text-sm leading-7 text-white/62">
                Aloyri keeps the storefront focused on what customers need to
                make a choice: product, category, size, price and a clear place
                in the routine.
              </p>
              <Link
                href="/shop"
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#fff8f5] px-6 py-3.5 text-sm font-semibold text-[#713a35]"
              >
                Browse skincare <ArrowIcon />
              </Link>
            </div>

            <div className="relative min-h-[320px] bg-[#9c5d50]">
              <div className="absolute left-[16%] top-[16%] h-[68%] w-[26%] rotate-[-9deg] rounded-[2rem] border border-white/20 bg-white/12 backdrop-blur" />
              <div className="absolute right-[16%] top-[22%] h-[62%] w-[26%] rotate-[8deg] rounded-[2rem] border border-white/20 bg-white/16 backdrop-blur" />
              <div className="absolute left-1/2 top-1/2 h-[72%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-[#fff8f5] shadow-2xl">
                <div className="rose-metal mx-auto mt-10 h-2 w-16 rounded-full" />
                <div className="mt-16 text-center">
                  <BrandMark compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
