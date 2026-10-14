"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/guard";

export interface DeleteSaleResult {
  success: boolean;
  error?: string;
}

export async function deleteSale(saleId: string): Promise<DeleteSaleResult> {
  await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_sale", { p_sale_id: saleId });

  if (error) {
    return { success: false, error: error.message };
  }

  redirect("/sales");
}
