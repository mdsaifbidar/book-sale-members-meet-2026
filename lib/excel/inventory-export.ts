import ExcelJS from "exceljs";
import type { Book } from "@/lib/types";
import { autoFitColumns, styleHeaderRow } from "./styles";

export async function buildInventoryWorkbook(books: Book[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIO Book Sale Portal";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Inventory");
  sheet.columns = [
    { header: "Supplier", key: "supplier", width: 26 },
    { header: "Sl.No", key: "slNo", width: 8 },
    { header: "Title", key: "title", width: 34 },
    { header: "Author", key: "author", width: 22 },
    { header: "Language", key: "language", width: 12 },
    { header: "List Price", key: "listPrice", width: 12 },
    { header: "Discount %", key: "discountPercent", width: 12 },
    { header: "Selling Price", key: "sellingPrice", width: 13 },
    { header: "Opening Stock", key: "openingStock", width: 14 },
    { header: "Sold", key: "sold", width: 8 },
    { header: "Remaining Stock", key: "remainingStock", width: 16 },
    { header: "Needs Review", key: "needsReview", width: 14 },
  ];

  for (const book of books) {
    const sellingPrice = Math.round(book.list_price * (1 - book.discount_percent / 100) * 100) / 100;
    sheet.addRow({
      supplier: book.supplier_name ?? "",
      slNo: book.sl_no,
      title: book.title,
      author: book.author ?? "",
      language: book.language ?? "",
      listPrice: book.list_price,
      discountPercent: book.discount_percent,
      sellingPrice,
      openingStock: book.opening_stock,
      sold: book.opening_stock - book.remaining_stock,
      remainingStock: book.remaining_stock,
      needsReview: book.needs_review ? "Yes" : "",
    });
  }

  styleHeaderRow(sheet);
  autoFitColumns(sheet);

  return workbook.xlsx.writeBuffer();
}
