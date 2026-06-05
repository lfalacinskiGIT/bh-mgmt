import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type InvoiceStatus = "issued" | "paid" | "overdue";

export interface MockInvoice {
  id: string;
  number: string;
  customerName: string;
  netAmount: number;
  grossAmount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  source: "mock-sync" | "seed";
  createdAt: string;
}

const MOCK_FILE_PATH = path.join(process.cwd(), "data", "mock", "v1", "invoices.json");

async function ensureStoreDir() {
  await mkdir(path.dirname(MOCK_FILE_PATH), { recursive: true });
}

export async function getAllMockInvoices(): Promise<MockInvoice[]> {
  try {
    const raw = await readFile(MOCK_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as MockInvoice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAllMockInvoices(invoices: MockInvoice[]): Promise<void> {
  await ensureStoreDir();
  await writeFile(MOCK_FILE_PATH, JSON.stringify(invoices, null, 2), "utf8");
}

export async function appendMockInvoices(invoices: MockInvoice[]): Promise<void> {
  const existing = await getAllMockInvoices();
  await saveAllMockInvoices([...invoices, ...existing]);
}
