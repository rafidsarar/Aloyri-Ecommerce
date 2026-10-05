import type { Metadata } from "next";
import Link from "next/link";
import { CustomerInfoPage } from "@/components/customer-info-page";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export const metadata: Metadata = {
  title: "Contact Aloyri",
  description:
    "Prepare the information Aloyri needs to help with a website order, delivery or return.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const config = await readStorefrontConfig();
  const { supportEmail, supportPhone, supportHours } = config.site;
  const hasSupport = supportEmail || supportPhone || supportHours;

  return (
    <>
      <CustomerInfoPage {...config.pages.contact} />
      <div className="shell -mt-8 pb-16">
        {hasSupport ? (
          <div className="mb-5 max-w-2xl rounded-[1.35rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 text-sm">
            <p className="font-semibold">Aloyri support</p>
            <div className="mt-3 grid gap-2 text-[#321f1c]/62">
              {supportEmail ? <p>Email: {supportEmail}</p> : null}
              {supportPhone ? <p>Phone: {supportPhone}</p> : null}
              {supportHours ? <p>{supportHours}</p> : null}
            </div>
          </div>
        ) : null}
        <Link
          href="/track-order"
          className="inline-flex rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
        >
          Track an order
        </Link>
      </div>
    </>
  );
}
