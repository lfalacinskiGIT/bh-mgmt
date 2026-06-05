import { describe, expect, it } from "vitest";
import { getProjectsSummary } from "@/lib/mock-projects";
import { getSalesSummary } from "@/lib/mock-sales";
import { getTeamSummary } from "@/lib/mock-team";

describe("mock operation datasets", () => {
  it("switches sales data between baseline and stress datasets", () => {
    const baseline = getSalesSummary("baseline");
    const stress = getSalesSummary("stress");

    expect(baseline.opportunities).toHaveLength(5);
    expect(baseline.stageCounts.wygrana).toBe(1);
    expect(stress.opportunities).toHaveLength(6);
    expect(stress.pipelineValue).toBeGreaterThan(baseline.pipelineValue);
  });

  it("summarizes project risk and progress consistently", () => {
    const baseline = getProjectsSummary("baseline");
    const stress = getProjectsSummary("stress");

    expect(baseline.projects).toHaveLength(5);
    expect(baseline.activeCount).toBe(2);
    expect(baseline.riskCount).toBeGreaterThan(0);
    expect(stress.projects).toHaveLength(6);
    expect(stress.riskCount).toBeGreaterThanOrEqual(baseline.riskCount);
  });

  it("summarizes team workload by dataset", () => {
    const baseline = getTeamSummary("baseline");
    const stress = getTeamSummary("stress");

    expect(baseline.members).toHaveLength(10);
    expect(baseline.overloadedCount).toBe(1);
    expect(baseline.disciplines).toContain("IT");
    expect(stress.members).toHaveLength(6);
    expect(stress.overloadedCount).toBeGreaterThanOrEqual(baseline.overloadedCount);
  });
});