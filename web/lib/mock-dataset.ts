import type { MockDatasetName } from "@/lib/mock-contract-economics";

export const MOCK_DATASET_KEY = "bh-mock-dataset";
export const MOCK_DATASET_CHANGED_EVENT = "bh-mock-dataset-change";

export function normalizeMockDataset(value: string | null | undefined): MockDatasetName {
  return value === "stress" ? "stress" : "baseline";
}

export function readMockDatasetFromStorage(): MockDatasetName {
  if (typeof window === "undefined") {
    return "baseline";
  }

  return normalizeMockDataset(window.localStorage.getItem(MOCK_DATASET_KEY));
}

export function persistMockDataset(dataset: MockDatasetName) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_DATASET_KEY, dataset);
  window.dispatchEvent(new Event(MOCK_DATASET_CHANGED_EVENT));
}