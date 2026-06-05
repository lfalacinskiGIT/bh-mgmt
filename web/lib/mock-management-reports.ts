import {
  getContractEconomics,
  getContractTotalCost,
  type ContractEconomicsItem,
  type MockDatasetName,
} from "@/lib/mock-contract-economics";
import sourceRecordsData from "@/data/mock/v1/source-records.json";
import sourceRecordsStressData from "@/data/mock/v1/source-records.stress.json";

export type SourceRecordType = "revenue" | "cost";

export type SourceRecordOrigin = "optima-source" | "virtual-warehouse" | "kws" | "payroll" | "managerial-sheet";

export interface SourceRecord {
  id: string;
  postedAt: string;
  type: SourceRecordType;
  origin: SourceRecordOrigin;
  contractId: string | null;
  netAmount: number;
  referenceKey: string;
  description: string;
}

export interface LineOfBusinessSummary {
  lineOfBusiness: string;
  contractsCount: number;
  contractValueNet: number;
  recognizedRevenueNet: number;
  totalCostNet: number;
  marginReserveNet: number;
}

export interface KwsDuplicateRisk {
  id: string;
  severity: "high" | "medium";
  ruleCode: "KWS-REF-01" | "KWS-AMOUNT-02";
  contractId: string | null;
  referenceKey: string;
  kwsRecordId: string;
  candidateRecordId: string;
  amountNet: number;
  note: string;
}

const sourceRecordsByDataset: Record<Exclude<MockDatasetName, "incomplete">, SourceRecord[]> = {
  baseline: sourceRecordsData as SourceRecord[],
  stress: sourceRecordsStressData as SourceRecord[],
};

const trendSeedMonthsTarget = 8;

function getMonthKey(postedAt: string): string {
  return postedAt.slice(0, 7);
}

function shiftMonth(month: string, deltaMonths: number): string {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    return month;
  }

  const date = new Date(Date.UTC(year, monthIndex, 1));
  date.setUTCMonth(date.getUTCMonth() + deltaMonths);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildRecentMonthKeys(lastMonth: string, count: number): string[] {
  const keys: string[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(shiftMonth(lastMonth, -offset));
  }

  return keys;
}

function monthToPostedAt(month: string): string {
  return `${month}-28`;
}

function sumByTypeForContract(records: SourceRecord[], contractId: string, type: SourceRecordType): number {
  return records
    .filter((record) => record.contractId === contractId && record.type === type)
    .reduce((sum, record) => sum + record.netAmount, 0);
}

function buildContractTrendSeedRecords(dataset: Exclude<MockDatasetName, "incomplete">, baseRecords: SourceRecord[]): SourceRecord[] {
  const contracts = getContractEconomics(dataset);
  const contractsWithRecords = new Set(baseRecords.filter((record) => record.contractId).map((record) => record.contractId));
  const lastMonth = baseRecords.length > 0 ? getMonthKey(baseRecords.at(-1)?.postedAt ?? "2026-06-30") : "2026-06";
  const targetMonths = buildRecentMonthKeys(lastMonth, trendSeedMonthsTarget);
  const distribution = [0.08, 0.09, 0.1, 0.11, 0.12, 0.14, 0.16, 0.2];
  const seedRecords: SourceRecord[] = [];

  contracts.forEach((contract, index) => {
    const existingContractRecords = baseRecords.filter((record) => record.contractId === contract.id);
    const existingMonths = new Set(existingContractRecords.map((record) => getMonthKey(record.postedAt)));

    const missingMonths = targetMonths.filter((month) => !existingMonths.has(month));

    if (contractsWithRecords.has(contract.id) && missingMonths.length === 0) {
      return;
    }

    const totalCost = getContractTotalCost(contract);
    const existingRevenue = sumByTypeForContract(baseRecords, contract.id, "revenue");
    const existingCost = sumByTypeForContract(baseRecords, contract.id, "cost");
    const revenueLeft = Math.max(0, contract.revenueRecognizedNet - existingRevenue);
    const costLeft = Math.max(0, totalCost - existingCost);

    const distributionTotal = missingMonths.reduce((sum, month) => {
      const monthIndex = targetMonths.indexOf(month);
      return sum + (distribution[monthIndex] ?? 0.1);
    }, 0);

    missingMonths.forEach((month, monthSeedIndex) => {
      const monthIndex = targetMonths.indexOf(month);
      const weight = distribution[monthIndex] ?? 0.1;
      const baseShare = distributionTotal > 0 ? weight / distributionTotal : 1 / Math.max(1, missingMonths.length);

      const revenueNet = Math.max(0, Math.round(revenueLeft * baseShare));
      const costNet = Math.max(0, Math.round(costLeft * baseShare));

      seedRecords.push(
        {
          id: `seed-${dataset}-${contract.id}-r-${month}`,
          postedAt: monthToPostedAt(month),
          type: "revenue",
          origin: "optima-source",
          contractId: contract.id,
          netAmount: revenueNet,
          referenceKey: `SEED-REV-${contract.id}-${month}`,
          description: `Seed przychodu dla ${contract.number}`,
        },
        {
          id: `seed-${dataset}-${contract.id}-c-${month}`,
          postedAt: monthToPostedAt(month),
          type: "cost",
          origin: monthSeedIndex % 3 === 0 ? "managerial-sheet" : index % 2 === 0 ? "virtual-warehouse" : "payroll",
          contractId: contract.id,
          netAmount: costNet,
          referenceKey: `SEED-COST-${contract.id}-${month}`,
          description: `Seed kosztu dla ${contract.number}`,
        },
      );
    });
  });

  return seedRecords;
}

