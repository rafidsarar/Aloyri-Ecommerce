import "server-only";

import {
  listPrivateJsonRecords,
  writePrivateJson,
} from "@/lib/storefront-admin-store";

export type RuntimeErrorRecord = {
  version: 1;
  id: string;
  createdAt: string;
  source: string;
  name: string;
  message: string;
  environment: string;
  commitSha: string | null;
};

const PREFIX = "admin/runtime-errors/";

function safeMessage(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name.slice(0, 80),
      message: error.message
        .replace(/https?:\/\/[^\s]+/gi, "[url]")
        .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
        .slice(0, 500),
    };
  }
  return {
    name: "Error",
    message: String(error)
      .replace(/https?:\/\/[^\s]+/gi, "[url]")
      .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
      .slice(0, 500),
  };
}

export async function recordRuntimeError(source: string, error: unknown) {
  try {
    const createdAt = new Date().toISOString();
    const sanitized = safeMessage(error);
    const record: RuntimeErrorRecord = {
      version: 1,
      id: crypto.randomUUID().replace(/-/g, ""),
      createdAt,
      source: source.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80) || "unknown",
      ...sanitized,
      environment: process.env.VERCEL_ENV || "development",
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    };
    const pathname =
      PREFIX +
      createdAt.replace(/[:.]/g, "-") +
      "-" +
      record.id +
      ".json";
    await writePrivateJson(pathname, record);
    return record;
  } catch {
    return null;
  }
}

export async function listRuntimeErrors(limit = 30) {
  try {
    const rows = await listPrivateJsonRecords<RuntimeErrorRecord>(
      PREFIX,
      Math.min(Math.max(limit, 1), 100),
    );
    return rows
      .map((row) => row.value)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch {
    return [] as RuntimeErrorRecord[];
  }
}
