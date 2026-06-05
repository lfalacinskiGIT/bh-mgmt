import projectsData from "@/data/mock/v1/projects.json";
import projectsStressData from "@/data/mock/v1/projects.stress.json";
import type { MockDatasetName } from "@/lib/mock-contract-economics";

export type ProjectStatus = "nowy" | "negocjacje" | "realizacja" | "zakończony";
export type ProjectScheduleStatus = "on-track" | "at-risk" | "late" | "done";

export interface ProjectItem {
  id: string;
  name: string;
  contractNumber: string;
  manager: string;
  status: ProjectStatus;
  phase: string;
  budgetNet: number;
  spentNet: number;
  progress: number;
  scheduleStatus: ProjectScheduleStatus;
  dueDate: string;
  risk: string;
  nextAction: string;
}

const projectsByDataset: Record<MockDatasetName, ProjectItem[]> = {
  baseline: projectsData as ProjectItem[],
  stress: projectsStressData as ProjectItem[],
};

export function getProjects(dataset: MockDatasetName = "baseline") {
  return projectsByDataset[dataset] ?? projectsByDataset.baseline;
}

export function getProjectsSummary(dataset: MockDatasetName = "baseline") {
  const projects = getProjects(dataset);
  const totalBudget = projects.reduce((sum, project) => sum + project.budgetNet, 0);
  const totalSpent = projects.reduce((sum, project) => sum + project.spentNet, 0);
  const activeCount = projects.filter((project) => project.status === "realizacja").length;
  const riskCount = projects.filter((project) => project.scheduleStatus === "at-risk" || project.scheduleStatus === "late").length;
  const doneCount = projects.filter((project) => project.status === "zakończony").length;
  const progressAvg = projects.length > 0 ? projects.reduce((sum, project) => sum + project.progress, 0) / projects.length : 0;
  const mostAtRisk = [...projects].find((project) => project.scheduleStatus === "late" || project.scheduleStatus === "at-risk") ?? projects[0] ?? null;

  return {
    projects,
    totalBudget,
    totalSpent,
    activeCount,
    riskCount,
    doneCount,
    progressAvg,
    mostAtRisk,
  };
}