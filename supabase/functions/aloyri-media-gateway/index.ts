import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6";

const BUCKET = "aloyri-ecommerce-media";
const ISSUER = "https://oidc.vercel.com/aloyritechteam";
const AUDIENCE = "https://vercel.com/aloyritechteam";
const JWKS = createRemoteJWKSet(new URL(ISSUER + "/.well-known/jwks"));
const SUBJECTS = new Set([
  "owner:aloyritechteam:project:aloyri-ecommerce:environment:production",
  "owner:aloyritechteam:project:aloyri-ecommerce:environment:preview",
]);
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function verifyVercel(req: Request) {
  const token = req.headers.get("x-vercel-oidc-idp-token") || "";
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return typeof payload.sub === "string" && SUBJECTS.has(payload.sub);
  } catch {
    return false;
  }
}

async function authorized(req: Request) {
  const expectedLegacyKey = Deno.env.get("SUPABASE_MEDIA_GATEWAY_KEY") || "";
  const suppliedLegacyKey = req.headers.get("x-aloyri-storage-key") || "";
  if (expectedLegacyKey && suppliedLegacyKey === expectedLegacyKey) return true;
  return verifyVercel(req);
}

function safePath(value: string) {
  return value.split("/").filter(Boolean).every(
    (part) => part !== "." && part !== ".." && /^[A-Za-z0-9._-]+$/.test(part),
  );
}

function allowedMediaPath(value: string) {
  return (
    safePath(value) &&
    (value.startsWith("media/") || value.startsWith("preview/media/"))
  );
}

function allowedPrefix(value: string) {
  return value === "media/" || value === "preview/media/";
}

Deno.serve(async (req: Request) => {
  if (!(await authorized(req))) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  if (req.method === "POST" && (url.pathname.endsWith("/upload") || action === "upload")) {
    let pathname = "";
    let contentType = "";
    let bytes: Uint8Array;

    if (url.pathname.endsWith("/upload")) {
      const form = await req.formData();
      const file = form.get("file");
      pathname = String(form.get("path") || "");
      if (!(file instanceof File)) return new Response("Invalid media", { status: 400 });
      contentType = file.type || "application/octet-stream";
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      pathname = req.headers.get("x-object-path") || "";
      contentType = req.headers.get("content-type") || "application/octet-stream";
      bytes = new Uint8Array(await req.arrayBuffer());
    }

    if (
      !allowedMediaPath(pathname) ||
      bytes.length <= 0 ||
      bytes.length > 5 * 1024 * 1024 ||
      !MIME_TYPES.has(contentType)
    ) {
      return new Response("Invalid media", { status: 400 });
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(pathname, bytes, { contentType, upsert: false });
    if (error) return Response.json({ error: error.message }, { status: 409 });
    return Response.json({ pathname, size: bytes.length });
  }

  if (req.method === "GET" && (url.pathname.endsWith("/list") || action === "list")) {
    const prefix = url.searchParams.get("prefix") || "";
    if (!safePath(prefix) || !allowedPrefix(prefix)) {
      return new Response("Invalid prefix", { status: 400 });
    }

    const cursor = url.searchParams.get("cursor") || "0";
    const offset = Number(cursor);
    if (!/^\d+$/.test(cursor) || !Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) {
      return new Response("Invalid cursor", { status: 400 });
    }
    const paginated = action !== "list" || url.searchParams.get("pagination") === "1";
    const folder = prefix.replace(/\/$/, "");
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: paginated ? 101 : 100,
      offset,
      sortBy: { column: "name", order: "desc" },
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    if (!paginated) return Response.json(data || []);
    const items = (data || []).slice(0, 100);
    const hasMore = (data || []).length > 100;

    return Response.json({
      hasMore,
      nextCursor: hasMore ? String(offset + items.length) : null,
      objects: items.map((item) => ({
        pathname: prefix + item.name,
        size: Number(item.metadata?.size || 0),
        uploadedAt: item.updated_at || item.created_at,
      })),
    });
  }

  if (
    url.pathname.endsWith("/object") ||
    (url.searchParams.has("path") && !action)
  ) {
    const pathname = url.searchParams.get("path") || "";
    if (!allowedMediaPath(pathname)) {
      return new Response("Not found", { status: 404 });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase.storage.from(BUCKET).remove([pathname]);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return new Response(null, { status: 204 });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase.storage.from(BUCKET).download(pathname);
      if (error || !data) return new Response("Not found", { status: 404 });
      return new Response(data.stream(), {
        headers: {
          "Content-Type": data.type || "application/octet-stream",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }

  return new Response("Not found", { status: 404 });
});
