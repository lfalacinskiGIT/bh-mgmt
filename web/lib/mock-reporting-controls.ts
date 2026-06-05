import {
  getContractEconomics,
  getContractTotalCost,
  type ContractEconomicsItem,
  type MockDatasetName,
} from "@/lib/mock-contract-economics";
import outsideContractPositionsData from "@/data/mock/v1/outside-contract-positions.json";
import outsideContractPositionsStressData from "@/data/mock/v1/outside-contract-positions.stress.json";
import sourceCostEntriesData from "@/data/mock/v1/source-cost-entries.json";
import sourceCostEntriesStressData from "@/data/mock/v1/source-cost-entries.stress.json";

export interface OutsideContractPosition {
  id: string;
  label: string;
  amountNet: number;
  category: "general" | "technical" | "unallocated";
}

export interface SourceCostEntry {
  id: string;
  month: string;
  source: "warehouse" | "payroll" | "production" | "crew" | "commission" | "kws";
  contractId?: string;
  referenceKey: string;
  amountNet: number;
}

export interface KwsRiskItem {
  id: string;
  severity: "high" | "medium";
  ruleCode: "KWS-REF-01" | "KWS-MISSING-02" | "KWS-OUTSIDE-03" | "KWS-SPIKE-04";
  note: string;
  referenceKey: string;
  month: string;
  contractId?: string;
  warehouseAmountNet: number;
  kwsAmountNet: number;
  amountNet: number;
  amountAtRiskNet: number;
}

export interface KwsControlRule {
  id: string;
  name: string;
  description: string;
  status: "ok" | "warning" | "critical";
  details: string;
}

export interface ReconciliationBridgeItem {
  id: string;
  label: string;
  direction: "plus" | "minus" | "total";
  amountNet: number;
  note: string;
}

export interface ContractReconciliationSnapshot {
  contractCostsNet: number;
  nonContractCostsNet: number;
  totalModelCostsNet: number;
  sourceLedgerCostsNet: number;
  kwsRiskAmountNet: number;
  unexplainedDifferenceNet: number;
}

const outsideContractPositionsByDataset: Record<MockDatasetName, OutsideContractPosition[]> = {
  baseline: outsideContractPositionsData as OutsideContractPosition[],
  stress: outsideContractPositionsStressData as OutsideContractPosition[],
};

const sourceCostEntriesByDataset: Record<MockDatasetName, SourceCostEntry[]> = {
  baseline: sourceCostEntriesData as SourceCostEntry[],
  stress: sourceCostEntriesStressData as SourceCostEntry[],
};

export function getOutsideContractPositions(dataset: MockDatasetName = "baseline"): OutsideContractPosition[] {
  return outsideContractPositionsByDataset[dataset] ?? outsideContractPositionsByDataset.baseline;
}

export function getSourceCostEntries(dataset: MockDatasetName = "baseline"): SourceCostEntry[] {
  return sourceCostEntriesByDataset[dataset] ?? sourceCostEntriesByDataset.baseline;
}

export const mockOutsideContractPositions: OutsideContractPosition[] = getOutsideContractPositions("baseline");

export const mockSourceCostEntries: SourceCostEntry[] = getSourceCostEntries("baseline");

