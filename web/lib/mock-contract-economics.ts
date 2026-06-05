import contractsEconomicsData from "@/data/mock/v1/contracts-economics.json";
import contractsEconomicsStressData from "@/data/mock/v1/contracts-economics.stress.json";

export type MockDatasetName = "baseline" | "stress";

export type ContractStatus = "nowy" | "negocjacje" | "podpisany" | "realizacja" | "zakończony";

export type ContractPriority = "wysoki" | "średni" | "niski";

export interface ContractCostBreakdown {
  warehouseDirectNet: number;
  laborNet: number;
  productionNet: number;
  crewFleetToolsNet: number;
  salesCommissionNet: number;
}

export interface ContractAuditTrailItem {
  id: string;
  source: string;
  description: string;
  amountNet: number;
  recordedAt: string;
}

export interface ContractEconomicsItem {
  id: string;
  number: string;
  clientName: string;
  objectName: string;
  city: string;
  lineOfBusiness: string;
  valueContractNet: number;
  revenueRecognizedNet: number;
  status: ContractStatus;
  priority: ContractPriority;
  startDate: string;
  endDate: string;
  costBreakdown: ContractCostBreakdown;
  auditTrail: ContractAuditTrailItem[];
}

const contractsByDataset: Record<MockDatasetName, ContractEconomicsItem[]> = {
  baseline: contractsEconomicsData as ContractEconomicsItem[],
  stress: contractsEconomicsStressData as ContractEconomicsItem[],
};

export function getContractEconomics(dataset: MockDatasetName = "baseline"): ContractEconomicsItem[] {
  return contractsByDataset[dataset] ?? contractsByDataset.baseline;
}

export const mockContractEconomics: ContractEconomicsItem[] = getContractEconomics("baseline");

export function getContractTotalCost(contract: ContractEconomicsItem): number {
  const { warehouseDirectNet, laborNet, productionNet, crewFleetToolsNet, salesCommissionNet } = contract.costBreakdown;
  return warehouseDirectNet + laborNet + productionNet + crewFleetToolsNet + salesCommissionNet;
}

export function getMarginReserve(contract: ContractEconomicsItem): number {
  return contract.valueContractNet - getContractTotalCost(contract);
}

export function getManagerialMargin(contract: ContractEconomicsItem): number {
  const totalCost = getContractTotalCost(contract);

  if (contract.revenueRecognizedNet <= 0) {
    return 0;
  }

  return (contract.revenueRecognizedNet - totalCost) / contract.revenueRecognizedNet;
}
