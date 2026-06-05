import teamData from "@/data/mock/v1/team.json";
import teamStressData from "@/data/mock/v1/team.stress.json";
import type { MockDatasetName } from "@/lib/mock-contract-economics";

export type TeamCapacityStatus = "ok" | "busy" | "overloaded";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  discipline: string;
  utilizationPct: number;
  capacityStatus: TeamCapacityStatus;
  currentProjects: string[];
  skills: string[];
  location: string;
  focus: string;
}

const teamByDataset: Record<Exclude<MockDatasetName, "incomplete">, TeamMember[]> = {
  baseline: teamData as TeamMember[],
  stress: teamStressData as TeamMember[],
};

function buildIncompleteTeamDataset(source: TeamMember[]): TeamMember[] {
  return source.slice(0, 4).map((member, index) => ({
    ...member,
    focus: `${member.focus} (brak części ewidencji godzin)`,
    utilizationPct: Math.min(100, member.utilizationPct + (index === 0 ? 0 : 5)),
  }));
}

export function getTeamMembers(dataset: MockDatasetName = "baseline") {
  if (dataset === "incomplete") {
    return buildIncompleteTeamDataset(teamByDataset.baseline);
  }

  return teamByDataset[dataset] ?? teamByDataset.baseline;
}

export function getTeamSummary(dataset: MockDatasetName = "baseline") {
  const members = getTeamMembers(dataset);
  const averageUtilization = members.length > 0 ? members.reduce((sum, member) => sum + member.utilizationPct, 0) / members.length : 0;
  const overloadedCount = members.filter((member) => member.capacityStatus === "overloaded").length;
  const busyCount = members.filter((member) => member.capacityStatus === "busy").length;
  const disciplines = Array.from(new Set(members.map((member) => member.discipline))).sort();

  return {
    members,
    averageUtilization,
    overloadedCount,
    busyCount,
    disciplines,
  };
}

export function getTeamMemberNameMap(dataset: MockDatasetName = "baseline") {
  return new Map(getTeamMembers(dataset).map((member) => [member.id, member.name]));
}