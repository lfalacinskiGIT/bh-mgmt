import { readSyncAuditLog } from "@/lib/mock-sync-audit-log";

export async function GET() {
  const items = await readSyncAuditLog();

  return Response.json({
    items,
    total: items.length,
  });
}
