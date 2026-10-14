import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import path from "node:path";
import { parseCatalogue } from "./import-books";

async function loadBooks() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(process.cwd(), "data", "Sale - Book List.xlsx"));
  return parseCatalogue(workbook);
}

describe("parseCatalogue", () => {
  it("parses all 119 catalogue rows across 3 suppliers", async () => {
    const books = await loadBooks();
    expect(books).toHaveLength(119);
    const suppliers = new Set(books.map((b) => b.supplier));
    expect(suppliers).toEqual(
      new Set(["White Dot Publisher", "Hidayat Publishers & Distributors", "SIO Syllabus / Other"])
    );
  });

  it("applies no discount to White Dot Publisher titles", async () => {
    const books = await loadBooks();
    const whiteDot = books.filter((b) => b.supplier === "White Dot Publisher");
    expect(whiteDot.length).toBeGreaterThan(0);
    expect(whiteDot.every((b) => b.discountPercent === 0)).toBe(true);
  });

  it("applies the verified 40% discount to every Hidayat title", async () => {
    const books = await loadBooks();
    const hidayat = books.filter((b) => b.supplier === "Hidayat Publishers & Distributors");
    expect(hidayat.length).toBe(78);
    expect(hidayat.every((b) => b.discountPercent === 40)).toBe(true);
    expect(hidayat.every((b) => !b.needsReview)).toBe(true);
  });

  it("flags the Kannada-section book with a missing stock quantity", async () => {
    const books = await loadBooks();
    const book = books.find((b) => b.title === "Islam, Islamic Movement & SIO");
    expect(book).toBeDefined();
    expect(book?.openingStock).toBe(0);
    expect(book?.needsReview).toBe(true);
  });

  it("flags the Urdu title mixed into the Kannada syllabus section", async () => {
    const books = await loadBooks();
    const book = books.find((b) => b.title.startsWith("Muhabbat e Rasool"));
    expect(book).toBeDefined();
    expect(book?.needsReview).toBe(true);
  });
});
