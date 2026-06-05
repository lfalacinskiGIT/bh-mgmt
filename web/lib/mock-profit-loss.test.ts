import { describe, expect, it } from "vitest";
import { getProfitLossSummary } from "@/lib/mock-profit-loss";

describe("mock profit and loss", () => {
  it("builds managerial P&L with bridge metrics", () => {
    const summary = getProfitLossSummary("baseline", "all");

    expect(summary.revenueTotalNet).toBeGreaterThan(0);
    expect(summary.costsContractNet).toBeGreaterThan(0);
    expect(summary.payrollAllocatedToContractsNet).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(summary.bridgeDifferenceNet)).toBe(true);
  });

  it("supports monthly period filters", () => {
    const monthly = getProfitLossSummary("baseline", "2026-06");
    const yearly = getProfitLossSummary("baseline", "ytd");

    expect(monthly.periodLabel).toBe("2026-06");
    expect(yearly.periodLabel.startsWith("YTD")).toBe(true);
  });
});
