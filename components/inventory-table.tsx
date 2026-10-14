"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberField } from "@/components/number-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/money";
import type { Book } from "@/lib/types";
import { adjustBook } from "@/app/(app)/inventory/actions";
import { PencilIcon, XIcon, CheckIcon } from "lucide-react";

type SortOption = "default" | "title-asc" | "title-desc" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Sl.No (default)" },
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "title-desc", label: "Title (Z–A)" },
  { value: "price-asc", label: "Selling Price (Low–High)" },
  { value: "price-desc", label: "Selling Price (High–Low)" },
  { value: "stock-asc", label: "Remaining Stock (Low–High)" },
  { value: "stock-desc", label: "Remaining Stock (High–Low)" },
];

function sellingPrice(book: Book): number {
  return book.list_price * (1 - book.discount_percent / 100);
}

function sortBooks(books: Book[], sortBy: SortOption): Book[] {
  if (sortBy === "default") return books;
  return [...books].sort((a, b) => {
    switch (sortBy) {
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "price-asc":
        return sellingPrice(a) - sellingPrice(b);
      case "price-desc":
        return sellingPrice(b) - sellingPrice(a);
      case "stock-asc":
        return a.remaining_stock - b.remaining_stock;
      case "stock-desc":
        return b.remaining_stock - a.remaining_stock;
      default:
        return 0;
    }
  });
}

export function InventoryTable({ books }: { books: Book[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const router = useRouter();

  const grouped = books.reduce<Record<string, Book[]>>((acc, book) => {
    const key = book.supplier_name ?? "Unknown";
    (acc[key] ??= []).push(book);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {books.length > 0 && (
        <div className="flex items-center gap-2">
          <Label htmlFor="inventorySort" className="text-sm text-muted-foreground">
            Sort
          </Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger id="inventorySort" className="w-56">
              <SelectValue>{(value: SortOption) => SORT_OPTIONS.find((o) => o.value === value)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {Object.entries(grouped).map(([supplier, supplierBooks]) => (
        <div key={supplier} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{supplier}</h2>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Title</TableHead>
                  <TableHead>List Price</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead className="hidden sm:table-cell">Selling Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Quantity</TableHead>
                  <TableHead className="hidden sm:table-cell">Sold</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortBooks(supplierBooks, sortBy).map((book) =>
                  editingId === book.id ? (
                    <EditableRow
                      key={book.id}
                      book={book}
                      onDone={() => {
                        setEditingId(null);
                        router.refresh();
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <TableRow key={book.id} className={book.needs_review ? "bg-destructive/5" : undefined}>
                      <TableCell>
                        <div className="font-medium">{book.title}</div>
                        {book.needs_review && (
                          <Badge variant="destructive" className="mt-1">
                            Needs review
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(book.list_price)}</TableCell>
                      <TableCell>{book.discount_percent}%</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatCurrency(book.list_price * (1 - book.discount_percent / 100))}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{book.opening_stock}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {book.opening_stock - book.remaining_stock}
                      </TableCell>
                      <TableCell>
                        <Badge variant={book.remaining_stock <= 5 ? "destructive" : "outline"}>
                          {book.remaining_stock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditingId(book.id)}>
                          <PencilIcon className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {books.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No books yet — run the import script, then paste supabase/seed/import_books.sql into the Supabase SQL editor.
        </p>
      )}
    </div>
  );
}

function EditableRow({
  book,
  onDone,
  onCancel,
}: {
  book: Book;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [listPrice, setListPrice] = useState(book.list_price);
  const [discountPercent, setDiscountPercent] = useState(book.discount_percent);
  const [remainingStock, setRemainingStock] = useState(book.remaining_stock);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await adjustBook({
        bookId: book.id,
        listPrice,
        discountPercent,
        remainingStock,
        reason: "Manual edit via Inventory page",
      });
      if (!result.success) {
        toast.error(result.error ?? "Could not update book");
        return;
      }
      toast.success(`Updated "${book.title}"`);
      onDone();
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{book.title}</TableCell>
      <TableCell>
        <NumberField min={0} step="0.01" value={listPrice} onCommit={setListPrice} className="h-9 w-24" />
      </TableCell>
      <TableCell>
        <NumberField
          min={0}
          max={100}
          step="0.01"
          value={discountPercent}
          onCommit={setDiscountPercent}
          className="h-9 w-20"
        />
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {formatCurrency(listPrice * (1 - discountPercent / 100))}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{book.opening_stock}</TableCell>
      <TableCell className="hidden sm:table-cell">{book.opening_stock - remainingStock}</TableCell>
      <TableCell>
        <NumberField min={0} value={remainingStock} onCommit={setRemainingStock} className="h-9 w-20" />
      </TableCell>
      <TableCell className="flex gap-1">
        <Button size="icon" variant="ghost" disabled={pending} onClick={handleSave}>
          <CheckIcon className="size-4 text-primary" />
        </Button>
        <Button size="icon" variant="ghost" disabled={pending} onClick={onCancel}>
          <XIcon className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
