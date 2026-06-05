import { appendMockInvoices, getAllMockInvoices, type MockInvoice } from "@/lib/mock-invoices-store";
import { appendSyncAuditLog } from "@/lib/mock-sync-audit-log";
import { isMockMode } from "@/lib/mock-mode";
import { getContractEconomics } from "@/lib/mock-contract-economics";

type SyncResult = {
  success: boolean;
  syncedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  created: MockInvoice[];
  updated: MockInvoice[];
  skipped: string[];
  errors: string[];
  mode: "quick";
  syncedAt: string;
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createInvoice(index: number): MockInvoice {
  const now = new Date();
  const issueDate = now.toISOString().slice(0, 10);
  const due = new Date(now);
  due.setDate(due.getDate() + randomInt(7, 21));

  const net = randomInt(1500, 20000);
  const gross = Math.round(net * 1.23 * 100) / 100;
  const statusPool: Array<MockInvoice["status"]> = ["issued", "paid", "overdue"];
  const flowPool: Array<MockInvoice["flowType"]> = ["revenue", "cost"];
  const contracts = getContractEconomics("baseline");

  return {
    id: crypto.randomUUID(),
    number: `BH/${now.getFullYear()}/${String(index).padStart(5, "0")}`,
    customerName: `Box Haus Client ${randomInt(10, 99)}`,
    netAmount: net,
    grossAmount: gross,
    issueDate,
    dueDate: due.toISOString().slice(0, 10),
    status: statusPool[randomInt(0, statusPool.length - 1)],
    flowType: flowPool[randomInt(0, flowPool.length - 1)],
    contractId: randomInt(0, 100) > 60 ? (contracts[randomInt(0, contracts.length - 1)]?.id ?? null) : null,
    source: "mock-sync",
    createdAt: now.toISOString(),
  };
}

export async function POST() {
  const startedAt = new Date().toISOString();

  if (!isMockMode()) {
    return Response.json({
      success: false,
      syncedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      created: [],
      updated: [],
      skipped: [],
      errors: [],
      mode: "quick",
      syncedAt: new Date().toISOString(),
      message: "Only MOCK_MODE is supported in this prototype",
    } satisfies SyncResult & { message: string });
  }

  try {
    const existing = await getAllMockInvoices();
    const nextIndex = existing.length + 1;
    const toCreate = randomInt(1, 3);
    const created = Array.from({ length: toCreate }, (_, idx) => createInvoice(nextIndex + idx));

    await appendMockInvoices(created);

    const syncedAt = new Date().toISOString();

    await appendSyncAuditLog({
      id: crypto.randomUUID(),
      provider: "optima",
      mode: "quick",
      startedAt,
      finishedAt: syncedAt,
      created: created.length,
      updated: 0,
      skipped: 0,
      errors: 0,
      status: "success",
      message: `Added ${created.length} invoice(s) from mock sync`,
    });

    return Response.json({
      success: true,
      syncedCount: created.length,
      createdCount: created.length,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      created,
      updated: [],
      skipped: [],
      errors: [],
      mode: "quick",
      syncedAt,
    } satisfies SyncResult);
  } catch (error) {
    const syncedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Unknown mock sync error";

    await appendSyncAuditLog({
      id: crypto.randomUUID(),
      provider: "optima",
      mode: "quick",
      startedAt,
      finishedAt: syncedAt,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      status: "error",
      message,
    });

    return Response.json(
      {
        success: false,
        syncedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        created: [],
        updated: [],
        skipped: [],
        errors: [message],
        mode: "quick",
        syncedAt,
      } satisfies SyncResult,
      { status: 500 },
    );
  }
}