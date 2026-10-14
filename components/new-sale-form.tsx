"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookSearch } from "@/components/book-search";
import { computeCartTotals, formatCurrency } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/format";
import type { Book, CustomerType, PaymentMethod } from "@/lib/types";
import { confirmSale } from "@/app/(app)/sales/new/actions";
import { CheckCircle2Icon, Trash2Icon } from "lucide-react";

interface CartLine {
  bookId: string;
  title: string;
  supplierName?: string;
  maxStock: number;
  quantity: number;
  unitListPrice: number;
  discountPercent: number;
}

interface SuccessState {
  saleId: string;
  transactionCode: string;
  customerName: string;
  customerType: CustomerType;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
  totals: ReturnType<typeof computeCartTotals>;
}

export function NewSaleForm() {
  const [customerType, setCustomerType] = useState<CustomerType>("unit");
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("unpaid");
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const totals = useMemo(
    () =>
      computeCartTotals(
        cart.map((l) => ({ quantity: l.quantity, unitListPrice: l.unitListPrice, discountPercent: l.discountPercent }))
      ),
    [cart]
  );

  function addBook(book: Book) {
    setCart((prev) => {
      const existing = prev.find((l) => l.bookId === book.id);
      if (existing) {
        if (existing.quantity >= existing.maxStock) {
          toast.error(`Only ${existing.maxStock} in stock for "${book.title}"`);
          return prev;
        }
        return prev.map((l) => (l.bookId === book.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          bookId: book.id,
          title: book.title,
          supplierName: book.supplier_name,
          maxStock: book.remaining_stock,
          quantity: 1,
          unitListPrice: book.list_price,
          discountPercent: book.discount_percent,
        },
      ];
    });
  }

  function updateLine(bookId: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.bookId === bookId ? { ...l, ...patch } : l)));
  }

  function removeLine(bookId: string) {
    setCart((prev) => prev.filter((l) => l.bookId !== bookId));
  }

  function resetForm() {
    setCustomerType("unit");
    setCustomerName("");
    setCart([]);
    setPaymentMethod("unpaid");
    setConfirmed(false);
    setIdempotencyKey(crypto.randomUUID());
    setSuccess(null);
  }

  function handleSubmit() {
    if (!customerName.trim()) {
      toast.error("Enter a unit/person name");
      return;
    }
    if (cart.length === 0) {
      toast.error("Add at least one book");
      return;
    }
    if (!confirmed) {
      toast.error("Please confirm the sale before saving");
      return;
    }

    startTransition(async () => {
      const result = await confirmSale({
        customerType,
        customerName,
        paymentMethod,
        confirmed,
        idempotencyKey,
        items: cart.map((l) => ({
          bookId: l.bookId,
          quantity: l.quantity,
          unitListPrice: l.unitListPrice,
          discountPercent: l.discountPercent,
        })),
      });

      if (!result.success) {
        toast.error(result.error ?? "Could not save the sale");
        return;
      }

      setSuccess({
        saleId: result.saleId!,
        transactionCode: result.transactionCode!,
        customerName,
        customerType,
        paymentMethod,
        lines: cart,
        totals,
      });
    });
  }

  if (success) {
    return <SaleSuccessPanel success={success} onNewSale={resetForm} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Sale</h1>
        <p className="text-sm text-muted-foreground">Search books, build the cart, then confirm to save.</p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Customer Type</Label>
            <div className="flex gap-2">
              {(["unit", "person"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={customerType === type ? "default" : "outline"}
                  className="flex-1 capitalize"
                  onClick={() => setCustomerType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerName">{customerType === "unit" ? "Unit Name" : "Person Name"}</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={customerType === "unit" ? "e.g. Mangalore Unit" : "e.g. Ahmed Khan"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Books</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BookSearch onSelect={addBook} />

          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No books added yet.</p>
          ) : (
            <>
              {/* Table layout for sm+ screens */}
              <div className="hidden -mx-(--card-spacing) overflow-x-auto px-(--card-spacing) sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-32">List Price</TableHead>
                      <TableHead className="w-28">Discount %</TableHead>
                      <TableHead className="w-32 text-right">Line Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((line) => {
                      const selling = line.unitListPrice * (1 - line.discountPercent / 100);
                      const lineTotal = Math.round(selling * line.quantity * 100) / 100;
                      return (
                        <TableRow key={line.bookId}>
                          <TableCell>
                            <div className="font-medium">{line.title}</div>
                            <div className="text-xs text-muted-foreground">{line.supplierName}</div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={line.maxStock}
                              value={line.quantity}
                              onChange={(e) => {
                                const qty = Math.max(1, Math.min(line.maxStock, Number(e.target.value) || 1));
                                updateLine(line.bookId, { quantity: qty });
                              }}
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.unitListPrice}
                              onChange={(e) => updateLine(line.bookId, { unitListPrice: Number(e.target.value) || 0 })}
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={line.discountPercent}
                              onChange={(e) =>
                                updateLine(line.bookId, {
                                  discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                                })
                              }
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(lineTotal)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeLine(line.bookId)}>
                              <Trash2Icon className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Stacked cards for narrow screens: the table above is unusable at phone widths */}
              <div className="space-y-3 sm:hidden">
                {cart.map((line) => {
                  const selling = line.unitListPrice * (1 - line.discountPercent / 100);
                  const lineTotal = Math.round(selling * line.quantity * 100) / 100;
                  return (
                    <div key={line.bookId} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{line.title}</p>
                          <p className="text-xs text-muted-foreground">{line.supplierName}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-2 -mt-1 shrink-0"
                          onClick={() => removeLine(line.bookId)}
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            max={line.maxStock}
                            value={line.quantity}
                            onChange={(e) => {
                              const qty = Math.max(1, Math.min(line.maxStock, Number(e.target.value) || 1));
                              updateLine(line.bookId, { quantity: qty });
                            }}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Price</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unitListPrice}
                            onChange={(e) => updateLine(line.bookId, { unitListPrice: Number(e.target.value) || 0 })}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Disc. %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={line.discountPercent}
                            onChange={(e) =>
                              updateLine(line.bookId, {
                                discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                              })
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end text-sm font-medium">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>−{formatCurrency(totals.discountTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total Payable</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod">Payment</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger id="paymentMethod" className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="confirmed" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            <Label htmlFor="confirmed" className="font-normal">
              I confirm the items, quantities, and amount above are correct
            </Label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={pending || !confirmed || cart.length === 0 || !customerName.trim()}
            size="lg"
            className="w-full"
          >
            {pending ? "Saving…" : "Confirm Sale"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SaleSuccessPanel({ success, onNewSale }: { success: SuccessState; onNewSale: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-accent px-4 py-3 text-accent-foreground">
        <CheckCircle2Icon className="size-6 text-primary" />
        <div>
          <p className="font-medium">Sale saved successfully</p>
          <p className="text-sm">Transaction {success.transactionCode}</p>
        </div>
      </div>

      <Card id="receipt-printable">
        <CardHeader>
          <CardTitle>Receipt — {success.transactionCode}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {success.customerType === "unit" ? "Unit" : "Person"}: {success.customerName}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="-mx-(--card-spacing) overflow-x-auto px-(--card-spacing)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {success.lines.map((line) => {
                  const selling = line.unitListPrice * (1 - line.discountPercent / 100);
                  return (
                    <TableRow key={line.bookId}>
                      <TableCell>{line.title}</TableCell>
                      <TableCell>{line.quantity}</TableCell>
                      <TableCell>{formatCurrency(selling)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Math.round(selling * line.quantity * 100) / 100)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(success.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>−{formatCurrency(success.totals.discountTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(success.totals.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span>{paymentMethodLabel(success.paymentMethod)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          Print Receipt
        </Button>
        <a href={`/api/export/receipt/${success.saleId}`} className={buttonVariants({ variant: "outline" })}>
          Download Excel
        </a>
        <Link href="/sales" className={buttonVariants({ variant: "ghost" })}>
          View Sales History
        </Link>
        <Button onClick={onNewSale}>Start New Sale</Button>
      </div>
    </div>
  );
}
