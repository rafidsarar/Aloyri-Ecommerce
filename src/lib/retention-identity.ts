import "server-only";

export async function hashRetentionCustomerIdentity(value: string) {
  const normalized = value.trim().toLowerCase();
  const bytes = new TextEncoder().encode(
    "aloyri-retention-customer-v1:" + normalized,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
