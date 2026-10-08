import { fetchCrmOrderTracking } from "@/lib/crm-tracking-integration";
import { reconcileSettlementFromTracking } from "@/lib/payment-settlement";
import { publicShipmentTracking, reconcileShipmentFromTracking } from "@/lib/courier-shipment";

export async function fetchOrderTracking(input: { orderNumber: string; phone: string }) {
  const result = await fetchCrmOrderTracking(input);
  if (result.ok) {
    try {
      await reconcileSettlementFromTracking({
        orderNumber: result.body.orderNumber,
        paymentMethod: result.body.paymentMethod,
        total: result.body.total,
        orderStatus: result.body.status,
      });
    } catch (error) {
      console.error("Payment reconciliation failed", error);
    }

    let shipment = null;
    try {
      shipment = await reconcileShipmentFromTracking({
        orderNumber: result.body.orderNumber,
        orderTotal: result.body.total,
        paymentMethod: result.body.paymentMethod,
        orderStatus: result.body.status,
        trackingReference: result.body.trackingReference,
      });
    } catch (error) {
      console.error("Shipment reconciliation failed", error);
    }

    return { ...result, body: { ...result.body, shipment: publicShipmentTracking(shipment) } };
  }

  return result;
}
