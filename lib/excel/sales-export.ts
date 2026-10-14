import ExcelJS from "exceljs";
import type { Sale, SaleItem } from "@/lib/types";
import { autoFitColumns, styleHeaderRow } from "./styles";

export interface SaleWithItemsRow {
  sale: Sale;
  items: SaleItem[];
}

export async function buildSalesWorkbook(rows: SaleWithItemsRow[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIO Book Sale Portal";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Sales");
  sheet.columns = [
    { header: "Transaction Code", key: "transactionCode", width: 20 },
    { header: "Date", key: "date", width: 18 },
    { header: "Customer Type", key: "customerType", width: 14 },
    { header: "Customer Name", key: "customerName", width: 24 },
    { header: "Book Title", key: "title", width: 32 },
    { header: "Supplier", key: "supplier", width: 26 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit List Price", key: "unitListPrice", width: 14 },
    { header: "Discount %", key: "discountPercent", width: 12 },
    { header: "Unit Selling Price", key: "unitSellingPrice", width: 16 },
    { header: "Line Total", key: "lineTotal", width: 12 },
    { header: "Sale Subtotal", key: "subtotal", width: 14 },
    { header: "Sale Discount", key: "discountTotal", width: 14 },
    { header: "Sale Total", key: "totalAmount", width: 12 },
    { header: "Payment Status", key: "paymentStatus", width: 16 },
    { header: "Amount Paid", key: "amountPaid", width: 12 },
    { header: "Balance Due", key: "balanceDue", width: 12 },
  ];

  for (const { sale, items } of rows) {
    for (const item of items) {
      sheet.addRow({
        transactionCode: sale.transaction_code,
        date: new Date(sale.created_at),
        customerType: sale.customer_type,
        customerName: sale.customer_name,
        title: item.title_snapshot,
        supplier: item.supplier_name_snapshot,
        quantity: item.quantity,
        unitListPrice: item.unit_list_price,
        discountPercent: item.discount_percent,
        unitSellingPrice: item.unit_selling_price,
        lineTotal: item.line_total,
        subtotal: sale.subtotal,
        discountTotal: sale.discount_total,
        totalAmount: sale.total_amount,
        paymentStatus: sale.cash_paid ? "Paid (cash)" : "Unpaid",
        amountPaid: sale.amount_paid,
        balanceDue: sale.balance_due,
      });
    }
  }

  styleHeaderRow(sheet);
  autoFitColumns(sheet);

  return workbook.xlsx.writeBuffer();
}
