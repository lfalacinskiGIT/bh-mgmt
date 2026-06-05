import { FinanceMockDashboard } from "@/components/finance-mock-dashboard";
import { getAllMockInvoices } from "@/lib/mock-invoices-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialItems = await getAllMockInvoices();

  return <FinanceMockDashboard initialItems={initialItems} />;
}
