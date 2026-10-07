import "server-only";
import type { CourierProvider } from "@/lib/courier-shipment-model";

export type CourierProviderReadiness = {
  provider: Exclude<CourierProvider, "unassigned" | "other">;
  credentialsConfigured: boolean;
  bookingEnabled: false;
  reason: string;
};

function readyFlag(name: string) {
  return process.env[name] === "1";
}

export function courierProviderReadiness() {
  const providers = {
    pathao: {
      provider: "pathao",
      credentialsConfigured: readyFlag("ALOYRI_PATHAO_COURIER_CREDENTIALS_READY"),
      bookingEnabled: false,
      reason: readyFlag("ALOYRI_PATHAO_COURIER_CREDENTIALS_READY")
        ? "Credential readiness is recorded, but direct booking remains locked until provider-specific certification."
        : "Courier credentials are not configured yet.",
    },
    steadfast: {
      provider: "steadfast",
      credentialsConfigured: readyFlag("ALOYRI_STEADFAST_COURIER_CREDENTIALS_READY"),
      bookingEnabled: false,
      reason: readyFlag("ALOYRI_STEADFAST_COURIER_CREDENTIALS_READY")
        ? "Credential readiness is recorded, but direct booking remains locked until provider-specific certification."
        : "Courier credentials are not configured yet.",
    },
    redx: {
      provider: "redx",
      credentialsConfigured: readyFlag("ALOYRI_REDX_COURIER_CREDENTIALS_READY"),
      bookingEnabled: false,
      reason: readyFlag("ALOYRI_REDX_COURIER_CREDENTIALS_READY")
        ? "Credential readiness is recorded, but direct booking remains locked until provider-specific certification."
        : "Courier credentials are not configured yet.",
    },
  } satisfies Record<string, CourierProviderReadiness>;

  return {
    directBookingEnabled: false,
    providers,
  };
}
