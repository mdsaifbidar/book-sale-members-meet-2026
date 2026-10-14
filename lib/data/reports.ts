import "server-only";
import { getAllSalesWithItems, type SalesFilter } from "@/lib/data/sales";
import { round2 } from "@/lib/money";
import type { CustomerType, PaymentMethod } from "@/lib/types";

export interface ReportBreakdown {
  key: string;
  count: number;
  amount: number;
}

export interface SupplierBreakdown {
  supplier: string;
  booksSold: number;
  revenue: number;
}

export interface ReportSummary {
  totalTransactions: number;
  totalBooksSold: number;
  totalSalesValue: number;
  totalCollected: number;
  totalOutstanding: number;
  byPaymentMethod: ReportBreakdown[];
  byCustomerType: ReportBreakdown[];
  bySupplier: SupplierBreakdown[];
}

const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["cash", "upi", "unpaid"];
const CUSTOMER_TYPE_ORDER: CustomerType[] = ["unit", "person"];

export async function getReportSummary(filter: SalesFilter): Promise<ReportSummary> {
  const rows = await getAllSalesWithItems(filter);

  let totalBooksSold = 0;
  let totalSalesValue = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  const paymentMap = new Map<string, { count: number; amount: number }>();
  const customerMap = new Map<string, { count: number; amount: number }>();
  const supplierMap = new Map<string, { booksSold: number; revenue: number }>();

  for (const { sale, items } of rows) {
    totalSalesValue += sale.total_amount;
    totalCollected += sale.amount_paid;
    totalOutstanding += sale.balance_due;

    const payment = paymentMap.get(sale.payment_method) ?? { count: 0, amount: 0 };
    payment.count += 1;
    payment.amount += sale.total_amount;
    paymentMap.set(sale.payment_method, payment);

    const customer = customerMap.get(sale.customer_type) ?? { count: 0, amount: 0 };
    customer.count += 1;
    customer.amount += sale.total_amount;
    customerMap.set(sale.customer_type, customer);

    for (const item of items) {
      totalBooksSold += item.quantity;
      const supplier = supplierMap.get(item.supplier_name_snapshot) ?? { booksSold: 0, revenue: 0 };
      supplier.booksSold += item.quantity;
      supplier.revenue += item.line_total;
      supplierMap.set(item.supplier_name_snapshot, supplier);
    }
  }

  const byPaymentMethod = PAYMENT_METHOD_ORDER.filter((k) => paymentMap.has(k)).map((key) => ({
    key,
    count: paymentMap.get(key)!.count,
    amount: round2(paymentMap.get(key)!.amount),
  }));

  const byCustomerType = CUSTOMER_TYPE_ORDER.filter((k) => customerMap.has(k)).map((key) => ({
    key,
    count: customerMap.get(key)!.count,
    amount: round2(customerMap.get(key)!.amount),
  }));

  const bySupplier = Array.from(supplierMap.entries())
    .map(([supplier, v]) => ({ supplier, booksSold: v.booksSold, revenue: round2(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalTransactions: rows.length,
    totalBooksSold,
    totalSalesValue: round2(totalSalesValue),
    totalCollected: round2(totalCollected),
    totalOutstanding: round2(totalOutstanding),
    byPaymentMethod,
    byCustomerType,
    bySupplier,
  };
}
