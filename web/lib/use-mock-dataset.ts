"use client";

import { useEffect, useState } from "react";
import type { MockDatasetName } from "@/lib/mock-contract-economics";
import { persistMockDataset, readMockDatasetFromStorage } from "@/lib/mock-dataset";

export function useMockDataset(initialDataset?: MockDatasetName | null) {
  const [dataset, setDataset] = useState<MockDatasetName>(() => initialDataset ?? readMockDatasetFromStorage());

  useEffect(() => {
    persistMockDataset(dataset);
  }, [dataset]);

  return [dataset, setDataset] as const;
}