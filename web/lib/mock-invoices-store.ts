import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { MockDataValidationError } from "@/lib/mock-json-validation";
import { getContractEconomics } from "@/lib/mock-contract-economics";

export type InvoiceStatus = "issued" | "paid" | "overdue";
export type InvoiceFlowType = "revenue" | "cost";

export interface MockInvoice {
  id: string;
  number: string;
  customerName: string;
  netAmount: number;
  grossAmount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  flowType: InvoiceFlowType;
  contractId: string | null;
  source: "mock-sync" | "seed";
  createdAt: string;
}

const MOCK_FILE_PATH = path.join(process.cwd(), "data", "mock", "v1", "invoices.json");
const TARGET_INVOICE_COUNT = 150;
const invoiceStatuses: InvoiceStatus[] = ["issued", "paid", "overdue"];
const invoiceFlowTypes: InvoiceFlowType[] = ["revenue", "cost"];

const invoiceSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1),
  customerName: z.string().min(1),
  netAmount: z.number(),
  grossAmount: z.number(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  status: z.enum(["issued", "paid", "overdue"]),
  flowType: z.enum(["revenue", "cost"]).optional(),
  contractId: z.string().nullable().optional(),
  source: z.enum(["mock-sync", "seed"]),
  createdAt: z.string().min(1),
});

const invoicesSchema = z.array(invoiceSchema);

function normalizeInvoices(invoices: Array<z.infer<typeof invoiceSchema>>): MockInvoice[] {
  return invoices.map((invoice, index) => ({
    ...invoice,
    flowType: invoice.flowType ?? invoiceFlowTypes[index % invoiceFlowTypes.length],
    contractId: invoice.contractId ?? null,
  }));
}

function shiftIsoDate(dateIso: string, dayOffset: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function expandInvoices(invoices: MockInvoice[]): MockInvoice[] {
  if (invoices.length === 0 || invoices.length >= TARGET_INVOICE_COUNT) {
    return invoices;
  }

  const expanded = [...invoices];
  const contracts = getContractEconomics("baseline");

  for (let index = invoices.length; index < TARGET_INVOICE_COUNT; index += 1) {
    const template = invoices[index % invoices.length];
    const cycle = Math.floor(index / invoices.length);
    const sequence = String(index + 1).padStart(5, "0");
    const issueDate = shiftIsoDate(template.issueDate, cycle * 3 + (index % 8));
    const dueDate = shiftIsoDate(issueDate, 14 + (index % 5));
    const netAmount = Math.max(1000, Math.round(template.netAmount * (0.84 + ((index % 10) * 0.03))));
    const grossAmount = Math.round(netAmount * 1.23 * 100) / 100;

    expanded.push({
      ...template,
      id: `${template.id}-${sequence}`,
      number: `BH/2026/${sequence}`,
      customerName: `Box Haus Client ${10 + (index % 90)}`,
      netAmount,
      grossAmount,
      issueDate,
      dueDate,
      status: invoiceStatuses[index % invoiceStatuses.length],
      flowType: invoiceFlowTypes[index % invoiceFlowTypes.length],
      contractId: index % 3 === 0 ? (contracts[index % contracts.length]?.id ?? null) : null,
      source: template.source,
      createdAt: new Date(`${issueDate}T08:00:00.000Z`).toISOString(),
    });
  }

  return expanded;
}

async function ensureStoreDir() {
  await mkdir(path.dirname(MOCK_FILE_PATH), { recursive: true });
}

export async function getAllMockInvoices(): Promise<MockInvoice[]> {
  try {
    const raw = await readFile(MOCK_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const validated = invoicesSchema.safeParse(parsed);

    if (!validated.success) {
      const details = validated.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join("; ");

      throw new MockDataValidationError(MOCK_FILE_PATH, `Invalid invoices.json schema. ${details}`);
    }

    return expandInvoices(normalizeInvoices(validated.data));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return [];
    }

    if (error instanceof MockDataValidationError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new MockDataValidationError(MOCK_FILE_PATH, "Invalid JSON format in invoices.json");
    }

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

export async function updateMockInvoice(
  id: string,
  changes: Partial<Pick<MockInvoice, "flowType" | "contractId" | "status">>,
): Promise<MockInvoice | null> {
  const invoices = await getAllMockInvoices();
  const index = invoices.findIndex((invoice) => invoice.id === id);

  if (index === -1) {
    return null;
  }

  const updatedInvoice: MockInvoice = {
    ...invoices[index],
    ...changes,
    contractId: changes.contractId === undefined ? invoices[index].contractId : changes.contractId,
  };

  invoices[index] = updatedInvoice;
  await saveAllMockInvoices(invoices);

  return updatedInvoice;
}