export function detectKwsDuplicateRisks(entries: SourceCostEntry[]): KwsRiskItem[] {
  const grouped = new Map<string, SourceCostEntry[]>();

  for (const entry of entries) {
    const key = `${entry.month}:${entry.referenceKey}:${entry.contractId ?? "NO_CONTRACT"}`;
    const existing = grouped.get(key) ?? [];
    existing.push(entry);
    grouped.set(key, existing);
  }

  const risks: KwsRiskItem[] = [];

  for (const bucket of grouped.values()) {
    const kwsEntries = bucket.filter((entry) => entry.source === "kws");
    const nonKwsEntries = bucket.filter((entry) => entry.source !== "kws");

    if (!kwsEntries.length || !nonKwsEntries.length) {
      if (kwsEntries.length && !nonKwsEntries.length) {
        const kwsAmountNet = kwsEntries.reduce((sum, entry) => sum + entry.amountNet, 0);

        risks.push({
          id: `missing-${bucket[0].month}-${bucket[0].referenceKey}-${bucket[0].contractId ?? "no-contract"}`,
          severity: kwsAmountNet >= 50000 ? "high" : "medium",
          ruleCode: "KWS-MISSING-02",
          note: "Wpis KWS nie ma odpowiadającego zapisu kosztowego poza KWS dla tej samej referencji.",
          referenceKey: bucket[0].referenceKey,
          month: bucket[0].month,
          contractId: bucket[0].contractId,
          warehouseAmountNet: 0,
          kwsAmountNet,
          amountNet: kwsAmountNet,
          amountAtRiskNet: kwsAmountNet,
        });
      }
      continue;
    }

    const kwsAmountNet = kwsEntries.reduce((sum, entry) => sum + entry.amountNet, 0);
    const warehouseAmountNet = nonKwsEntries.reduce((sum, entry) => sum + entry.amountNet, 0);

    risks.push({
      id: `${bucket[0].month}-${bucket[0].referenceKey}-${bucket[0].contractId ?? "no-contract"}`,
      severity: Math.min(kwsAmountNet, warehouseAmountNet) >= 100000 ? "high" : "medium",
      ruleCode: "KWS-REF-01",
      note: "Ta sama referencja występuje w KWS i innym źródle kosztu dla tego samego miesiąca.",
      referenceKey: bucket[0].referenceKey,
      month: bucket[0].month,
      contractId: bucket[0].contractId,
      warehouseAmountNet,
      kwsAmountNet,
      amountNet: kwsAmountNet,
      amountAtRiskNet: Math.min(kwsAmountNet, warehouseAmountNet),
    });
  }

  const orphanKwsEntries = entries.filter((entry) => entry.source === "kws" && !entry.contractId);
  for (const entry of orphanKwsEntries) {
    risks.push({
      id: `outside-${entry.id}`,
      severity: entry.amountNet >= 30000 ? "high" : "medium",
      ruleCode: "KWS-OUTSIDE-03",
      note: "Wpis KWS poza kontraktami wymaga jawnego uzasadnienia biznesowego.",
      referenceKey: entry.referenceKey,
      month: entry.month,
      warehouseAmountNet: 0,
      kwsAmountNet: entry.amountNet,
      amountNet: entry.amountNet,
      amountAtRiskNet: entry.amountNet,
    });
  }

  const kwsByMonth = new Map<string, number>();
  for (const entry of entries.filter((item) => item.source === "kws")) {
    kwsByMonth.set(entry.month, (kwsByMonth.get(entry.month) ?? 0) + entry.amountNet);
  }

  for (const [month, amount] of kwsByMonth.entries()) {
    const previousMonth = month.endsWith("-01")
      ? `${Number(month.slice(0, 4)) - 1}-12`
      : `${month.slice(0, 4)}-${String(Number(month.slice(5, 7)) - 1).padStart(2, "0")}`;
    const previousAmount = kwsByMonth.get(previousMonth) ?? 0;
    const delta = amount - previousAmount;

    if (previousAmount > 0 && delta / previousAmount > 0.5) {
      risks.push({
        id: `spike-${month}`,
        severity: "medium",
        ruleCode: "KWS-SPIKE-04",
        note: "Wartość KWS wzrosła m/m o więcej niż 50%.",
        referenceKey: `KWS-MONTH-${month}`,
        month,
        warehouseAmountNet: previousAmount,
        kwsAmountNet: amount,
        amountNet: amount,
        amountAtRiskNet: delta,
      });
    }
  }

  return risks.sort((left, right) => right.amountAtRiskNet - left.amountAtRiskNet);
}

