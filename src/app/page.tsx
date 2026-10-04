import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { featuredProducts, newArrivals } from "@/lib/catalog";

const categories = [
  ["Cleanse", "Daily essentials for a clean, comfortable start."],
  ["Treat", "Targeted serums and essences for focused routines."],
  ["Moisturize", "Barrier-supporting textures for lasting comfort."],
  ["Protect", "Everyday sun care selected for warm, humid days."],
];

export default function Home() {
  return (
    <main>
      <section className="shell pt-5 md:pt-8">
        <div className="grid min-h-[74vh] overflow-hidden rounded-[2rem] bg-[#d9cec3] lg:grid-cols-[1.05fr_.95fr]">
          <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-black/55">
              Curated skincare · Bangladesh
            </p>

            <div className="max-w-2xl py-16 lg:py-24">
              <p className="mb-6 text-sm text-black/55">A quieter approach to skincare.</p>
              <h1 className="display text-[clamp(3.3rem,8vw,7.4rem)] leading-[0.88]">
                Care for skin,
                <br />
                chosen with care.
              </h1>
              <p className="mt-8 max-w-lg text-base leading-7 text-black/62 sm:text-lg">
                Thoughtfully selected formulas, clear routines, and a refined shopping
                experience built around what your skin actually needs.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-3 rounded-full bg-[#211d1a] px-6 py-3.5 text-sm font-medium text-white transition hover:-translate-y-0.5"
                >
                  Shop skincare <ArrowIcon />
                </Link>
                <a
                  href="#new"
                  className="rounded-full border border-black/15 bg-white/35 px-6 py-3.5 text-sm font-medium backdrop-blur transition hover:bg-white/55"
                >
                  Explore new arrivals
                </a>
              </div>
            </div>

            <p className="max-w-md text-xs leading-5 text-black/48">
              Authenticity, thoughtful selection and practical skincare guidance are central
              to every Aloyri edit.
            </p>
          </div>

          <div className="relative min-h-[420px] bg-[radial-gradient(circle_at_50%_30%,#f5eee8_0%,#cbb8a8_42%,#9f8878_100%)]">
            <div className="absolute left-1/2 top-1/2 h-[54%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[40%_40%_28%_28%] bg-[#f4efe8] shadow-[0_40px_70px_rgba(55,38,28,.18)]" />
            <div className="absolute left-1/2 top-[33%] h-[15%] w-[24%] -translate-x-1/2 rounded-t-[2rem] bg-[#2f2925]" />
            <div className="absolute left-1/2 top-[47%] -translate-x-1/2 text-center">
              <p className="text-[10px] uppercase tracking-[0.32em] text-black/45">Aloyri</p>
              <p className="display mt-2 text-3xl">the edit</p>
            </div>
            <div className="absolute bottom-7 left-7 rounded-full bg-white/55 px-4 py-2 text-xs backdrop-blur">
              Clean formulas · calm rituals
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-20 md:py-28">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">Featured edit</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Start with the essentials.</h2>
          </div>
          <Link href="/shop" className="hidden items-center gap-2 text-sm md:flex">
            View all <ArrowIcon />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#ede6de]">
        <div className="shell grid gap-px py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-0">
          {categories.map(([title, copy]) => (
            <Link
              key={title}
              href="/shop"
              className="group border-black/10 py-8 sm:px-7 lg:border-r lg:py-14 first:pl-0 last:border-r-0"
            >
              <p className="display text-3xl">{title}</p>
              <p className="mt-3 max-w-[16rem] text-sm leading-6 text-black/55">{copy}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
                Browse <ArrowIcon className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="new" className="shell py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">Just in</p>
            <h2 className="display mt-3 max-w-md text-5xl leading-[0.94] sm:text-6xl">
              New textures for the everyday.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-black/55">
              A considered rotation of skincare selected for simple, repeatable routines.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="shell pb-20 md:pb-28">
        <div className="rounded-[2rem] bg-[#211d1a] px-7 py-14 text-[#f6f1eb] sm:px-10 md:py-20 lg:px-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_.72fr] lg:items-end">
            <h2 className="display max-w-3xl text-5xl leading-[0.94] sm:text-6xl lg:text-7xl">
              Skin confidence starts with a routine you understand.
            </h2>
            <div>
              <p className="max-w-lg text-sm leading-7 text-white/62">
                Aloyri is being built around clear product information, thoughtful curation,
                and an uncomplicated way to shop skincare.
              </p>
              <Link
                href="/shop"
                className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#f6f1eb] px-6 py-3.5 text-sm font-medium text-[#211d1a]"
              >
                Discover the collection <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
