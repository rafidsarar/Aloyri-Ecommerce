export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col justify-between rounded-[2rem] border border-black/10 bg-white/60 p-8 sm:p-12 lg:p-16">
        <p className="text-sm font-medium uppercase tracking-[0.28em]">Aloyri</p>

        <div className="max-w-3xl py-20">
          <p className="mb-5 text-sm uppercase tracking-[0.2em] text-black/55">
            Curated skincare
          </p>
          <h1 className="text-5xl font-medium leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Skincare, thoughtfully selected.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-black/60 sm:text-lg">
            The new Aloyri storefront foundation is ready for the product
            catalog, shopping experience, and checkout.
          </p>
        </div>

        <p className="text-sm text-black/45">Aloyri · Bangladesh</p>
      </div>
    </main>
  );
}
