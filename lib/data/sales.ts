import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Sale, SaleItem, SaleWithItems } from "@/lib/types";

export type SalesSortOption = "date-desc" | "date-asc" | "total-desc" | "total-asc" | "customer-asc";

const SORT_COLUMNS: Record<SalesSortOption, { column: "created_at" | "total_amount" | "customer_name"; ascending: boolean }> = {
  "date-desc": { column: "created_at", ascending: false },
  "date-asc": { column: "created_at", ascending: true },
  "total-desc": { column: "total_amount", ascending: false },
  "total-asc": { column: "total_amount", ascending: true },
  "customer-asc": { column: "customer_name", ascending: true },
};

export interface SalesFilter {
  dateFrom?: string;
  dateTo?: string;
  customerType?: "unit" | "person";
  bookTitle?: string;
  supplier?: string;
  paymentStatus?: "paid" | "unpaid";
  sortBy?: SalesSortOption;
}

export async function getSales(filter: SalesFilter): Promise<Sale[]> {
  const supabase = await createClient();
  const { column, ascending } = SORT_COLUMNS[filter.sortBy ?? "date-desc"];

  // Always inner-join sale_items (every sale has >=1 item, guaranteed by the
  // create_sale RPC) rather than branching the select string — a dynamic
  // select string defeats postgrest-js's compile-time type inference.
  let builder = supabase
    .from("sales")
    .select("*, sale_items!inner(title_snapshot, supplier_name_snapshot)")
    .order(column, { ascending });

  if (filter.dateFrom) builder = builder.gte("created_at", filter.dateFrom);
  if (filter.dateTo) builder = builder.lte("created_at", filter.dateTo);
  if (filter.customerType) builder = builder.eq("customer_type", filter.customerType);
  if (filter.paymentStatus === "paid") builder = builder.eq("cash_paid", true);
  if (filter.paymentStatus === "unpaid") builder = builder.eq("cash_paid", false);
  if (filter.bookTitle) builder = builder.ilike("sale_items.title_snapshot", `%${filter.bookTitle}%`);
  if (filter.supplier) builder = builder.ilike("sale_items.supplier_name_snapshot", `%${filter.supplier}%`);

  const { data, error } = await builder;
  if (error) throw error;

  // Dedupe: the !inner join can return one row per matching sale_item.
  const seen = new Map<string, Sale>();
  for (const row of data as unknown as Array<Sale & { sale_items?: unknown }>) {
    const { sale_items, ...sale } = row;
    void sale_items;
    seen.set(sale.id, sale);
  }
  return Array.from(seen.values());
}

export async function getSaleWithItems(id: string): Promise<SaleWithItems | null> {
  const supabase = await createClient();
  const { data: sale, error: saleError } = await supabase.from("sales").select("*").eq("id", id).maybeSingle();
  if (saleError) throw saleError;
  if (!sale) return null;

  const { data: items, error: itemsError } = await supabase
    .from("sale_items")
    .select("*")
    .eq("sale_id", id)
    .order("id", { ascending: true });
  if (itemsError) throw itemsError;

  return { ...(sale as Sale), items: items as SaleItem[] };
}

export async function getAllSalesWithItems(filter: SalesFilter): Promise<Array<{ sale: Sale; items: SaleItem[] }>> {
  const sales = await getSales(filter);
  const supabase = await createClient();
  if (sales.length === 0) return [];

  const { data: items, error } = await supabase
    .from("sale_items")
    .select("*")
    .in(
      "sale_id",
      sales.map((s) => s.id)
    );
  if (error) throw error;

  const bySale = new Map<string, SaleItem[]>();
  for (const item of items as SaleItem[]) {
    const list = bySale.get(item.sale_id) ?? [];
    list.push(item);
    bySale.set(item.sale_id, list);
  }

  return sales.map((sale) => ({ sale, items: bySale.get(sale.id) ?? [] }));
}
