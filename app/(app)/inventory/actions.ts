"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/guard";
import { inventoryAdjustmentSchema } from "@/lib/validation";

export interface AdjustBookResult {
  success: boolean;
  error?: string;
}

export async function adjustBook(input: unknown): Promise<AdjustBookResult> {
  await requireUser();

  const parsed = inventoryAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { bookId, listPrice, discountPercent, remainingStock, reason } = parsed.data;

  const supabase = await createClient();
  const { data: before, error: beforeError } = await supabase
    .from("books")
    .select("list_price, discount_percent, remaining_stock")
    .eq("id", bookId)
    .single();
  if (beforeError || !before) {
    return { success: false, error: "Book not found" };
  }

  const updates: Record<string, number | boolean> = { needs_review: false };
  if (listPrice !== undefined) updates.list_price = listPrice;
  if (discountPercent !== undefined) updates.discount_percent = discountPercent;
  if (remainingStock !== undefined) updates.remaining_stock = remainingStock;

  const { error: updateError } = await supabase.from("books").update(updates).eq("id", bookId);
  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const fieldMap: Record<string, keyof typeof before> = {
    list_price: "list_price",
    discount_percent: "discount_percent",
    remaining_stock: "remaining_stock",
  };
  const adjustments = Object.entries(fieldMap)
    .filter(([field]) => field in updates)
    .map(([field, beforeKey]) => ({
      book_id: bookId,
      field,
      old_value: String(before[beforeKey]),
      new_value: String(updates[field]),
      reason: reason || null,
    }));

  if (adjustments.length > 0) {
    await supabase.from("inventory_adjustments").insert(adjustments);
  }

  return { success: true };
}
