import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";

function withSupplierName(rows: Array<Book & { suppliers: { name: string } | null }>): Book[] {
  return rows.map((b) => ({ ...b, supplier_name: b.suppliers?.name }));
}

export async function searchBooks(query: string, limit = 20): Promise<Book[]> {
  const supabase = await createClient();
  let builder = supabase
    .from("books")
    .select("*, suppliers(name)")
    .gt("remaining_stock", 0)
    .order("title", { ascending: true })
    .limit(limit);

  if (query.trim()) {
    builder = builder.ilike("title", `%${query.trim()}%`);
  }

  const { data, error } = await builder;
  if (error) throw error;
  return withSupplierName(data as Array<Book & { suppliers: { name: string } | null }>);
}

export async function getAllBooks(): Promise<Book[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select("*, suppliers(name)")
    .order("supplier_id", { ascending: true })
    .order("sl_no", { ascending: true });
  if (error) throw error;
  return withSupplierName(data as Array<Book & { suppliers: { name: string } | null }>);
}
