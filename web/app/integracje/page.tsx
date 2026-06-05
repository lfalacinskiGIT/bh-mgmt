import { IntegrationsPage } from "@/components/integrations-page";
import { getAllMockInvoices } from "@/lib/mock-invoices-store";
import { isMockMode } from "@/lib/mock-mode";

export default async function Page() {
  const initialInvoices = await getAllMockInvoices();

  return (
    <IntegrationsPage
      initialInvoices={initialInvoices}
      isMockEnabled={isMockMode()}
    />
  );
}
