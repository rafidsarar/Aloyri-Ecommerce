import type { Metadata } from "next";
import { CustomerInfoPage } from "@/components/customer-info-page";

export const metadata: Metadata = {
  title: "Shipping & delivery",
  description:
    "Aloyri delivery charges, order handling and tracking information for Bangladesh.",
  alternates: { canonical: "/shipping-delivery" },
};

export default function ShippingDeliveryPage() {
  return (
    <CustomerInfoPage
      eyebrow="Customer care"
      title="Shipping & delivery."
      intro="Delivery charges are shown before the final order is placed and are rechecked by Aloyri when the order is created."
      sections={[
        {
          title: "Delivery charges",
          bullets: [
            "Inside Dhaka: ৳80.",
            "Outside Dhaka: ৳150.",
            "The selected delivery zone and final payable amount are shown during checkout.",
          ],
        },
        {
          title: "Order handling",
          paragraphs: [
            "After a website order is placed, it enters Aloyri's order workflow for confirmation, preparation, packing and shipment. Actual delivery timing depends on destination, courier operations and the order's processing stage.",
            "Aloyri does not promise a fixed delivery date until the relevant order and courier information support it.",
          ],
        },
        {
          title: "Tracking",
          paragraphs: [
            "Use the Track Order page with the website order number and the same Bangladesh mobile number used at checkout. When a courier reference is available in Aloyri, it appears in the customer tracking view.",
          ],
        },
        {
          title: "Cash on Delivery",
          paragraphs: [
            "Cash on Delivery is currently the live checkout payment method. The payable total shown at checkout includes the configured delivery charge.",
          ],
        },
      ]}
    />
  );
}
