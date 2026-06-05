import payrollData from "@/data/mock/v1/payroll.json";
import timeEntriesData from "@/data/mock/v1/time-entries.json";
import { getContractEconomics, type MockDatasetName } from "@/lib/mock-contract-economics";
import { getTeamMemberNameMap } from "@/lib/mock-team";

export type TimeEntryCategory = "project" | "nonProject" | "absence";

export interface MockTimeEntry {
  id: string;
  contractId: string | null;
  employeeId: string;
  workDate: string;
  hours: number;
  category: TimeEntryCategory;
}

export interface MockPayrollEntry {
  id: string;
  employeeId: string;
  month: string;
  grossCost: number;
  netCost: number;
}

export interface PayrollAllocationByContract {
  contractId: string;
  contractNumber: string;
  lineOfBusiness: string;
  projectHours: number;
  allocatedPayrollNet: number;
  allocatedPayrollGross: number;
}

export interface PayrollAllocationByEmployee {
  employeeId: string;
  employeeName: string;
  payrollNet: number;
  payrollGross: number;
  projectHours: number;
  nonProjectHours: number;
  absenceHours: number;
  allocatedToContractsNet: number;
  outsideContractsNet: number;
}

export interface TimeTrackingSummary {
  month: string;
  totalHours: number;
  projectHours: number;
  nonProjectHours: number;
  absenceHours: number;
  activeEmployees: number;
  payrollNetTotal: number;
  payrollGrossTotal: number;
  allocatedPayrollNetToContracts: number;
  allocatedPayrollNetOutsideContracts: number;
  allocationCoveragePct: number;
  contractAllocations: PayrollAllocationByContract[];
  employeeAllocations: PayrollAllocationByEmployee[];
}

const baseTimeEntries = (timeEntriesData as Array<{
  id: string;
  contractId: string;
  employeeId: string;
  workDate: string;
  hours: number;
  category: string;
}>).map((entry) => ({
  ...entry,
  contractId: entry.contractId || null,
  category: normalizeCategory(entry.category),
}));

const basePayrollEntries = payrollData as MockPayrollEntry[];

function normalizeCategory(value: string): TimeEntryCategory {
  if (value === "absence") {
    return "absence";
  }

  if (value === "nonProject") {
    return "nonProject";
  }

  return "project";
}

function monthFromDate(dateValue: string): string {
  return dateValue.slice(0, 7);
}

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function resolveContractId(rawContractId: string, contractById: Map<string, ReturnType<typeof getContractEconomics>[number]>): string | null {
  if (contractById.has(rawContractId)) {
    return rawContractId;
  }

  const prefixed = `${rawContractId}-`;
  for (const contractId of contractById.keys()) {
    if (contractId.startsWith(prefixed)) {
      return contractId;
    }
  }

  return null;
}

function buildStressEntries(source: MockTimeEntry[]): MockTimeEntry[] {
  return [
    ...source,
    {
      id: "te-3",
      contractId: null,
      employeeId: "jan-kowalski",
      workDate: "2026-06-10",
      hours: 4,
      category: "nonProject",
    },
    {
      id: "te-4",
      contractId: null,
      employeeId: "anna-maj",
      workDate: "2026-06-11",
      hours: 2,
      category: "absence",
    },
    {
      id: "te-5",
      contractId: "c1",
      employeeId: "anna-maj",
      workDate: "2026-06-13",
      hours: 3,
      category: "project",
    },
  ];
}

function buildStressPayroll(source: MockPayrollEntry[]): MockPayrollEntry[] {
  return source.map((entry) => ({
    ...entry,
    netCost: Math.round(entry.netCost * 1.08),
    grossCost: Math.round(entry.grossCost * 1.08),
  }));
}

function buildIncompleteEntries(source: MockTimeEntry[]): MockTimeEntry[] {
  return source.slice(0, 1);
}

function buildIncompletePayroll(source: MockPayrollEntry[]): MockPayrollEntry[] {
  return source.slice(0, 1);
}

export function getTimeEntries(dataset: MockDatasetName = "baseline"): MockTimeEntry[] {
  if (dataset === "stress") {
    return buildStressEntries(baseTimeEntries);
  }

  if (dataset === "incomplete") {
    return buildIncompleteEntries(baseTimeEntries);
  }

  return baseTimeEntries;
}

export function getPayrollEntries(dataset: MockDatasetName = "baseline"): MockPayrollEntry[] {
  if (dataset === "stress") {
    return buildStressPayroll(basePayrollEntries);
  }

  if (dataset === "incomplete") {
    return buildIncompletePayroll(basePayrollEntries);
  }

  return basePayrollEntries;
}

export function getAvailableTimeMonths(dataset: MockDatasetName = "baseline"): string[] {
  const monthKeys = new Set<string>();

  for (const entry of getTimeEntries(dataset)) {
    monthKeys.add(monthFromDate(entry.workDate));
  }

  for (const payroll of getPayrollEntries(dataset)) {
    monthKeys.add(payroll.month);
  }

  return Array.from(monthKeys).sort((left, right) => right.localeCompare(left));
}

