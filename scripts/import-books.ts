/**
 * Parses the SIO book catalogue (`Sale - Book List - Updated.xlsx`) and
 * generates an idempotent SQL file (`supabase/seed/import_books.sql`) that
 * upserts suppliers and books into Supabase. Re-running this script after
 * the source file changes is safe: books are matched on (supplier, sl_no),
 * and `remaining_stock` is only set on first insert — it is never reset by
 * a later re-import, so sold stock is never clobbered.
 *
 * Usage: npx tsx scripts/import-books.ts [path-to-xlsx]
 */
import ExcelJS from "exceljs";
import path from "node:path";
import fs from "node:fs";

export const SUPPLIER_HEADERS: Record<string, string> = {
  "from zonal office": "From Zonal Office",
  // Earlier catalogue versions used this header for the same section
  // (and split SIO's own publications into a separate section below it,
  // since folded into "From Zonal Office") — kept so the script still
  // works against an older source file.
  "directly from white dot publisher": "From Zonal Office",
  "hidayat publishers & distributors": "Hidayat Publishers & Distributors",
};

export interface BookRow {
  supplier: string;
  slNo: number;
  title: string;
  author: string | null;
  language: string | null;
  listPrice: number;
  discountPercent: number;
  openingStock: number;
  needsReview: boolean;
  reviewReason: string | null;
}

function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullableQuote(value: string | null): string {
  return value === null ? "null" : sqlQuote(value);
}

/**
 * Column A (Sl.No) is a shared formula (`ROW()-2`) in the source sheet, not
 * a plain number, so ExcelJS returns `{ formula, result }` for most of its
 * cells. Resolve either shape down to a plain number, or null if it isn't
 * numeric at all (which is how section-header rows are distinguished).
 */
function resolveNumber(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "result" in value && typeof value.result === "number") {
    return value.result;
  }
  return null;
}

export function parseCatalogue(workbook: ExcelJS.Workbook): BookRow[] {
  const catalogueSheet = workbook.getWorksheet("Sheet1");
  const pricingSheet = workbook.getWorksheet("Sheet2");
  if (!catalogueSheet || !pricingSheet) {
    throw new Error("Expected 'Sheet1' (catalogue) and 'Sheet2' (Hidayat pricing) worksheets");
  }

  // Sheet2 gives the discount % Hidayat applies per title. Build a lookup by
  // normalized title rather than trusting row order, so the script still
  // works if rows are reordered or inserted later.
  const discountByTitle = new Map<string, number>();
  pricingSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const title = row.getCell(2).text?.trim();
    const discount = row.getCell(5).value;
    if (title && typeof discount === "number") {
      discountByTitle.set(title.toLowerCase(), discount);
    }
  });

  const books: BookRow[] = [];
  let currentSupplier: string | null = null;

  catalogueSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row

    const slNo = resolveNumber(row.getCell(1).value);
    const titleCell = row.getCell(2).text?.trim() ?? "";

    // Section-header rows (e.g. "Hidayat Publishers & Distributors") have no
    // numeric Sl.No. Merged cells mean every column in the row echoes the
    // same header text, so column A's text alone identifies them.
    if (slNo === null) {
      const headerText = (row.getCell(1).text ?? "").trim().toLowerCase();
      const matched = SUPPLIER_HEADERS[headerText];
      if (matched) {
        currentSupplier = matched;
      } else {
        console.warn(`Row ${rowNumber}: unrecognized section header "${row.getCell(1).text}" — skipping until a known header appears`);
        currentSupplier = null;
      }
      return;
    }

    if (!titleCell) {
      console.warn(`Row ${rowNumber}: skipped (no title)`);
      return;
    }
    if (!currentSupplier) {
      console.warn(`Row ${rowNumber} ("${titleCell}"): no supplier section detected yet — skipping`);
      return;
    }

    const author = row.getCell(3).text?.trim() || null;
    const language = row.getCell(4).text?.trim() || null;
    const listPriceRaw = row.getCell(5).value;
    const openingStockRaw = row.getCell(6).value;

    const listPrice = typeof listPriceRaw === "number" ? listPriceRaw : 0;

    let needsReview = false;
    const reasons: string[] = [];

    if (typeof listPriceRaw !== "number") {
      needsReview = true;
      reasons.push("missing list price");
    }

    let openingStock: number;
    if (typeof openingStockRaw === "number") {
      openingStock = openingStockRaw;
    } else {
      openingStock = 0;
      needsReview = true;
      reasons.push("missing stock quantity in source sheet (set to 0)");
    }

    let discountPercent = 0;
    if (currentSupplier === "Hidayat Publishers & Distributors") {
      const match = discountByTitle.get(titleCell.toLowerCase());
      if (match !== undefined) {
        discountPercent = match;
      } else {
        needsReview = true;
        reasons.push("no matching discount row found in Hidayat pricing sheet (defaulted to 0%)");
      }
    }

    books.push({
      supplier: currentSupplier,
      slNo,
      title: titleCell,
      author,
      language,
      listPrice,
      discountPercent,
      openingStock,
      needsReview,
      reviewReason: reasons.length ? reasons.join("; ") : null,
    });
  });

  if (books.length === 0) {
    throw new Error("No book rows parsed — check the source workbook's layout");
  }

  return books;
}

