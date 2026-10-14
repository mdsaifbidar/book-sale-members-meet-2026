"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/guard";
import { saleInputSchema } from "@/lib/validation";

export interface ConfirmSaleResult {
  success: boolean;
  error?: string;
  saleId?: string;
  transactionCode?: string;
}

export async function confirmSale(input: unknown): Promise<ConfirmSaleResult> {
  await requireUser();

  const parsed = saleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { customerType, customerName, cashPaid, idempotencyKey, items } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_sale", {
    p_customer_type: customerType,
    p_customer_name: customerName,
    p_cash_paid: cashPaid,
    p_idempotency_key: idempotencyKey,
    p_items: items.map((i) => ({
      book_id: i.bookId,
      quantity: i.quantity,
      unit_list_price: i.unitListPrice,
      discount_percent: i.discountPercent,
    })),
  });

  if (error) {
    // Stock-validation and other business-rule failures surface here as
    // plain Postgres exception messages raised inside create_sale().
    return { success: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { success: true, saleId: row.sale_id, transactionCode: row.transaction_code };
}
