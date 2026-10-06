import { get } from "@vercel/blob";
import { storefrontStoragePath } from "@/lib/storefront-admin-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const safeSegments = path.filter(
    (segment) =>
      segment &&
      segment !== "." &&
      segment !== ".." &&
      /^[A-Za-z0-9._-]+$/.test(segment),
  );

  if (!safeSegments.length || safeSegments.length !== path.length) {
    return new Response("Not found", { status: 404 });
  }

  const pathname = "media/" + safeSegments.join("/");
  try {
    const result = await get(storefrontStoragePath(pathname), {
      access: "private",
      useCache: true,
    });
    if (!result) return new Response("Not found", { status: 404 });

    return new Response(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
