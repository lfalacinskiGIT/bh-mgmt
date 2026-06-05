import { appendMockInvoices, getAllMockInvoices, type MockInvoice } from "@/lib/mock-invoices-store";
import { isMockMode } from "@/lib/mock-mode";

type SyncResult = {
  success: boolean;
  syncedCount: number;
  created: MockInvoice[];
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

  return {
    id: crypto.randomUUID(),
    number: `BH/${now.getFullYear()}/${String(index).padStart(5, "0")}`,
    customerName: `Box Haus Client ${randomInt(10, 99)}`,
    netAmount: net,
    grossAmount: gross,
    issueDate,
    dueDate: due.toISOString().slice(0, 10),
    status: statusPool[randomInt(0, statusPool.length - 1)],
    source: "mock-sync",
    createdAt: now.toISOString(),
  };
}

export async function POST() {
  if (!isMockMode()) {
    return Response.json({
      success: false,
      syncedCount: 0,
      created: [],
      syncedAt: new Date().toISOString(),
      message: "Only MOCK_MODE is supported in this prototype",
    } satisfies SyncResult & { message: string });
  }

  const existing = await getAllMockInvoices();
  const nextIndex = existing.length + 1;
  const toCreate = randomInt(1, 3);
  const created = Array.from({ length: toCreate }, (_, idx) => createInvoice(nextIndex + idx));

  await appendMockInvoices(created);

  return Response.json({
    success: true,
    syncedCount: created.length,
    created,
    syncedAt: new Date().toISOString(),
  } satisfies SyncResult);
}
