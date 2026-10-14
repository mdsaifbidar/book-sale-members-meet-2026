import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/guard";
import { getAllBooks } from "@/lib/data/books";
import { buildInventoryWorkbook } from "@/lib/excel/inventory-export";

export async function GET() {
  await requireUser();

  const books = await getAllBooks();
  const buffer = await buildInventoryWorkbook(books);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sio-inventory-${Date.now()}.xlsx"`,
    },
  });
}
