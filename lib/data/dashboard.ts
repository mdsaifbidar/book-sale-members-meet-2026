import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Book, DashboardStats, Sale } from "@/lib/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dashboard_stats").select("*").single();
  if (error) throw error;
  return data as DashboardStats;
}

export async function getRecentSales(limit = 10): Promise<Sale[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Sale[];
}

export async function getLowStockBooks(threshold = 5, limit = 20): Promise<Book[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select("*, suppliers(name)")
    .lte("remaining_stock", threshold)
    .order("remaining_stock", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data as Array<Book & { suppliers: { name: string } | null }>).map((b) => ({
    ...b,
    supplier_name: b.suppliers?.name,
  }));
}
