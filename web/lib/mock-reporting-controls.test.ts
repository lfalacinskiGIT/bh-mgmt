import { describe, expect, it } from "vitest";
import {
  buildKwsControlRules,
  detectKwsDuplicateRisks,
  getReconciliationBridge,
  getContractReconciliationSnapshot,
  type SourceCostEntry,
} from "@/lib/mock-reporting-controls";

describe("mock reporting controls", () => {
  it("detects duplicate and missing KWS risks", () => {
    const entries: SourceCostEntry[] = [
      {
        id: "a1",
        month: "2026-06",
        source: "warehouse",
        contractId: "c1",
        referenceKey: "REF-001",
        amountNet: 10000,
      },
      {
        id: "a2",
        month: "2026-06",
        source: "kws",
        contractId: "c1",
        referenceKey: "REF-001",
        amountNet: 10000,
      },
      {
        id: "a3",
        month: "2026-06",
        source: "kws",
        contractId: "c2",
        referenceKey: "REF-MISS",
        amountNet: 12000,
      },
    ];

    const risks = detectKwsDuplicateRisks(entries);

    expect(risks.some((risk) => risk.ruleCode === "KWS-REF-01")).toBe(true);
    expect(risks.some((risk) => risk.ruleCode === "KWS-MISSING-02")).toBe(true);
  });

  it("builds control rules with critical status when risks exist", () => {
    const entries: SourceCostEntry[] = [
      {
        id: "b1",
        month: "2026-06",
        source: "warehouse",
        contractId: "c1",
        referenceKey: "REF-100",
        amountNet: 5000,
      },
      {
        id: "b2",
        month: "2026-06",
        source: "kws",
        contractId: "c1",
        referenceKey: "REF-100",
        amountNet: 5000,
      },
    ];

    const rules = buildKwsControlRules(entries);
    const duplicateRule = rules.find((rule) => rule.id === "kws-dup-ref");

    expect(duplicateRule).toBeDefined();
    expect(duplicateRule?.status).toBe("critical");
  });

  it("returns coherent reconciliation bridge totals", () => {
    const entries: SourceCostEntry[] = [
      {
        id: "c1",
        month: "2026-06",
        source: "warehouse",
        contractId: "c1",
        referenceKey: "REF-900",
        amountNet: 20000,
      },
      {
        id: "c2",
        month: "2026-06",
        source: "kws",
        contractId: "c1",
        referenceKey: "REF-900",
        amountNet: 20000,
      },
    ];

    const snapshot = getContractReconciliationSnapshot(entries);
    const bridge = getReconciliationBridge(entries);

    const sourceAfterCorrection = bridge.find((item) => item.id === "bridge-source-ledger");

    expect(sourceAfterCorrection).toBeDefined();
    expect(sourceAfterCorrection?.amountNet).toBe(snapshot.sourceLedgerCostsNet - snapshot.kwsRiskAmountNet);
  });
});
