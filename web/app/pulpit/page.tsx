import { DashboardPage } from "@/components/dashboard-page";
import { getAllMockInvoices } from "@/lib/mock-invoices-store";

export default async function Page() {
  const initialInvoices = await getAllMockInvoices();

  return <DashboardPage initialInvoices={initialInvoices} />;
}
