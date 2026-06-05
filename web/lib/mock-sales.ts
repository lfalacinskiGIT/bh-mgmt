import salesOpportunitiesData from "@/data/mock/v1/sales-opportunities.json";
import salesOpportunitiesStressData from "@/data/mock/v1/sales-opportunities.stress.json";
import type { MockDatasetName } from "@/lib/mock-contract-economics";

export type SalesStage = "lead" | "oferta" | "negocjacje" | "wygrana" | "utracona";

export interface SalesOpportunity {
  id: string;
  number: string;
  clientName: string;
  opportunityName: string;
  city: string;
  stage: SalesStage;
  valueNet: number;
  probability: number;
  owner: string;
  source: string;
  nextStep: string;
  expectedClose: string;
}

const opportunitiesByDataset: Record<Exclude<MockDatasetName, "incomplete">, SalesOpportunity[]> = {
  baseline: salesOpportunitiesData as SalesOpportunity[],
  stress: salesOpportunitiesStressData as SalesOpportunity[],
};

function buildIncompleteSalesDataset(source: SalesOpportunity[]): SalesOpportunity[] {
  return source.slice(0, 4).map((item, index) => ({
    ...item,
    probability: index === 0 ? item.probability : Math.max(0.2, item.probability - 0.15),
    nextStep: `${item.nextStep} (część danych CRM nieuzupełniona)`,
  }));
}

export function getSalesOpportunities(dataset: MockDatasetName = "baseline") {
  if (dataset === "incomplete") {
    return buildIncompleteSalesDataset(opportunitiesByDataset.baseline);
  }

  return opportunitiesByDataset[dataset] ?? opportunitiesByDataset.baseline;
}

export function getSalesSummary(dataset: MockDatasetName = "baseline") {
  const opportunities = getSalesOpportunities(dataset);
  const pipelineValue = opportunities.reduce((sum, item) => sum + item.valueNet, 0);
  const weightedPipelineValue = opportunities.reduce((sum, item) => sum + item.valueNet * item.probability, 0);
  const won = opportunities.filter((item) => item.stage === "wygrana").length;
  const lost = opportunities.filter((item) => item.stage === "utracona").length;
  const lead = opportunities.filter((item) => item.stage === "lead").length;
  const oferta = opportunities.filter((item) => item.stage === "oferta").length;
  const negocjacje = opportunities.filter((item) => item.stage === "negocjacje").length;
  const avgProbability = opportunities.length > 0 ? opportunities.reduce((sum, item) => sum + item.probability, 0) / opportunities.length : 0;
  const topOpportunity = [...opportunities].sort((left, right) => right.valueNet - left.valueNet)[0] ?? null;

  return {
    opportunities,
    pipelineValue,
    weightedPipelineValue,
    avgProbability,
    won,
    lost,
    stageCounts: { lead, oferta, negocjacje, wygrana: won, utracona: lost },
    topOpportunity,
  };
}