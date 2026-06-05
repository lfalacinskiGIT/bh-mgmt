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

function buildIncompleteSourceRecordsDataset(source: SourceRecord[]): SourceRecord[] {
  return source.slice(0, Math.max(6, source.length - 3)).map((record, index) => ({
    ...record,
    netAmount: index % 5 === 0 ? Math.round(record.netAmount * 0.85) : record.netAmount,
  }));
}

export function getSourceRecords(dataset: MockDatasetName = "baseline"): SourceRecord[] {
  if (dataset === "incomplete") {
    return buildIncompleteSourceRecordsDataset(sourceRecordsByDataset.baseline);
  }

  return sourceRecordsByDataset[dataset] ?? sourceRecordsByDataset.baseline;
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