export function buildKwsControlRules(entries: SourceCostEntry[]): KwsControlRule[] {
  const risks = detectKwsDuplicateRisks(entries);
  const orphanKws = entries.filter((entry) => entry.source === "kws" && !entry.contractId);
  const missingCounterparts = risks.filter((risk) => risk.ruleCode === "KWS-MISSING-02").length;
  const spikeRisks = risks.filter((risk) => risk.ruleCode === "KWS-SPIKE-04").length;

  return [
    {
      id: "kws-dup-ref",
      name: "KWS vs magazyny wirtualne (anty-dublety)",
      description: "Ta sama referencja kosztowa nie może być jednocześnie podstawą kosztu kontraktu i korekty KWS.",
      status: risks.length ? "critical" : "ok",
      details: risks.length
        ? `Wykryto ${risks.length} przypadki ryzyka podwójnego ujęcia.`
        : "Brak ryzyka podwójnego ujęcia w badanym okresie.",
    },
    {
      id: "kws-contract-link",
      name: "Powiązanie KWS z kontraktem",
      description: "Każde księgowanie KWS powinno wskazywać kontrakt lub jawnie trafiać poza kontrakty.",
      status: orphanKws.length ? "warning" : "ok",
      details: orphanKws.length
        ? `${orphanKws.length} wpisy KWS bez przypięcia do kontraktu.`
        : "Wszystkie wpisy KWS mają przypisanie lub zostały oznaczone jako poza kontraktami.",
    },
    {
      id: "kws-missing-counterpart",
      name: "Kompletność referencji KWS",
      description: "Wpis KWS powinien mieć źródłowy koszt bazowy lub opis korekty technicznej.",
      status: missingCounterparts ? "critical" : "ok",
      details: missingCounterparts
        ? `${missingCounterparts} wpisów KWS bez kosztu bazowego.`
        : "Każdy wpis KWS ma koszt bazowy albo nie występuje w okresie.",
    },
    {
      id: "kws-monthly-spike",
      name: "Skok m/m wartości KWS",
      description: "Wzrost KWS miesiąc do miesiąca > 50% wymaga potwierdzenia controllingowego.",
      status: spikeRisks ? "warning" : "ok",
      details: spikeRisks
        ? `${spikeRisks} okresy ze skokiem m/m powyżej progu.`
        : "Brak skoków m/m powyżej progu kontrolnego.",
    },
  ];
}

export function getContractReconciliationSnapshot(
  entries: SourceCostEntry[],
  contracts: ContractEconomicsItem[] = getContractEconomics("baseline"),
  outsidePositions: OutsideContractPosition[] = getOutsideContractPositions("baseline"),
): ContractReconciliationSnapshot {
  const contractCostsNet = contracts.reduce((sum, contract) => sum + getContractTotalCost(contract), 0);
  const nonContractCostsNet = outsidePositions.reduce((sum, item) => sum + item.amountNet, 0);
  const totalModelCostsNet = contractCostsNet + nonContractCostsNet;
  const sourceLedgerCostsNet = entries.reduce((sum, entry) => sum + entry.amountNet, 0) + 1647000;
  const kwsRiskAmountNet = detectKwsDuplicateRisks(entries).reduce((sum, item) => sum + item.amountAtRiskNet, 0);

  return {
    contractCostsNet,
    nonContractCostsNet,
    totalModelCostsNet,
    sourceLedgerCostsNet,
    kwsRiskAmountNet,
    unexplainedDifferenceNet: sourceLedgerCostsNet - totalModelCostsNet,
  };
}

export function getReconciliationBridge(
  entries: SourceCostEntry[],
  contracts: ContractEconomicsItem[] = getContractEconomics("baseline"),
  outsidePositions: OutsideContractPosition[] = getOutsideContractPositions("baseline"),
): ReconciliationBridgeItem[] {
  const snapshot = getContractReconciliationSnapshot(entries, contracts, outsidePositions);

  return [
    {
      id: "bridge-contract-costs",
      label: "Koszty kontraktowe (model)",
      direction: "plus",
      amountNet: snapshot.contractCostsNet,
      note: "Koszty z kart kontraktów (magazyn, ludzie, produkcja, ekipy, prowizje).",
    },
    {
      id: "bridge-outside-costs",
      label: "Koszty poza kontraktami",
      direction: "plus",
      amountNet: snapshot.nonContractCostsNet,
      note: "Pozycje ogólne, techniczne i niealokowane.",
    },
    {
      id: "bridge-kws-risk",
      label: "Korekta ryzyka KWS (anty-dublety)",
      direction: "minus",
      amountNet: snapshot.kwsRiskAmountNet,
      note: "Odjęcie kosztu at-risk dla potencjalnie podwójnie ujętych pozycji.",
    },
    {
      id: "bridge-source-ledger",
      label: "Koszty źródłowe po korekcie",
      direction: "total",
      amountNet: snapshot.sourceLedgerCostsNet - snapshot.kwsRiskAmountNet,
      note: "Wartość odniesienia do uzgodnienia po stronie źródeł.",
    },
    {
      id: "bridge-difference",
      label: "Różnica niewyjaśniona",
      direction: "total",
      amountNet: snapshot.unexplainedDifferenceNet + snapshot.kwsRiskAmountNet,
      note: "Pozycja do dalszego wyjaśnienia operacyjnego/księgowego.",
    },
  ];
}
