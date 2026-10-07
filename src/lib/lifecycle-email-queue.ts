import "server-only";

import { customerEmailPreferencesForEmail } from "@/lib/customer-auth";
import { brandedEmailShell, sendTransactionalEmail } from "@/lib/email-delivery";
import { lifecycleReadiness } from "@/lib/lifecycle-orchestration";
import { lifecyclePlanForDelivery, type LifecycleTrigger } from "@/lib/lifecycle-policy";
import { replenishmentDays } from "@/lib/retention-utils";
import { listPrivateJsonRecords, readPrivateJson, writePrivateJson } from "@/lib/storefront-admin-store";

export type LifecycleQueueStatus = "pending" | "sent" | "cancelled";
export type LifecycleQueueRecord = {
  version: 1;
  id: string;
  sourceEventId: string;
  trigger: Extract<LifecycleTrigger, "post-delivery-follow-up" | "review-request" | "reorder-reminder">;
  email: string;
  scheduledAt: string;
  status: LifecycleQueueStatus;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
};

const ITEM_PREFIX = "lifecycle-queue/items/";

function cleanEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(new Uint8Array(digest)).toString("base64url");
}

export async function listLifecycleQueue(limit = 5000) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 5000);
  const rows = await listPrivateJsonRecords<LifecycleQueueRecord>(
    ITEM_PREFIX,
    safeLimit,
  );
  return rows
    .map((row) => row.value)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function enqueueDeliveredLifecycleEvent(input: {
  eventId: string;
  email: string;
  deliveredAt: string;
  items: Array<{ category: string; qty: number }>;
}) {
  if (!lifecycleReadiness().lifecycleEnabled) throw new Error("LIFECYCLE_NOT_READY");
  const email = cleanEmail(input.email);
  if (!email) throw new Error("INVALID_EMAIL");
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(input.eventId) || Number.isNaN(Date.parse(input.deliveredAt))) {
    throw new Error("INVALID_EVENT");
  }

  const preferences = await customerEmailPreferencesForEmail(email);
  const categoryDays = input.items
    .filter((item) => typeof item.category === "string" && Number.isInteger(item.qty) && item.qty >= 1 && item.qty <= 100)
    .map((item) => replenishmentDays(item.category) * Math.max(1, Math.min(6, item.qty)));
  const plan = lifecyclePlanForDelivery({ deliveredAt: input.deliveredAt, categoryDays });
  const allowed = new Set<string>([
    ...(preferences.postDelivery ? ["post-delivery-follow-up"] : []),
    ...(preferences.reviewRequest ? ["review-request"] : []),
    ...(preferences.reorderReminder ? ["reorder-reminder"] : []),
  ]);

  const createdAt = new Date().toISOString();
  let queued = 0;
  for (const item of plan) {
    if (!allowed.has(item.trigger)) continue;
    const key = await sha256("aloyri-lifecycle-v1:" + input.eventId + ":" + item.trigger);
    const path = ITEM_PREFIX + key + ".json";
    if (await readPrivateJson<LifecycleQueueRecord>(path)) continue;
    const row: LifecycleQueueRecord = {
      version: 1,
      id: key.slice(0, 32),
      sourceEventId: input.eventId,
      trigger: item.trigger,
      email,
      scheduledAt: item.dueAt,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    };
    await writePrivateJson(path, row);
    queued += 1;
  }
  return { queued };
}

function messageFor(trigger: LifecycleQueueRecord["trigger"]) {
  if (trigger === "post-delivery-follow-up") return {
    subject: "How did your Aloyri order arrive?",
    eyebrow: "Post-delivery care",
    title: "We hope everything arrived well.",
    copy: "Your Aloyri order was marked delivered. Review recent orders, customer-care options and return guidance from your secure customer hub.",
    ctaLabel: "Open customer account",
  };
  if (trigger === "review-request") return {
    subject: "Share your Aloyri product experience",
    eyebrow: "Verified review",
    title: "Your experience can help another customer.",
    copy: "Your delivered purchase is now eligible for a verified review. Open your customer hub to find recent products and review links.",
    ctaLabel: "Review recent products",
  };
  return {
    subject: "Your skincare routine may be ready for a refill",
    eyebrow: "Replenishment reminder",
    title: "It may be time to check your routine.",
    copy: "Based on the product category and quantity from your delivered order, your estimated replenishment window is approaching. Live stock and price are always rechecked before purchase.",
    ctaLabel: "Check recent products",
  };
}

export async function sendDueLifecycleEmails(limit = 100) {
  if (!lifecycleReadiness().lifecycleEnabled) {
    return { enabled: false, checked: 0, sent: 0, failed: 0, reason: "LIFECYCLE_NOT_READY" };
  }
  const rows = (await listLifecycleQueue())
    .filter((row) => row.status === "pending" && Date.parse(row.scheduledAt) <= Date.now())
    .slice(0, Math.min(Math.max(limit, 1), 250));
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const preferences = await customerEmailPreferencesForEmail(row.email);
    const allowed =
      (row.trigger === "post-delivery-follow-up" && preferences.postDelivery) ||
      (row.trigger === "review-request" && preferences.reviewRequest) ||
      (row.trigger === "reorder-reminder" && preferences.reorderReminder);
    const key = await sha256("aloyri-lifecycle-v1:" + row.sourceEventId + ":" + row.trigger);
    const path = ITEM_PREFIX + key + ".json";
    if (!allowed) {
      await writePrivateJson(path, { ...row, status: "cancelled", updatedAt: new Date().toISOString() });
      continue;
    }
    const message = messageFor(row.trigger);
    const result = await sendTransactionalEmail({
      to: row.email,
      idempotencyKey: "lifecycle:" + row.id,
      subject: message.subject,
      html: brandedEmailShell({
        eyebrow: message.eyebrow,
        title: message.title,
        copy: message.copy,
        ctaLabel: message.ctaLabel,
        ctaHref: "/account",
        footer: "You control lifecycle emails from your Aloyri customer account.",
      }),
      text: message.title + "\n\n" + message.copy + "\n\nOpen your account: /account",
    });
    if (!result.ok) {
      failed += 1;
      continue;
    }
    const sentAt = new Date().toISOString();
    await writePrivateJson(path, { ...row, status: "sent", sentAt, updatedAt: sentAt });
    sent += 1;
  }
  return { enabled: true, checked: rows.length, sent, failed };
}
