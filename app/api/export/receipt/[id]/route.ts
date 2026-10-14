import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/guard";
import { getSaleWithItems } from "@/lib/data/sales";
import { buildReceiptWorkbook } from "@/lib/excel/receipt-export";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();

  const { id } = await params;
  const sale = await getSaleWithItems(id);
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  const buffer = await buildReceiptWorkbook(sale, sale.items);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${sale.transaction_code}.xlsx"`,
    },
  });
}
