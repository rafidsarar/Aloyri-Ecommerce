import { GET as serveStorefrontMedia } from "@/app/api/storefront-media/[...path]/route";
import {
  listStorefrontMedia,
  storefrontStoragePath,
  uploadStorefrontMedia,
} from "@/lib/storefront-admin-store";
import { deleteMediaObject } from "@/lib/media-storage";

export const dynamic = "force-dynamic";

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlQY1sAAAAASUVORK5CYII=";

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }

  const expectedCommit = process.env.VERCEL_GIT_COMMIT_SHA || "";
  const suppliedCommit = new URL(request.url).searchParams.get("commit") || "";
  if (!expectedCommit || suppliedCommit !== expectedCommit) {
    return new Response("Not found", { status: 404 });
  }

  let pathname = "";
  let cleaned = false;

  try {
    const bytes = Buffer.from(ONE_PIXEL_PNG, "base64");
    const file = new File(
      [bytes],
      "storage-certification.png",
      { type: "image/png" },
    );

    pathname = await uploadStorefrontMedia(file);

    const media = await listStorefrontMedia();
    const listed = media.some((item) => item.pathname === pathname);

    const filename = pathname.replace(/^media\//, "");
    const served = await serveStorefrontMedia(
      new Request("https://preview.invalid/api/storefront-media/" + filename),
      { params: Promise.resolve({ path: [filename] }) },
    );
    const servedBytes = await served.arrayBuffer();
    const contentType = served.headers.get("content-type") || "";

    await deleteMediaObject(storefrontStoragePath(pathname));
    cleaned = true;

    return Response.json({
      uploaded: Boolean(pathname),
      listed,
      served:
        served.status === 200 &&
        contentType.startsWith("image/png") &&
        servedBytes.byteLength > 0,
      cleaned,
    });
  } catch (error) {
    if (pathname && !cleaned) {
      try {
        await deleteMediaObject(storefrontStoragePath(pathname));
        cleaned = true;
      } catch {
        // Preserve the original certification error.
      }
    }

    return Response.json(
      {
        uploaded: Boolean(pathname),
        listed: false,
        served: false,
        cleaned,
        error: error instanceof Error ? error.message : "Certification failed.",
      },
      { status: 500 },
    );
  }
}