export function getTimeTrackingSummary(dataset: MockDatasetName = "baseline", month?: string): TimeTrackingSummary {
  const contracts = getContractEconomics(dataset);
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const teamNameById = getTeamMemberNameMap(dataset);

  const selectedMonth = month ?? getAvailableTimeMonths(dataset)[0] ?? "";

  const timeEntries = getTimeEntries(dataset).filter((entry) =>
    selectedMonth ? monthFromDate(entry.workDate) === selectedMonth : true,
  );

  const payrollEntries = getPayrollEntries(dataset).filter((entry) =>
    selectedMonth ? entry.month === selectedMonth : true,
  );

  const contractAllocationsMap = new Map<string, PayrollAllocationByContract>();
  const employeeAllocations: PayrollAllocationByEmployee[] = [];

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const projectHours = timeEntries
    .filter((entry) => entry.category === "project")
    .reduce((sum, entry) => sum + entry.hours, 0);
  const nonProjectHours = timeEntries
    .filter((entry) => entry.category === "nonProject")
    .reduce((sum, entry) => sum + entry.hours, 0);
  const absenceHours = timeEntries
    .filter((entry) => entry.category === "absence")
    .reduce((sum, entry) => sum + entry.hours, 0);

  for (const payroll of payrollEntries) {
    const employeeTime = timeEntries.filter((entry) => entry.employeeId === payroll.employeeId);
    const employeeProjectEntries = employeeTime.filter((entry) => entry.category === "project" && !!entry.contractId);

    const employeeProjectHours = employeeProjectEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const employeeNonProjectHours = employeeTime
      .filter((entry) => entry.category === "nonProject")
      .reduce((sum, entry) => sum + entry.hours, 0);
    const employeeAbsenceHours = employeeTime
      .filter((entry) => entry.category === "absence")
      .reduce((sum, entry) => sum + entry.hours, 0);

    let allocatedToContractsNet = 0;
    let outsideContractsNet = payroll.netCost;

    if (employeeProjectHours > 0) {
      outsideContractsNet = 0;

      for (const entry of employeeProjectEntries) {
        if (!entry.contractId) {
          continue;
        }

        const share = entry.hours / employeeProjectHours;
        const allocatedNet = roundCurrency(payroll.netCost * share);
        const allocatedGross = roundCurrency(payroll.grossCost * share);
        const resolvedContractId = resolveContractId(entry.contractId, contractById);
        const contract = resolvedContractId ? contractById.get(resolvedContractId) : null;

        if (!contract) {
          outsideContractsNet += allocatedNet;
          continue;
        }

        allocatedToContractsNet += allocatedNet;

        const current = contractAllocationsMap.get(contract.id) ?? {
          contractId: contract.id,
          contractNumber: contract.number,
          lineOfBusiness: contract.lineOfBusiness,
          projectHours: 0,
          allocatedPayrollNet: 0,
          allocatedPayrollGross: 0,
        };

        current.projectHours += entry.hours;
        current.allocatedPayrollNet = roundCurrency(current.allocatedPayrollNet + allocatedNet);
        current.allocatedPayrollGross = roundCurrency(current.allocatedPayrollGross + allocatedGross);

        contractAllocationsMap.set(contract.id, current);
      }

      outsideContractsNet = roundCurrency(Math.max(0, payroll.netCost - allocatedToContractsNet));
    }

    employeeAllocations.push({
      employeeId: payroll.employeeId,
      employeeName: teamNameById.get(payroll.employeeId) ?? payroll.employeeId,
      payrollNet: payroll.netCost,
      payrollGross: payroll.grossCost,
      projectHours: employeeProjectHours,
      nonProjectHours: employeeNonProjectHours,
      absenceHours: employeeAbsenceHours,
      allocatedToContractsNet: roundCurrency(allocatedToContractsNet),
      outsideContractsNet: roundCurrency(outsideContractsNet),
    });
  }

  const contractAllocations = Array.from(contractAllocationsMap.values()).sort(
    (left, right) => right.allocatedPayrollNet - left.allocatedPayrollNet,
  );

  const payrollNetTotal = payrollEntries.reduce((sum, entry) => sum + entry.netCost, 0);
  const payrollGrossTotal = payrollEntries.reduce((sum, entry) => sum + entry.grossCost, 0);
  const allocatedPayrollNetToContracts = contractAllocations.reduce((sum, entry) => sum + entry.allocatedPayrollNet, 0);
  const allocatedPayrollNetOutsideContracts = employeeAllocations.reduce((sum, entry) => sum + entry.outsideContractsNet, 0);

  const allocationCoveragePct = payrollNetTotal > 0
    ? roundCurrency((allocatedPayrollNetToContracts / payrollNetTotal) * 100)
    : 0;

  return {
    month: selectedMonth,
    totalHours: roundCurrency(totalHours),
    projectHours: roundCurrency(projectHours),
    nonProjectHours: roundCurrency(nonProjectHours),
    absenceHours: roundCurrency(absenceHours),
    activeEmployees: new Set(timeEntries.map((entry) => entry.employeeId)).size,
    payrollNetTotal: roundCurrency(payrollNetTotal),
    payrollGrossTotal: roundCurrency(payrollGrossTotal),
    allocatedPayrollNetToContracts: roundCurrency(allocatedPayrollNetToContracts),
    allocatedPayrollNetOutsideContracts: roundCurrency(allocatedPayrollNetOutsideContracts),
    allocationCoveragePct,
    contractAllocations,
    employeeAllocations,
  };
}
