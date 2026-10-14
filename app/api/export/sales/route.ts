import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/guard";
import { getAllSalesWithItems, type SalesFilter, type SalesSortOption } from "@/lib/data/sales";
import { buildSalesWorkbook } from "@/lib/excel/sales-export";

const SORT_VALUES = new Set<SalesSortOption>(["date-desc", "date-asc", "total-desc", "total-asc", "customer-asc"]);

export async function GET(request: NextRequest) {
  await requireUser();

  const params = request.nextUrl.searchParams;
  const paymentStatus = params.get("paymentStatus");
  const customerType = params.get("customerType");
  const sortBy = params.get("sortBy");
  const filter: SalesFilter = {
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
    customerType: customerType === "unit" || customerType === "person" ? customerType : undefined,
    bookTitle: params.get("bookTitle") ?? undefined,
    supplier: params.get("supplier") ?? undefined,
    paymentStatus: paymentStatus === "paid" || paymentStatus === "unpaid" ? paymentStatus : undefined,
    sortBy: SORT_VALUES.has(sortBy as SalesSortOption) ? (sortBy as SalesSortOption) : undefined,
  };

  const rows = await getAllSalesWithItems(filter);
  const buffer = await buildSalesWorkbook(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sio-sales-${Date.now()}.xlsx"`,
    },
  });
}
