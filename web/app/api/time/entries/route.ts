import { NextRequest } from "next/server";
import { normalizeMockDataset } from "@/lib/mock-dataset";
import { getContractEconomics } from "@/lib/mock-contract-economics";
import { getTeamMemberNameMap } from "@/lib/mock-team";
import { getTimeEntries, type TimeEntryCategory } from "@/lib/mock-time-tracking";

function isTimeCategory(value: string | null): value is TimeEntryCategory {
  return value === "project" || value === "nonProject" || value === "absence";
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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const dataset = normalizeMockDataset(params.get("dataset"));
  const month = params.get("month")?.trim() ?? "";
  const contractId = params.get("contractId")?.trim() ?? "";
  const employeeId = params.get("employeeId")?.trim() ?? "";
  const categoryRaw = params.get("category");
  const category = isTimeCategory(categoryRaw) ? categoryRaw : "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(params.get("pageSize") ?? "30") || 30));

  const contracts = getContractEconomics(dataset);
  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const teamNameById = getTeamMemberNameMap(dataset);

  const filtered = getTimeEntries(dataset)
    .filter((entry) => (month ? entry.workDate.slice(0, 7) === month : true))
    .filter((entry) => (contractId ? entry.contractId === contractId : true))
    .filter((entry) => (employeeId ? entry.employeeId === employeeId : true))
    .filter((entry) => (category ? entry.category === category : true))
    .sort((left, right) => right.workDate.localeCompare(left.workDate));

  const offset = (page - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize).map((entry) => {
    const resolvedContractId = entry.contractId ? resolveContractId(entry.contractId, contractById) : null;
    const contract = resolvedContractId ? contractById.get(resolvedContractId) : null;

    return {
      ...entry,
      employeeName: teamNameById.get(entry.employeeId) ?? entry.employeeId,
      contractNumber: contract?.number ?? null,
      lineOfBusiness: contract?.lineOfBusiness ?? null,
      clientName: contract?.clientName ?? null,
    };
  });

  return Response.json({
    items,
    total: filtered.length,
    page,
    pageSize,
  });
}
