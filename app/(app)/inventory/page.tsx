import { getAllBooks } from "@/lib/data/books";
import { InventoryTable } from "@/components/inventory-table";
import { buttonVariants } from "@/components/ui/button";

export default async function InventoryPage() {
  const books = await getAllBooks();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">{books.length} titles across all suppliers.</p>
        </div>
        <a href="/api/export/inventory" className={buttonVariants({ variant: "outline" })}>
          Export Inventory
        </a>
      </div>

      <InventoryTable books={books} />
    </div>
  );
}