function getSeededSourceRecords(dataset: Exclude<MockDatasetName, "incomplete">): SourceRecord[] {
  const baseRecords = sourceRecordsByDataset[dataset] ?? sourceRecordsByDataset.baseline;
  return [...baseRecords, ...buildContractTrendSeedRecords(dataset, baseRecords)];
}

function buildIncompleteSourceRecordsDataset(source: SourceRecord[]): SourceRecord[] {
  return source.slice(0, Math.max(6, source.length - 3)).map((record, index) => ({
    ...record,
    netAmount: index % 5 === 0 ? Math.round(record.netAmount * 0.85) : record.netAmount,
  }));
}

export function getSourceRecords(dataset: MockDatasetName = "baseline"): SourceRecord[] {
  if (dataset === "incomplete") {
    return buildIncompleteSourceRecordsDataset(getSeededSourceRecords("baseline"));
  }

  return getSeededSourceRecords(dataset);
}

export const mockSourceRecords: SourceRecord[] = getSourceRecords("baseline");

export function getLineOfBusinessSummary(
  contracts: ContractEconomicsItem[] = getContractEconomics("baseline"),
): LineOfBusinessSummary[] {
  const grouped = new Map<string, LineOfBusinessSummary>();

  for (const contract of contracts) {
    const previous = grouped.get(contract.lineOfBusiness) ?? {
      lineOfBusiness: contract.lineOfBusiness,
      contractsCount: 0,
      contractValueNet: 0,
      recognizedRevenueNet: 0,
      totalCostNet: 0,
      marginReserveNet: 0,
    };

    const totalCostNet = getContractTotalCost(contract);

    previous.contractsCount += 1;
    previous.contractValueNet += contract.valueContractNet;
    previous.recognizedRevenueNet += contract.revenueRecognizedNet;
    previous.totalCostNet += totalCostNet;
    previous.marginReserveNet += contract.valueContractNet - totalCostNet;

    grouped.set(contract.lineOfBusiness, previous);
  }

  return Array.from(grouped.values()).sort((left, right) => right.contractValueNet - left.contractValueNet);
}

export function getContractEconomicsTotals(contracts: ContractEconomicsItem[] = getContractEconomics("baseline")) {
  const contractValueNet = contracts.reduce((sum, contract) => sum + contract.valueContractNet, 0);
  const recognizedRevenueNet = contracts.reduce((sum, contract) => sum + contract.revenueRecognizedNet, 0);
  const totalCostNet = contracts.reduce((sum, contract) => sum + getContractTotalCost(contract), 0);
  const marginReserveNet = contractValueNet - totalCostNet;

  return {
    contractsCount: contracts.length,
    contractValueNet,
    recognizedRevenueNet,
    totalCostNet,
    marginReserveNet,
  };
}