export function buildImportSql(books: BookRow[]): string {
  const suppliers = Array.from(new Set(books.map((b) => b.supplier)));

  const lines: string[] = [];
  lines.push("-- Generated by scripts/import-books.ts — do not edit by hand.");
  lines.push("-- Safe to re-run: upserts by (supplier, sl_no); never resets remaining_stock on update.");
  lines.push("");
  lines.push("insert into suppliers (name) values");
  lines.push(suppliers.map((s) => `  (${sqlQuote(s)})`).join(",\n") + "");
  lines.push("on conflict (name) do nothing;");
  lines.push("");

  for (const book of books) {
    lines.push(
      [
        "insert into books (supplier_id, sl_no, title, author, language, list_price, discount_percent, opening_stock, remaining_stock, needs_review)",
        `select id, ${book.slNo}, ${sqlQuote(book.title)}, ${sqlNullableQuote(book.author)}, ${sqlNullableQuote(
          book.language
        )}, ${book.listPrice}, ${book.discountPercent}, ${book.openingStock}, ${book.openingStock}, ${book.needsReview}`,
        `from suppliers where name = ${sqlQuote(book.supplier)}`,
        "on conflict (supplier_id, sl_no) do update set",
        "  title = excluded.title,",
        "  author = excluded.author,",
        "  language = excluded.language,",
        "  list_price = excluded.list_price,",
        "  discount_percent = excluded.discount_percent,",
        "  opening_stock = excluded.opening_stock,",
        "  needs_review = excluded.needs_review;",
      ].join("\n")
    );
  }

  return lines.join("\n") + "\n";
}

async function main() {
  const sourcePath = process.argv[2] ?? path.join(process.cwd(), "data", "Sale - Book List - Updated.xlsx");
  const outputPath = path.join(process.cwd(), "supabase", "seed", "import_books.sql");

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source workbook not found at ${sourcePath}`);
    console.error(`Pass the path explicitly: npx tsx scripts/import-books.ts "path/to/Sale - Book List.xlsx"`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(sourcePath);

  const books = parseCatalogue(workbook);
  const sql = buildImportSql(books);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, sql, "utf-8");

  const suppliers = new Set(books.map((b) => b.supplier));
  const flagged = books.filter((b) => b.needsReview);
  console.log(`Parsed ${books.length} books across ${suppliers.size} suppliers.`);
  console.log(`Wrote ${outputPath}`);
  if (flagged.length) {
    console.log(`\n${flagged.length} row(s) flagged for manual review:`);
    for (const b of flagged) {
      console.log(`  - [${b.supplier}] Sl.No ${b.slNo} "${b.title}": ${b.reviewReason}`);
    }
    console.log("\nThese were still imported (with best-effort defaults) — review and fix them on the /inventory page.");
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
