import { describe, expect, it } from "vitest";
import { getAvailableTimeMonths, getTimeTrackingSummary } from "@/lib/mock-time-tracking";

describe("mock time tracking allocations", () => {
  it("allocates payroll to contracts based on project hours in baseline dataset", () => {
    const summary = getTimeTrackingSummary("baseline", "2026-06");

    expect(summary.totalHours).toBe(14);
    expect(summary.projectHours).toBe(14);
    expect(summary.allocatedPayrollNetToContracts).toBe(21550);
    expect(summary.allocatedPayrollNetOutsideContracts).toBe(0);
    expect(summary.contractAllocations.length).toBeGreaterThan(0);
  });

  it("keeps non-project and absence hours visible in stress dataset", () => {
    const summary = getTimeTrackingSummary("stress", "2026-06");

    expect(summary.nonProjectHours).toBeGreaterThan(0);
    expect(summary.absenceHours).toBeGreaterThan(0);
    expect(summary.employeeAllocations.length).toBeGreaterThan(1);
  });

  it("returns available months sorted descending", () => {
    const months = getAvailableTimeMonths("baseline");

    expect(months.length).toBeGreaterThan(0);
    expect(months[0]).toMatch(/^\d{4}-\d{2}$/);
  });
});
