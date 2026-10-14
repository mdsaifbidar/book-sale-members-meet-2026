import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/guard";
import { getAllSalesWithItems, type SalesFilter } from "@/lib/data/sales";
import { buildSalesWorkbook } from "@/lib/excel/sales-export";

export async function GET(request: NextRequest) {
  await requireUser();

  const params = request.nextUrl.searchParams;
  const paymentStatus = params.get("paymentStatus");
  const filter: SalesFilter = {
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
    customerName: params.get("customerName") ?? undefined,
    bookTitle: params.get("bookTitle") ?? undefined,
    supplier: params.get("supplier") ?? undefined,
    paymentStatus: paymentStatus === "paid" || paymentStatus === "unpaid" ? paymentStatus : undefined,
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
