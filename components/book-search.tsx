"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/money";
import type { Book } from "@/lib/types";
import { PlusIcon, SearchIcon } from "lucide-react";

type SortOption = "title-asc" | "title-desc" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "title-desc", label: "Title (Z–A)" },
  { value: "price-asc", label: "Price (Low–High)" },
  { value: "price-desc", label: "Price (High–Low)" },
  { value: "stock-asc", label: "Stock (Low–High)" },
  { value: "stock-desc", label: "Stock (High–Low)" },
];

function sellingPrice(book: Book): number {
  return book.list_price * (1 - book.discount_percent / 100);
}

export function BookSearch({
  onSelect,
  cartBookIds,
}: {
  onSelect: (book: Book) => void;
  cartBookIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allBooks, setAllBooks] = useState<Book[] | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("title-asc");
  const loading = open && allBooks === null;

  // Load the whole in-stock catalogue (already sorted A-Z by the API) each
  // time the dialog opens, then filter it entirely client-side as the user
  // types — the catalogue is small (~100 titles), so this is snappier than
  // a per-keystroke query. Re-fetching on every open keeps stock counts
  // fresh across a multi-staff event.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/books/search")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAllBooks(data.books ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const results = useMemo(() => {
    if (!allBooks) return [];
    const q = query.trim().toLowerCase();
    const filtered = q ? allBooks.filter((b) => b.title.toLowerCase().includes(q)) : allBooks;
    return [...filtered].sort((a, b) => {
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
      }
    });
  }, [allBooks, query, sortBy]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" className="w-full justify-start font-normal text-muted-foreground" />}
      >
        <SearchIcon className="size-4" />
        Search books by title to add to the cart…
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4 pb-3">
          <DialogTitle>Add Books</DialogTitle>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <Input
              autoFocus
              placeholder="Search by title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue>
                  {(value: SortOption) => SORT_OPTIONS.find((o) => o.value === value)?.label}
                </SelectValue>
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
        </DialogHeader>

        <div className="overflow-y-auto">
          {loading ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Loading books…</p>
          ) : results.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No books found.</p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-popover">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-16 text-right">Stock</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((book) => {
                  const inCart = cartBookIds.has(book.id);
                  return (
                    <TableRow key={book.id}>
                      <TableCell>
                        <div className="font-medium">{book.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {book.supplier_name} · {formatCurrency(book.list_price)}
                          {book.discount_percent > 0 && ` (−${book.discount_percent}%)`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{book.remaining_stock}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant={inCart ? "secondary" : "default"}
                          disabled={inCart}
                          onClick={() => onSelect(book)}
                        >
                          {inCart ? (
                            "Added"
                          ) : (
                            <>
                              <PlusIcon className="size-3.5" />
                              Add
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
