export interface Supplier {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  sl_no: number;
  title: string;
  author: string | null;
  language: string | null;
  list_price: number;
  discount_percent: number;
  opening_stock: number;
  remaining_stock: number;
  needs_review: boolean;
  created_at: string;
}

export type CustomerType = "unit" | "person";
export type PaymentMethod = "cash" | "upi" | "unpaid";

export interface Sale {
  id: string;
  transaction_code: string;
  customer_type: CustomerType;
  customer_name: string;
  subtotal: number;
  discount_total: number;
  total_amount: number;
  cash_paid: boolean;
  payment_method: PaymentMethod;
  amount_paid: number;
  balance_due: number;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  book_id: string;
  title_snapshot: string;
  supplier_name_snapshot: string;
  quantity: number;
  unit_list_price: number;
  discount_percent: number;
  unit_selling_price: number;
  line_total: number;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export interface DashboardStats {
  total_sales: number;
  books_sold: number;
  remaining_stock: number;
  total_collected: number;
  total_unpaid: number;
}
