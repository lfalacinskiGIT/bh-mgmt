import { PaymentsPage } from "@/components/payments-page";
import { getAllMockInvoices } from "@/lib/mock-invoices-store";

export default async function Page() {
  const initialInvoices = await getAllMockInvoices();

  return <PaymentsPage initialInvoices={initialInvoices} />;
}
