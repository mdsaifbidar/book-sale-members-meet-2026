import Link from "next/link";
import { getSales, type SalesFilter } from "@/lib/data/sales";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/money";
import { formatDateTime, paymentMethodLabel } from "@/lib/format";

interface SearchParams {
  dateFrom?: string;
  dateTo?: string;
  customerType?: string;
  bookTitle?: string;
  supplier?: string;
  paymentStatus?: string;
}

function buildFilter(params: SearchParams): SalesFilter {
  return {
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    customerType: params.customerType === "unit" || params.customerType === "person" ? params.customerType : undefined,
    bookTitle: params.bookTitle || undefined,
    supplier: params.supplier || undefined,
    paymentStatus: params.paymentStatus === "paid" || params.paymentStatus === "unpaid" ? params.paymentStatus : undefined,
  };
}

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filter = buildFilter(params);
  const sales = await getSales(filter);

  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][]
  ).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales History</h1>
          <p className="text-sm text-muted-foreground">{sales.length} transaction(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/export/sales${queryString ? `?${queryString}` : ""}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Export Filtered
          </a>
          <a href="/api/export/sales" className={buttonVariants({ variant: "outline" })}>
            Export All
          </a>
          <a href="/api/export/inventory" className={buttonVariants({ variant: "outline" })}>
            Export Inventory
          </a>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1.5">
              <Label htmlFor="dateFrom">From</Label>
              <Input id="dateFrom" name="dateFrom" type="date" defaultValue={params.dateFrom} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateTo">To</Label>
              <Input id="dateTo" name="dateTo" type="date" defaultValue={params.dateTo} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerType">Customer Type</Label>
              <Select name="customerType" defaultValue={params.customerType ?? "any"}>
                <SelectTrigger id="customerType">
                  <SelectValue>
                    {(value: string) => ({ any: "Any", unit: "Unit", person: "Person" })[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                  <SelectItem value="person">Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bookTitle">Book</Label>
              <Input id="bookTitle" name="bookTitle" defaultValue={params.bookTitle} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" name="supplier" defaultValue={params.supplier} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentStatus">Payment</Label>
              <Select name="paymentStatus" defaultValue={params.paymentStatus ?? "any"}>
                <SelectTrigger id="paymentStatus">
                  <SelectValue>
                    {(value: string) => ({ any: "Any", paid: "Paid", unpaid: "Unpaid" })[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 lg:col-span-6">
              <Button type="submit">Apply Filters</Button>
              <Link href="/sales" className={buttonVariants({ variant: "ghost" })}>
                Clear
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {sales.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No transactions match these filters.</p>
          ) : (
            <div className="-mx-(--card-spacing) overflow-x-auto px-(--card-spacing)">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <Link href={`/sales/${sale.id}`} className="font-medium text-primary hover:underline">
                          {sale.transaction_code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {sale.customer_name}{" "}
                        <span className="text-xs text-muted-foreground capitalize">({sale.customer_type})</span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatDateTime(sale.created_at)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={sale.cash_paid ? "secondary" : "destructive"}>
                          {paymentMethodLabel(sale.payment_method)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
