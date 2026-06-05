import path from "node:path";
import { z } from "zod";
import { MockDataValidationError, readJsonFileWithSchema } from "@/lib/mock-json-validation";

const DATA_DIR = path.join(process.cwd(), "data", "mock", "v1");

const nonEmptyString = z.string().min(1);

const schemas = {
  contracts: z.array(
    z.object({
      id: nonEmptyString,
      number: nonEmptyString,
      clientName: nonEmptyString,
      lineOfBusiness: nonEmptyString,
      status: nonEmptyString,
      valueContractNet: z.number(),
    }),
  ),
  invoices: z.array(
    z.object({
      id: nonEmptyString,
      number: nonEmptyString,
      customerName: nonEmptyString,
      netAmount: z.number(),
      grossAmount: z.number(),
      issueDate: nonEmptyString,
      dueDate: nonEmptyString,
      status: z.enum(["issued", "paid", "overdue"]),
      source: z.enum(["mock-sync", "seed"]),
      createdAt: nonEmptyString,
    }),
  ),
  timeEntries: z.array(
    z.object({
      id: nonEmptyString,
      contractId: nonEmptyString,
      employeeId: nonEmptyString,
      workDate: nonEmptyString,
      hours: z.number().nonnegative(),
      category: nonEmptyString,
    }),
  ),
  payroll: z.array(
    z.object({
      id: nonEmptyString,
      employeeId: nonEmptyString,
      month: nonEmptyString,
      grossCost: z.number().nonnegative(),
      netCost: z.number().nonnegative(),
    }),
  ),
  actualCosts: z.array(
    z.object({
      id: nonEmptyString,
      contractId: nonEmptyString,
      category: nonEmptyString,
      amountNet: z.number(),
      recordedAt: nonEmptyString,
    }),
  ),
  productionOverheads: z.array(
    z.object({
      id: nonEmptyString,
      contractId: nonEmptyString,
      month: nonEmptyString,
      rateType: z.enum(["daily", "hourly"]),
      rate: z.number().nonnegative(),
      units: z.number().nonnegative(),
      amountNet: z.number(),
    }),
  ),
  crewsAndFleet: z.array(
    z.object({
      id: nonEmptyString,
      crewId: nonEmptyString,
      month: nonEmptyString,
      costType: nonEmptyString,
      amountNet: z.number(),
      allocationBasis: nonEmptyString,
    }),
  ),
  commissions: z.array(
    z.object({
      id: nonEmptyString,
      contractId: nonEmptyString,
      salesOwner: nonEmptyString,
      ratePct: z.number().nonnegative(),
      baseAmountNet: z.number().nonnegative(),
      amountNet: z.number().nonnegative(),
    }),
  ),
  businessLines: z.array(
    z.object({
      id: nonEmptyString,
      code: nonEmptyString,
      name: nonEmptyString,
      isActive: z.boolean(),
    }),
  ),
};

export interface MockValidationResult {
  file: string;
  ok: boolean;
  message: string;
}

export async function validateRequiredMockDataFiles(): Promise<MockValidationResult[]> {
  const checks: Array<[string, z.ZodType]> = [
    ["contracts.json", schemas.contracts],
    ["invoices.json", schemas.invoices],
    ["time-entries.json", schemas.timeEntries],
    ["payroll.json", schemas.payroll],
    ["actual-costs.json", schemas.actualCosts],
    ["production-overheads.json", schemas.productionOverheads],
    ["crews-and-fleet.json", schemas.crewsAndFleet],
    ["commissions.json", schemas.commissions],
    ["business-lines.json", schemas.businessLines],
  ];

  const results: MockValidationResult[] = [];

  for (const [file, schema] of checks) {
    const filePath = path.join(DATA_DIR, file);

    try {
      await readJsonFileWithSchema(filePath, schema);
      results.push({ file, ok: true, message: "OK" });
    } catch (error) {
      const message =
        error instanceof MockDataValidationError
          ? error.message
          : `Unexpected validation error for ${file}`;

      results.push({ file, ok: false, message });
    }
  }

  return results;
}
