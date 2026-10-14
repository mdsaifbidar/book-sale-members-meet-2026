import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const saleItemInputSchema = z.object({
  bookId: z.uuid(),
  quantity: z.coerce.number().int().positive(),
  unitListPrice: z.coerce.number().nonnegative(),
  discountPercent: z.coerce.number().min(0).max(100),
});

export const saleInputSchema = z.object({
  customerType: z.enum(["unit", "person"]),
  customerName: z.string().trim().min(1, "Name is required"),
  cashPaid: z.boolean(),
  confirmed: z.boolean().refine((v) => v === true, {
    message: "You must confirm the sale before saving",
  }),
  idempotencyKey: z.uuid(),
  items: z.array(saleItemInputSchema).min(1, "Add at least one book"),
});

export type SaleInput = z.infer<typeof saleInputSchema>;
export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

export const inventoryAdjustmentSchema = z.object({
  bookId: z.uuid(),
  listPrice: z.coerce.number().nonnegative().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  remainingStock: z.coerce.number().int().min(0).optional(),
  reason: z.string().trim().optional(),
});
