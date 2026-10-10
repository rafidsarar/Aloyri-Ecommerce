/** Trust copy is editable in the existing homepage feature-chip field; never invent shipping promises. */
export function HomepageTrustStrip({ benefits }: { benefits: string[] }) {
  const items = benefits.map(item => item.trim()).filter(Boolean).slice(0, 4);
  if (!items.length) return null;
  return <section className="shell py-4 md:py-6" aria-label="Why shop Aloyri">
    <div className="store-benefits grid grid-cols-1 overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => <div key={i} className="store-benefit flex min-h-16 items-center justify-center gap-3 px-4 py-4 text-center">
        <span className="store-benefit-spark" aria-hidden="true">✦</span><span className="text-xs font-semibold tracking-wide sm:text-sm">{item}</span>
      </div>)}
    </div>
  </section>;
}
