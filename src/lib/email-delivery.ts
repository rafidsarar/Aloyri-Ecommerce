import "server-only";

import { siteConfig } from "@/lib/site";

function configuredEmail(value: string | undefined) {
  const normalized = (value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized
    : "";
}

export function transactionalEmailReadiness() {
  const domainReady = process.env.ALOYRI_EMAIL_DOMAIN_VERIFIED === "1";
  const apiReady = Boolean(process.env.RESEND_API_KEY);
  const fromEmail =
    configuredEmail(process.env.ALOYRI_TRANSACTIONAL_FROM_EMAIL) ||
    configuredEmail(process.env.ALOYRI_LIFECYCLE_FROM_EMAIL) ||
    configuredEmail(process.env.ALOYRI_RECOVERY_FROM_EMAIL);
  const senderReady = apiReady && Boolean(fromEmail);

  return {
    ready: domainReady && senderReady,
    domainReady,
    apiReady,
    senderReady,
    fromEmail: senderReady ? fromEmail : undefined,
  };
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const readiness = transactionalEmailReadiness();
  if (!readiness.ready || !readiness.fromEmail) {
    return {
      ok: false as const,
      code: "EMAIL_NOT_READY",
      status: 503,
    };
  }

  const to = configuredEmail(input.to);
  if (!to) {
    return {
      ok: false as const,
      code: "INVALID_EMAIL",
      status: 400,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: "Bearer " + (process.env.RESEND_API_KEY || ""),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: readiness.fromEmail,
        to: [to],
        subject: input.subject.slice(0, 180),
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        headers: {
          "X-Entity-Ref-ID": crypto.randomUUID(),
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        ok: false as const,
        code: "EMAIL_SEND_FAILED",
        status: response.status,
      };
    }

    return { ok: true as const, status: 200 };
  } catch {
    return {
      ok: false as const,
      code: "EMAIL_SEND_FAILED",
      status: 503,
    };
  }
}

export function brandedEmailShell(input: {
  eyebrow: string;
  title: string;
  copy: string;
  ctaLabel: string;
  ctaHref: string;
  footer?: string;
}) {
  const href = input.ctaHref.startsWith("http")
    ? input.ctaHref
    : siteConfig.url + (input.ctaHref.startsWith("/") ? input.ctaHref : "/" + input.ctaHref);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${input.title}</title>
  </head>
  <body style="margin:0;background:#fffaf7;color:#321f1c;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #eadbd6;border-radius:22px;padding:30px">
        <p style="margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#713a35">${input.eyebrow}</p>
        <h1 style="font-size:30px;line-height:1.15;margin:14px 0 0">${input.title}</h1>
        <p style="font-size:15px;line-height:1.75;color:#66504c;margin:18px 0 0">${input.copy}</p>
        <a href="${href}" style="display:inline-block;margin-top:22px;background:#713a35;color:#fff;text-decoration:none;padding:13px 21px;border-radius:999px;font-weight:700;font-size:14px">${input.ctaLabel}</a>
        <p style="font-size:11px;line-height:1.6;color:#8a7773;margin:26px 0 0">${input.footer || "Aloyri · Let Your Skin Glow."}</p>
      </div>
    </div>
  </body>
</html>`;
}
