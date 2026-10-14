import { describe, expect, it } from "vitest";
import { computeCartTotals, lineTotal, unitSellingPrice } from "./money";

describe("unitSellingPrice", () => {
  it("applies no discount by default", () => {
    expect(unitSellingPrice(300, 0)).toBe(300);
  });

  it("matches the verified Hidayat 40% discount", () => {
    // Sheet2: Rasayel Minal Quran — qty 15, price 300, 40% discount, amount 2700
    expect(unitSellingPrice(300, 40)).toBe(180);
    expect(lineTotal(300, 40, 15)).toBe(2700);
  });
});

describe("computeCartTotals", () => {
  it("sums subtotal, discount, and total across mixed-discount lines", () => {
    const totals = computeCartTotals([
      { quantity: 2, unitListPrice: 100, discountPercent: 0 }, // 200
      { quantity: 3, unitListPrice: 50, discountPercent: 40 }, // 90
    ]);
    expect(totals.subtotal).toBe(350); // 200 + 150
    expect(totals.discountTotal).toBe(60); // 0 + 60
    expect(totals.total).toBe(290); // 200 + 90
  });

  it("returns zeros for an empty cart", () => {
    expect(computeCartTotals([])).toEqual({ subtotal: 0, discountTotal: 0, total: 0 });
  });
});
