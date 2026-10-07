export async function syncSignedInWishlist(ids: string[]) {
  try {
    await fetch("/api/customer/account", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ savedProductIds: ids }),
    });
  } catch {
    // Device-local wishlist remains the fallback.
  }
}
