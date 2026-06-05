import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { MockDataValidationError, readJsonFileWithSchema } from "@/lib/mock-json-validation";

const SYNC_AUDIT_LOG_FILE_PATH = path.join(process.cwd(), "data", "mock", "v1", "sync-audit-log.json");

const syncAuditEntrySchema = z.object({
  id: z.string().min(1),
  provider: z.enum(["optima", "ifirma"]),
  mode: z.string().min(1),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  status: z.enum(["success", "error"]),
  message: z.string().optional(),
});

const syncAuditLogSchema = z.array(syncAuditEntrySchema);

export type MockSyncAuditLogEntry = z.infer<typeof syncAuditEntrySchema>;

async function ensureAuditDir() {
  await mkdir(path.dirname(SYNC_AUDIT_LOG_FILE_PATH), { recursive: true });
}

export async function readSyncAuditLog(): Promise<MockSyncAuditLogEntry[]> {
  try {
    return await readJsonFileWithSchema(SYNC_AUDIT_LOG_FILE_PATH, syncAuditLogSchema);
  } catch (error) {
    if (error instanceof MockDataValidationError && error.message.includes("not found")) {
      return [];
    }

    throw error;
  }
}

export async function appendSyncAuditLog(entry: MockSyncAuditLogEntry): Promise<void> {
  const existing = await readSyncAuditLog();
  const updated = [entry, ...existing].slice(0, 200);

  await ensureAuditDir();
  await writeFile(SYNC_AUDIT_LOG_FILE_PATH, JSON.stringify(updated, null, 2), "utf8");
}
