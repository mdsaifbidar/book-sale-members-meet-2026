"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/guard";
import { changePasswordSchema } from "@/lib/validation";

export interface ChangePasswordState {
  error: string | null;
  success: boolean;
}

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  await requireUser();

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
