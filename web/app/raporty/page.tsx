import { ReportsPage } from "@/components/reports-page";
import { getAllMockInvoices } from "@/lib/mock-invoices-store";

export default async function Page() {
  const initialInvoices = await getAllMockInvoices();

  return <ReportsPage initialInvoices={initialInvoices} />;
}
