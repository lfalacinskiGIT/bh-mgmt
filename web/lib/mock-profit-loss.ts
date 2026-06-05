import { type MockDatasetName } from "@/lib/mock-contract-economics";
import { getSourceRecords } from "@/lib/mock-management-reports";
import {
  getOutsideContractPositions,
  getContractReconciliationSnapshot,
  getReconciliationBridge,
  type SourceCostEntry,
} from "@/lib/mock-reporting-controls";
import { getTimeTrackingSummary } from "@/lib/mock-time-tracking";

export type ProfitLossPeriod = "all" | "ytd" | string;

export interface ProfitLossSummary {
  periodLabel: string;
  revenueContractNet: number;
  revenueOutsideNet: number;
  revenueTotalNet: number;
  costsContractNet: number;
  costsOutsideNet: number;
  payrollAllocatedToContractsNet: number;
  payrollOutsideContractsNet: number;
  outsideModelAdjustmentsNet: number;
  grossMarginNet: number;
  operatingResultNet: number;
  bridgeDifferenceNet: number;
}

function monthFromDate(dateValue: string): string {
  return dateValue.slice(0, 7);
}

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function getAvailableMonths(dataset: MockDatasetName): string[] {
  const months = new Set<string>();

  for (const record of getSourceRecords(dataset)) {
    months.add(monthFromDate(record.postedAt));
  }

  return Array.from(months).sort((left, right) => right.localeCompare(left));
}

function shouldIncludeMonth(period: ProfitLossPeriod, month: string, latestMonth: string): boolean {
  if (period === "all") {
    return true;
  }

  if (period === "ytd") {
    const activeYear = latestMonth.slice(0, 4);
    return month.startsWith(`${activeYear}-`);
  }

  return period === month;
}

export function getProfitLossSummary(dataset: MockDatasetName = "baseline", period: ProfitLossPeriod = "all"): ProfitLossSummary {
  const sourceRecords = getSourceRecords(dataset);
  const months = getAvailableMonths(dataset);
  const latestMonth = months[0] ?? "";

  const selectedRecords = sourceRecords.filter((record) =>
    shouldIncludeMonth(period, monthFromDate(record.postedAt), latestMonth),
  );

  const revenueContractNet = selectedRecords
    .filter((record) => record.type === "revenue" && !!record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const revenueOutsideNet = selectedRecords
    .filter((record) => record.type === "revenue" && !record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const costsContractNet = selectedRecords
    .filter((record) => record.type === "cost" && !!record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const costsOutsideNet = selectedRecords
    .filter((record) => record.type === "cost" && !record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const timeSummary = getTimeTrackingSummary(dataset, period === "all" || period === "ytd" ? latestMonth : period);

  const outsideModelAdjustmentsNet = getOutsideContractPositions(dataset).reduce((sum, item) => sum + item.amountNet, 0);
  const sourceCostEntries: SourceCostEntry[] = selectedRecords
    .filter((record) => record.type === "cost")
    .map((record) => ({
      id: record.id,
      month: monthFromDate(record.postedAt),
      source: record.origin === "virtual-warehouse"
        ? "warehouse"
        : record.origin === "payroll"
          ? "payroll"
          : record.origin === "kws"
            ? "kws"
            : "production",
      contractId: record.contractId ?? undefined,
      referenceKey: record.referenceKey,
      amountNet: record.netAmount,
    }));

  const snapshot = getContractReconciliationSnapshot(sourceCostEntries);
  const bridge = getReconciliationBridge(sourceCostEntries);
  const bridgeDifference = bridge.find((item) => item.id === "bridge-difference")?.amountNet ?? snapshot.unexplainedDifferenceNet;

  const revenueTotalNet = revenueContractNet + revenueOutsideNet;
  const grossMarginNet = revenueTotalNet - (costsContractNet + timeSummary.allocatedPayrollNetToContracts);
  const operatingResultNet =
    revenueTotalNet -
    (costsContractNet + costsOutsideNet + timeSummary.allocatedPayrollNetToContracts + timeSummary.allocatedPayrollNetOutsideContracts + outsideModelAdjustmentsNet);

  const periodLabel = period === "all"
    ? "Wszystkie okresy"
    : period === "ytd"
      ? `YTD ${latestMonth.slice(0, 4)}`
      : period;

  return {
    periodLabel,
    revenueContractNet: roundCurrency(revenueContractNet),
    revenueOutsideNet: roundCurrency(revenueOutsideNet),
    revenueTotalNet: roundCurrency(revenueTotalNet),
    costsContractNet: roundCurrency(costsContractNet),
    costsOutsideNet: roundCurrency(costsOutsideNet),
    payrollAllocatedToContractsNet: roundCurrency(timeSummary.allocatedPayrollNetToContracts),
    payrollOutsideContractsNet: roundCurrency(timeSummary.allocatedPayrollNetOutsideContracts),
    outsideModelAdjustmentsNet: roundCurrency(outsideModelAdjustmentsNet),
    grossMarginNet: roundCurrency(grossMarginNet),
    operatingResultNet: roundCurrency(operatingResultNet),
    bridgeDifferenceNet: roundCurrency(bridgeDifference),
  };
}

export function getProfitLossAvailablePeriods(dataset: MockDatasetName = "baseline"): string[] {
  return getAvailableMonths(dataset);
}
