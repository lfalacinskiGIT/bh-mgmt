import { Suspense } from "react";
import { ContractsPage } from "@/components/contracts-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ContractsPage />
    </Suspense>
  );
}
