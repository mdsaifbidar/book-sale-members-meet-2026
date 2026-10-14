"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatCurrency } from "@/lib/money";
import type { Book } from "@/lib/types";

export function BookSearch({ onSelect }: { onSelect: (book: Book) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.books ?? []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent/50">
        Search books by title to add to the cart…
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by title…" value={query} onValueChange={setQuery} />
          <CommandList>
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