export function getSourceTotals(records: SourceRecord[] = mockSourceRecords) {
  const totalRevenueNet = records.filter((record) => record.type === "revenue").reduce((sum, record) => sum + record.netAmount, 0);
  const totalCostNet = records.filter((record) => record.type === "cost").reduce((sum, record) => sum + record.netAmount, 0);

  const outsideContractsRevenueNet = records
    .filter((record) => record.type === "revenue" && !record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const outsideContractsCostNet = records
    .filter((record) => record.type === "cost" && !record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  return {
    totalRevenueNet,
    totalCostNet,
    resultNet: totalRevenueNet - totalCostNet,
    outsideContractsRevenueNet,
    outsideContractsCostNet,
  };
}

export function getReconciliationSummary(
  contracts: ContractEconomicsItem[] = getContractEconomics("baseline"),
  records: SourceRecord[] = getSourceRecords("baseline"),
) {
  const contractTotals = getContractEconomicsTotals(contracts);
  const sourceTotals = getSourceTotals(records);

  const reconciledRevenueNet = contractTotals.recognizedRevenueNet + sourceTotals.outsideContractsRevenueNet;
  const reconciledCostNet = contractTotals.totalCostNet + sourceTotals.outsideContractsCostNet;

  return {
    companyRevenueNet: sourceTotals.totalRevenueNet,
    companyCostNet: sourceTotals.totalCostNet,
    companyResultNet: sourceTotals.resultNet,
    contractRevenueNet: contractTotals.recognizedRevenueNet,
    contractCostNet: contractTotals.totalCostNet,
    outsideContractsRevenueNet: sourceTotals.outsideContractsRevenueNet,
    outsideContractsCostNet: sourceTotals.outsideContractsCostNet,
    reconciledRevenueNet,
    reconciledCostNet,
    deltaRevenueNet: sourceTotals.totalRevenueNet - reconciledRevenueNet,
    deltaCostNet: sourceTotals.totalCostNet - reconciledCostNet,
  };
}

export function detectKwsDuplicateRisks(records: SourceRecord[] = mockSourceRecords): KwsDuplicateRisk[] {
  const costRecords = records.filter((record) => record.type === "cost");
  const kwsRecords = costRecords.filter((record) => record.origin === "kws");
  const nonKwsRecords = costRecords.filter((record) => record.origin !== "kws");
  const risks: KwsDuplicateRisk[] = [];

  for (const kwsRecord of kwsRecords) {
    const exactMatch = nonKwsRecords.find(
      (candidate) =>
        candidate.referenceKey === kwsRecord.referenceKey &&
        candidate.contractId === kwsRecord.contractId &&
        candidate.netAmount === kwsRecord.netAmount,
    );

    if (exactMatch) {
      risks.push({
        id: `risk-${kwsRecord.id}-${exactMatch.id}`,
        severity: "high",
        ruleCode: "KWS-REF-01",
        contractId: kwsRecord.contractId,
        referenceKey: kwsRecord.referenceKey,
        kwsRecordId: kwsRecord.id,
        candidateRecordId: exactMatch.id,
        amountNet: kwsRecord.netAmount,
        note: "Identyczny reference key i kwota pomiędzy KWS i innym źródłem kosztu.",
      });
      continue;
    }

    const fuzzyMatch = nonKwsRecords.find((candidate) => {
      if (candidate.contractId !== kwsRecord.contractId) {
        return false;
      }

      const amountDelta = Math.abs(candidate.netAmount - kwsRecord.netAmount);
      const dateDeltaDays = Math.abs(new Date(candidate.postedAt).getTime() - new Date(kwsRecord.postedAt).getTime()) / (1000 * 60 * 60 * 24);

      return amountDelta <= 500 && dateDeltaDays <= 5;
    });

    if (fuzzyMatch) {
      risks.push({
        id: `risk-${kwsRecord.id}-${fuzzyMatch.id}`,
        severity: "medium",
        ruleCode: "KWS-AMOUNT-02",
        contractId: kwsRecord.contractId,
        referenceKey: kwsRecord.referenceKey,
        kwsRecordId: kwsRecord.id,
        candidateRecordId: fuzzyMatch.id,
        amountNet: kwsRecord.netAmount,
        note: "Zbliżona kwota i data księgowania dla tego samego kontraktu.",
      });
    }
  }

  return risks;
}
