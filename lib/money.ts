export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function unitSellingPrice(listPrice: number, discountPercent: number): number {
  return round2(listPrice * (1 - discountPercent / 100));
}

export function lineTotal(listPrice: number, discountPercent: number, quantity: number): number {
  return round2(unitSellingPrice(listPrice, discountPercent) * quantity);
}

export interface CartLine {
  quantity: number;
  unitListPrice: number;
  discountPercent: number;
}

export interface CartTotals {
  subtotal: number;
  discountTotal: number;
  total: number;
}

export function computeCartTotals(lines: CartLine[]): CartTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let total = 0;
  for (const line of lines) {
    const selling = unitSellingPrice(line.unitListPrice, line.discountPercent);
    subtotal += line.unitListPrice * line.quantity;
    discountTotal += (line.unitListPrice - selling) * line.quantity;
    total += selling * line.quantity;
  }
  return { subtotal: round2(subtotal), discountTotal: round2(discountTotal), total: round2(total) };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
