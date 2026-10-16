import ExcelJS from "exceljs";
import type { Sale, SaleItem } from "@/lib/types";
import { paymentMethodLabel } from "@/lib/format";
import { autoFitColumns } from "./styles";

export async function buildReceiptWorkbook(sale: Sale, items: SaleItem[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIO Book Sale Portal";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Receipt");

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "SIO Karnataka — State Members Meet 2026";
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = "Mangalore, 16–18 October 2026";
  sheet.getCell("A2").font = { italic: true };

  sheet.addRow([]);
  sheet.addRow(["Transaction Code", sale.transaction_code]);
  sheet.addRow(["Date", new Date(sale.created_at).toLocaleString("en-IN")]);
  sheet.addRow(["Customer Type", sale.customer_type]);
  sheet.addRow(["Customer Name", sale.customer_name]);
  if (sale.person_unit) sheet.addRow(["Person Unit", sale.person_unit]);
  sheet.addRow(["Payment Method", paymentMethodLabel(sale.payment_method)]);
  sheet.addRow([]);

  const headerRowIndex = sheet.lastRow!.number + 1;
  sheet.addRow(["Title", "Supplier", "Quantity", "Unit List Price", "Discount %", "Unit Selling Price", "Line Total"]);
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.font = { bold: true };

  for (const item of items) {
    sheet.addRow([
      item.title_snapshot,
      item.supplier_name_snapshot,
      item.quantity,
      item.unit_list_price,
      item.discount_percent,
      item.unit_selling_price,
      item.line_total,
    ]);
  }

  sheet.addRow([]);
  sheet.addRow(["", "", "", "", "", "Subtotal", sale.subtotal]);
  sheet.addRow(["", "", "", "", "", "Discount", sale.discount_total]);
  const totalRow = sheet.addRow(["", "", "", "", "", "Total", sale.total_amount]);
  totalRow.font = { bold: true };
  sheet.addRow(["", "", "", "", "", "Amount Paid", sale.amount_paid]);
  sheet.addRow(["", "", "", "", "", "Balance Due", sale.balance_due]);

  autoFitColumns(sheet);

  return workbook.xlsx.writeBuffer();
}
