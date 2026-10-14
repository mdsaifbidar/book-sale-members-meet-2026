"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/money";
import type { Book } from "@/lib/types";
import { adjustBook } from "@/app/(app)/inventory/actions";
import { PencilIcon, XIcon, CheckIcon } from "lucide-react";

export function InventoryTable({ books }: { books: Book[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const grouped = books.reduce<Record<string, Book[]>>((acc, book) => {
    const key = book.supplier_name ?? "Unknown";
    (acc[key] ??= []).push(book);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
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
                  <TableHead className="hidden sm:table-cell">Opening</TableHead>
                  <TableHead className="hidden sm:table-cell">Sold</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierBooks.map((book) =>
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
        <Input
          type="number"
          min={0}
          step="0.01"
          value={listPrice}
          onChange={(e) => setListPrice(Number(e.target.value) || 0)}
          className="h-9 w-24"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={discountPercent}
          onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
          className="h-9 w-20"
        />
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {formatCurrency(listPrice * (1 - discountPercent / 100))}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{book.opening_stock}</TableCell>
      <TableCell className="hidden sm:table-cell">{book.opening_stock - remainingStock}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          value={remainingStock}
          onChange={(e) => setRemainingStock(Math.max(0, Number(e.target.value) || 0))}
          className="h-9 w-20"
        />
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
