import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import path from "node:path";
import { parseCatalogue } from "./import-books";

async function loadBooks() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(process.cwd(), "data", "Sale - Book List - Updated.xlsx"));
  return parseCatalogue(workbook);
}

describe("parseCatalogue", () => {
  it("parses all 134 catalogue rows across 2 suppliers", async () => {
    const books = await loadBooks();
    expect(books).toHaveLength(134);
    const suppliers = new Set(books.map((b) => b.supplier));
    expect(suppliers).toEqual(new Set(["From Zonal Office", "Hidayat Publishers & Distributors"]));
  });

  it("applies no discount to From Zonal Office titles", async () => {
    const books = await loadBooks();
    const zonal = books.filter((b) => b.supplier === "From Zonal Office");
    expect(zonal.length).toBeGreaterThan(0);
    expect(zonal.every((b) => b.discountPercent === 0)).toBe(true);
  });

  it("applies no discount to Hidayat titles either (discount removed for all suppliers)", async () => {
    const books = await loadBooks();
    const hidayat = books.filter((b) => b.supplier === "Hidayat Publishers & Distributors");
    expect(hidayat.length).toBe(78);
    expect(hidayat.every((b) => b.discountPercent === 0)).toBe(true);
    expect(hidayat.every((b) => !b.needsReview)).toBe(true);
  });

  it("splits SIO Constitution into its three language editions, each with stock", async () => {
    const books = await loadBooks();
    const editions = books.filter((b) => b.title === "SIO Constitution");
    expect(editions).toHaveLength(3);
    expect(new Set(editions.map((b) => b.language))).toEqual(new Set(["Kannada", "Urdu", "English"]));
    expect(editions.every((b) => b.openingStock === 30 && !b.needsReview)).toBe(true);
  });

  it("flags no rows for manual review in the corrected catalogue", async () => {
    const books = await loadBooks();
    expect(books.filter((b) => b.needsReview)).toHaveLength(0);
  });
});
