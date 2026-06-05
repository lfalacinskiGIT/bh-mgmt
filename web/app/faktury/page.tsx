import { InvoicesPage } from "@/components/invoices-page";
import { getAllMockInvoices } from "@/lib/mock-invoices-store";

export default async function Page() {
  const initialInvoices = await getAllMockInvoices();

  return <InvoicesPage initialInvoices={initialInvoices} />;
}
