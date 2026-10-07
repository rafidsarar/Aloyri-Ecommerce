import Link from "next/link";

export function ProductTrustPanel({
  manufacturerVerified,
  sourceLabel,
}: {
  manufacturerVerified: boolean;
  sourceLabel?: string;
}) {
  const items = [
    {
      title: manufacturerVerified ? "Product facts checked" : "Product information",
      copy: manufacturerVerified
        ? `Key facts are checked against ${sourceLabel || "the manufacturer"} and the exact pack should remain the final reference.`
        : "Manufacturer details for this exact variant are awaiting verification. Refer to the supplied packaging for directions and ingredients.",
    },
    {
      title: "Authenticity & packaging",
      copy:
        "Check the seals, labeling and exact variant on delivery. Contact Aloyri if packaging appears inconsistent.",
    },
    {
      title: "COD & clear delivery",
      copy: "Cash on Delivery is available. Delivery is ৳80 inside Dhaka and ৳150 outside Dhaka.",
    },
    {
      title: "Returns & customer care",
      copy:
        "Wrong, damaged or problematic items can be submitted for review through Aloyri's return workflow.",
    },
  ];

  return (
    <section className="mt-5 rounded-[1.6rem] border border-[#713a35]/10 bg-[#fffaf7] p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
            Product trust
          </p>
          <h2 className="display mt-2 text-3xl">Clear information before you buy.</h2>
        </div>
        <Link
          href="/customer-care"
          className="text-xs font-semibold text-[#713a35] underline decoration-[#713a35]/20 underline-offset-4"
        >
          Customer care
        </Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="rounded-[1rem] bg-[#f5e8e2] p-4">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-2 text-xs leading-6 text-[#321f1c]/52">{item.copy}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-[11px] leading-5 text-[#321f1c]/40">
        Reviews are customer opinions, not medical advice. Skincare results vary by person and routine.
      </p>
    </section>
  );
}
