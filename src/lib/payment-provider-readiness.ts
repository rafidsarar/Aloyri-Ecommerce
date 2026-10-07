import "server-only";
import type { SettlementPaymentMethod } from "@/lib/payment-settlement-model";

export type ProviderReadiness = {
  method: SettlementPaymentMethod;
  configured: boolean;
  enabled: boolean;
  reason: string;
};

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function paymentProviderReadiness() {
  const bkashConfigured =
    present("BKASH_APP_KEY") &&
    present("BKASH_APP_SECRET") &&
    present("BKASH_USERNAME") &&
    present("BKASH_PASSWORD");
  const nagadConfigured =
    present("NAGAD_MERCHANT_ID") &&
    present("NAGAD_MERCHANT_PRIVATE_KEY") &&
    present("NAGAD_GATEWAY_PUBLIC_KEY");

  const providers: Record<SettlementPaymentMethod, ProviderReadiness> = {
    COD: { method: "COD", configured: true, enabled: true, reason: "Cash on Delivery is active." },
    bKash: {
      method: "bKash",
      configured: bkashConfigured,
      enabled: false,
      reason: bkashConfigured
        ? "Merchant credentials are present, but provider activation remains intentionally locked pending credential-specific certification."
        : "Merchant credentials are not configured yet.",
    },
    Nagad: {
      method: "Nagad",
      configured: nagadConfigured,
      enabled: false,
      reason: nagadConfigured
        ? "Merchant credentials are present, but provider activation remains intentionally locked pending credential-specific certification."
        : "Merchant credentials are not configured yet.",
    },
  };

  return {
    paymentMethods: ["COD"] as SettlementPaymentMethod[],
    providers,
    onlinePaymentsEnabled: false,
  };
}
