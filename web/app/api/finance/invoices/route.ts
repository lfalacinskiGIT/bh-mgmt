import { NextRequest } from "next/server";
import { getAllMockInvoices, type MockInvoice } from "@/lib/mock-invoices-store";
import { isMockMode } from "@/lib/mock-mode";

interface InvoicesResponse {
  items: MockInvoice[];
  total: number;
  page: number;
  pageSize: number;
}

export async function GET(request: NextRequest) {
  if (!isMockMode()) {
    return Response.json({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      message: "Only MOCK_MODE is supported in this prototype",
    } satisfies InvoicesResponse & { message: string });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20);
  const status = searchParams.get("status")?.trim().toLowerCase();
  const search = searchParams.get("search")?.trim().toLowerCase();

  const all = await getAllMockInvoices();

  const filtered = all.filter((invoice) => {
    const statusOk = !status || invoice.status === status;
    const searchOk =
      !search ||
      invoice.number.toLowerCase().includes(search) ||
      invoice.customerName.toLowerCase().includes(search);

    return statusOk && searchOk;
  });

  const sorted = filtered.sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
  const offset = (page - 1) * pageSize;

  return Response.json({
    items: sorted.slice(offset, offset + pageSize),
    total: sorted.length,
    page,
    pageSize,
  } satisfies InvoicesResponse);
}
