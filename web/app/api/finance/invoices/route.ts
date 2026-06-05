import { NextRequest } from "next/server";
import { getAllMockInvoices, updateMockInvoice, type InvoiceFlowType, type MockInvoice } from "@/lib/mock-invoices-store";
import { MockDataValidationError } from "@/lib/mock-json-validation";
import { isMockMode } from "@/lib/mock-mode";

interface InvoicesResponse {
  items: MockInvoice[];
  total: number;
  page: number;
  pageSize: number;
}

function isInvoiceFlowType(value: string): value is InvoiceFlowType {
  return value === "revenue" || value === "cost";
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

  let all: MockInvoice[];

  try {
    all = await getAllMockInvoices();
  } catch (error) {
    if (error instanceof MockDataValidationError) {
      return Response.json(
        {
          items: [],
          total: 0,
          page,
          pageSize,
          message: error.message,
        } satisfies InvoicesResponse & { message: string },
        { status: 500 },
      );
    }

    throw error;
  }

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

export async function PATCH(request: NextRequest) {
  if (!isMockMode()) {
    return Response.json({ message: "Only MOCK_MODE is supported in this prototype" }, { status: 400 });
  }

  const body = (await request.json()) as {
    id?: string;
    flowType?: string;
    contractId?: string | null;
    status?: MockInvoice["status"];
  };

  if (!body.id) {
    return Response.json({ message: "Invoice id is required" }, { status: 400 });
  }

  const changes: Partial<Pick<MockInvoice, "flowType" | "contractId" | "status">> = {};

  if (body.flowType !== undefined) {
    if (!isInvoiceFlowType(body.flowType)) {
      return Response.json({ message: "Invalid flowType" }, { status: 400 });
    }

    changes.flowType = body.flowType;
  }

  if (body.contractId !== undefined) {
    changes.contractId = body.contractId;
  }

  if (body.status !== undefined) {
    if (body.status !== "issued" && body.status !== "paid" && body.status !== "overdue") {
      return Response.json({ message: "Invalid status" }, { status: 400 });
    }

    changes.status = body.status;
  }

  const updated = await updateMockInvoice(body.id, changes);

  if (!updated) {
    return Response.json({ message: "Invoice not found" }, { status: 404 });
  }

  return Response.json({ item: updated });
}
