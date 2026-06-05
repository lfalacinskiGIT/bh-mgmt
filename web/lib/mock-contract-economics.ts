import contractsEconomicsData from "@/data/mock/v1/contracts-economics.json";
import contractsEconomicsStressData from "@/data/mock/v1/contracts-economics.stress.json";

export type MockDatasetName = "baseline" | "stress" | "incomplete";

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

const contractsByDataset: Record<Exclude<MockDatasetName, "incomplete">, ContractEconomicsItem[]> = {
  baseline: contractsEconomicsData as ContractEconomicsItem[],
  stress: contractsEconomicsStressData as ContractEconomicsItem[],
};

const contractStatuses: ContractStatus[] = ["nowy", "negocjacje", "podpisany", "realizacja", "zakończony"];
const contractPriorities: ContractPriority[] = ["wysoki", "średni", "niski"];

function shiftIsoDate(dateIso: string, dayOffset: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function scaleAmount(amount: number, factor: number): number {
  return Math.max(0, Math.round(amount * factor));
}

function buildExpandedContractsDataset(source: ContractEconomicsItem[], targetCount: number): ContractEconomicsItem[] {
  if (source.length === 0) {
    return [];
  }

  if (source.length >= targetCount) {
    return source.slice(0, targetCount);
  }

  const expanded: ContractEconomicsItem[] = [];

  for (let index = 0; index < targetCount; index += 1) {
    const template = source[index % source.length];
    const cycle = Math.floor(index / source.length);
    const sequence = String(index + 1).padStart(3, "0");
    const valueFactor = 0.88 + ((index % 9) * 0.03);
    const revenueFactor = 0.84 + ((index % 7) * 0.04);
    const costFactor = 0.9 + ((index % 5) * 0.035);

    const valueContractNet = scaleAmount(template.valueContractNet, valueFactor);
    const revenueRecognizedNet = Math.min(
      valueContractNet,
      scaleAmount(template.revenueRecognizedNet, revenueFactor),
    );

    expanded.push({
      ...template,
      id: `${template.id}-${sequence}`,
      number: `BH/KON/2026/${sequence}`,
      clientName: `${template.clientName} ${cycle > 0 ? `/${cycle + 1}` : ""}`.trim(),
      objectName: `${template.objectName} ${cycle > 0 ? `etap ${cycle + 1}` : `pakiet ${index + 1}`}`,
      valueContractNet,
      revenueRecognizedNet,
      status: contractStatuses[index % contractStatuses.length],
      priority: contractPriorities[index % contractPriorities.length],
      startDate: shiftIsoDate(template.startDate, cycle * 17 + (index % 6) * 3),
      endDate: shiftIsoDate(template.endDate, cycle * 17 + (index % 6) * 3),
      costBreakdown: {
        warehouseDirectNet: scaleAmount(template.costBreakdown.warehouseDirectNet, costFactor),
        laborNet: scaleAmount(template.costBreakdown.laborNet, costFactor),
        productionNet: scaleAmount(template.costBreakdown.productionNet, costFactor),
        crewFleetToolsNet: scaleAmount(template.costBreakdown.crewFleetToolsNet, costFactor),
        salesCommissionNet: scaleAmount(template.costBreakdown.salesCommissionNet, costFactor),
      },
      auditTrail: template.auditTrail.map((entry, trailIndex) => ({
        ...entry,
        id: `${template.id}-a${sequence}-${trailIndex + 1}`,
        amountNet: scaleAmount(entry.amountNet, 0.9 + ((index + trailIndex) % 6) * 0.04),
        recordedAt: shiftIsoDate(entry.recordedAt, cycle * 11 + trailIndex),
      })),
    });
  }

  return expanded;
}

const expandedContractsByDataset: Record<Exclude<MockDatasetName, "incomplete">, ContractEconomicsItem[]> = {
  baseline: buildExpandedContractsDataset(contractsByDataset.baseline, 50),
  stress: buildExpandedContractsDataset(contractsByDataset.stress, 50),
};

function buildIncompleteContractsDataset(source: ContractEconomicsItem[]): ContractEconomicsItem[] {
  return source.slice(0, 3).map((contract, index) => ({
    ...contract,
    revenueRecognizedNet: Math.round(contract.revenueRecognizedNet * (index === 0 ? 0.82 : 0.7)),
    costBreakdown: {
      ...contract.costBreakdown,
      productionNet: index === 2 ? 0 : contract.costBreakdown.productionNet,
      salesCommissionNet: index === 1 ? 0 : contract.costBreakdown.salesCommissionNet,
    },
    auditTrail: contract.auditTrail.slice(0, 1),
  }));
}

export function getContractEconomics(dataset: MockDatasetName = "baseline"): ContractEconomicsItem[] {
  if (dataset === "incomplete") {
    return buildIncompleteContractsDataset(expandedContractsByDataset.baseline);
  }

  return expandedContractsByDataset[dataset] ?? expandedContractsByDataset.baseline;
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
