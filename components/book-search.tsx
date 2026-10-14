"use client";

import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatCurrency } from "@/lib/money";
import type { Book } from "@/lib/types";

export function BookSearch({ onSelect }: { onSelect: (book: Book) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allBooks, setAllBooks] = useState<Book[] | null>(null);
  const loading = open && allBooks === null;

  // Load the whole in-stock catalogue (already sorted A-Z by the API) each
  // time the dropdown opens, then filter it entirely client-side as the
  // user types. The catalogue is small (~100 titles), so this is far
  // snappier than re-querying per keystroke, and shows every match instead
  // of a debounced, capped page of results. Re-fetching on every open (not
  // just the first) keeps stock counts fresh across a multi-staff event.
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
    if (!q) return allBooks;
    return allBooks.filter((b) => b.title.toLowerCase().includes(q));
  }, [allBooks, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent/50">
        Search books by title to add to the cart…
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by title…" value={query} onValueChange={setQuery} />
          <CommandList className="max-h-[60vh]">
            {loading && <p className="py-6 text-center text-sm text-muted-foreground">Loading books…</p>}
            {!loading && results.length === 0 && <CommandEmpty>No books found.</CommandEmpty>}
            <CommandGroup>
              {results.map((book) => (
                <CommandItem
                  key={book.id}
                  value={book.id}
                  onSelect={() => {
                    onSelect(book);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{book.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {book.supplier_name} · {formatCurrency(book.list_price)}
                    {book.discount_percent > 0 && ` (−${book.discount_percent}%)`} · {book.remaining_stock} in stock
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
