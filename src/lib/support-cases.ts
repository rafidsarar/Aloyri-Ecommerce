import { withRecordRetry } from "@/lib/structured-record-store";
import "server-only";

import type { ReturnRequestInput } from "@/lib/crm-return-integration";
import {
  listPrivateJsonRecords,
  readPrivateJson,
  writeAdminAuditEvent,
  writePrivateJson,
} from "@/lib/storefront-admin-store";
import {
  suggestedSupportPriority,
  type SupportCaseCategory,
  type SupportCaseStatus,
  type SupportPriority,
} from "@/lib/support-case-model";

const CASE_PREFIX = "support/cases/";

export type SupportCaseEvent = {
  id: string;
  at: string;
  actor: string;
  type: string;
  detail?: string;
};

export type SupportCase = {
  version: 1;
  id: string;
  source: "return-request" | "customer-support";
  category: SupportCaseCategory;
  status: SupportCaseStatus;
  priority: SupportPriority;
  orderNumber?: string;
  customerName?: string;
  phone: string;
  accountId?: string;
  email?: string;
  crmReturnRequestId?: string;
  crmReturnStatus?: string;
  reason?: string;
  condition?: string;
  preferredResolution?: string;
  note: string;
  items?: Array<{ line: number; qty: number }>;
  internalNote?: string;
  assignedTo?: string;
  events: SupportCaseEvent[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};

function safeId(value: string) {
  return /^[a-f0-9]{32}$/.test(value);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function event(actor: string, type: string, detail?: string): SupportCaseEvent {
  return {
    id: crypto.randomUUID().replace(/-/g, ""),
    at: new Date().toISOString(),
    actor: actor.slice(0, 80),
    type: type.slice(0, 100),
    ...(detail ? { detail: detail.slice(0, 600) } : {}),
  };
}

function casePath(id: string) {
  return CASE_PREFIX + id + ".json";
}

function cleanPhone(value: string) {
  return value.trim().slice(0, 30);
}

export async function getSupportCase(id: string) {
  if (!safeId(id)) return null;
  return readPrivateJson<SupportCase>(casePath(id));
}

export async function listSupportCases(limit = 500) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 2000);
  const rows = await listPrivateJsonRecords<SupportCase>(CASE_PREFIX, safeLimit);
  return rows
    .map((row) => row.value)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createReturnSupportCase(input: {
  requestId: string;
  crmStatus?: string;
  phone: string;
  accountId?: string;
  request: ReturnRequestInput;
}) {
  const id = (await sha256Hex("aloyri-support-return-v1:" + input.requestId)).slice(0, 32);
  const existing = await getSupportCase(id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const category: SupportCaseCategory =
    input.request.preferredResolution === "Refund" ? "refund" : "return";
  const row: SupportCase = {
    version: 1,
    id,
    source: "return-request",
    ...(input.accountId ? { accountId: input.accountId } : {}),
    category,
    status: "new",
    priority: suggestedSupportPriority({
      category,
      reason: input.request.reason,
      preferredResolution: input.request.preferredResolution,
    }),
    orderNumber: input.request.orderNumber.trim().toUpperCase(),
    phone: cleanPhone(input.phone),
    crmReturnRequestId: input.requestId.slice(0, 160),
    ...(input.crmStatus ? { crmReturnStatus: input.crmStatus.slice(0, 80) } : {}),
    reason: input.request.reason,
    condition: input.request.condition,
    preferredResolution: input.request.preferredResolution,
    note: input.request.note.trim().slice(0, 2000),
    items: input.request.items.slice(0, 25),
    events: [
      event(
        "customer",
        "case.created_from_return",
        "Website return request accepted by CRM and mirrored into Customer Service.",
      ),
    ],
    createdAt: now,
    updatedAt: now,
  };
  await writePrivateJson(casePath(id), row);
  return row;
}

export async function createCustomerSupportCase(input: {
  customerName: string;
  phone: string;
  accountId?: string;
  email?: string;
  orderNumber?: string;
  category: Exclude<SupportCaseCategory, "return" | "refund">;
  note: string;
}) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID().replace(/-/g, "");
  const row: SupportCase = {
    version: 1,
    id,
    source: "customer-support",
    ...(input.accountId ? { accountId: input.accountId } : {}),
    category: input.category,
    status: "new",
    priority: suggestedSupportPriority({ category: input.category }),
    ...(input.orderNumber
      ? { orderNumber: input.orderNumber.trim().toUpperCase() }
      : {}),
    customerName: input.customerName.trim().replace(/\s+/g, " ").slice(0, 120),
    phone: cleanPhone(input.phone),
    ...(input.email ? { email: input.email.trim().toLowerCase().slice(0, 254) } : {}),
    note: input.note.trim().slice(0, 2000),
    events: [event("customer", "case.created", "Customer support request submitted.")],
    createdAt: now,
    updatedAt: now,
  };
  await writePrivateJson(casePath(id), row);
  return row;
}

export async function updateSupportCase(
  actor: string,
  id: string,
  input: {
    status: SupportCaseStatus;
    priority: SupportPriority;
    internalNote?: string;
  },
) {
  return withRecordRetry(async () => {

  const current = await getSupportCase(id);
  if (!current) throw new Error("Support case not found.");

  const now = new Date().toISOString();
  const statusChanged = current.status !== input.status;
  const priorityChanged = current.priority !== input.priority;
  const note = input.internalNote?.trim().slice(0, 1200) || "";
  const next: SupportCase = {
    ...current,
    status: input.status,
    priority: input.priority,
    ...(note ? { internalNote: note } : {}),
    assignedTo: actor,
    events: [
      ...current.events,
      ...(statusChanged
        ? [event(actor, "case.status_changed", current.status + " → " + input.status)]
        : []),
      ...(priorityChanged
        ? [event(actor, "case.priority_changed", current.priority + " → " + input.priority)]
        : []),
      ...(note ? [event(actor, "case.internal_note", note)] : []),
    ].slice(-80),
    updatedAt: now,
    ...(["resolved", "closed"].includes(input.status)
      ? { resolvedAt: current.resolvedAt || now }
      : { resolvedAt: undefined }),
  };

  await writePrivateJson(casePath(id), next);
  await writeAdminAuditEvent(
    actor,
    "support.case_updated",
    current.id + " · " + input.status + " · " + input.priority,
    { scope: "support", target: current.id },
  );
  return next;

  });
}


export async function appendCustomerSupportReply(id: string, note: string) {
  return withRecordRetry(async () => {

  const current = await getSupportCase(id);
  if (!current) throw new Error("Support case not found.");
  const clean = note.trim().replace(/\s+/g, " ").slice(0, 1200);
  if (clean.length < 2) throw new Error("Reply is too short.");
  const now = new Date().toISOString();
  const next: SupportCase = {
    ...current,
    status: current.status === "waiting-customer" ? "reviewing" : current.status,
    events: [...current.events, event("customer", "customer.reply", clean)].slice(-80),
    updatedAt: now,
  };
  await writePrivateJson(casePath(id), next);
  return next;

  });
}
