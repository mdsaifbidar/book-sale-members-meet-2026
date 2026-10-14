import Link from "next/link";
import { getReportSummary } from "@/lib/data/reports";
import type { SalesFilter } from "@/lib/data/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterSelect } from "@/components/filter-select";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, round2 } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/format";
import { ReceiptIcon, BookOpenIcon, BanknoteIcon, AlertTriangleIcon } from "lucide-react";

interface SearchParams {
  dateFrom?: string;
  dateTo?: string;
  customerType?: string;
  supplier?: string;
  paymentMethod?: string;
}

const CUSTOMER_TYPE_LABEL: Record<string, string> = { unit: "Unit", person: "Person" };
const PAYMENT_METHOD_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "unpaid", label: "Unpaid" },
];
const PAYMENT_METHOD_VALUES = new Set(["cash", "upi", "unpaid"]);

function buildFilter(params: SearchParams): SalesFilter {
  return {
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    customerType: params.customerType === "unit" || params.customerType === "person" ? params.customerType : undefined,
    supplier: params.supplier || undefined,
    paymentMethod: PAYMENT_METHOD_VALUES.has(params.paymentMethod ?? "")
      ? (params.paymentMethod as "cash" | "upi" | "unpaid")
      : undefined,
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filter = buildFilter(params);
  const report = await getReportSummary(filter);

  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][]
  ).toString();

  const collectionRate =
    report.totalSalesValue > 0 ? round2((report.totalCollected / report.totalSalesValue) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {report.totalTransactions} transaction(s) in this view · {collectionRate}% collected
          </p>
        </div>
        <a
          href={`/api/export/sales${queryString ? `?${queryString}` : ""}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Export Filtered Sales
        </a>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <FilterSelect
                id="customerType"
                name="customerType"
                defaultValue={params.customerType ?? "any"}
                options={[
                  { value: "any", label: "Any" },
                  { value: "unit", label: "Unit" },
                  { value: "person", label: "Person" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplier">Supplier</Label>
              <Input id="supplier" name="supplier" defaultValue={params.supplier} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Payment</Label>
              <FilterSelect
                id="paymentMethod"
                name="paymentMethod"
                defaultValue={params.paymentMethod ?? "any"}
                options={PAYMENT_METHOD_OPTIONS}
              />
            </div>
            <div className="flex items-end gap-2 lg:col-span-5">
              <Button type="submit">Apply Filters</Button>
              <Link href="/reports" className={buttonVariants({ variant: "ghost" })}>
                Clear
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Transactions" value={String(report.totalTransactions)} icon={ReceiptIcon} />
        <StatCard label="Books Sold" value={String(report.totalBooksSold)} icon={BookOpenIcon} />
        <StatCard label="Total Collected" value={formatCurrency(report.totalCollected)} icon={BanknoteIcon} />
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(report.totalOutstanding)}
          icon={AlertTriangleIcon}
          tone={report.totalOutstanding > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {report.byPaymentMethod.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data for this filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byPaymentMethod.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{paymentMethodLabel(row.key)}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Customer Type</CardTitle>
          </CardHeader>
          <CardContent>
            {report.byCustomerType.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data for this filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byCustomerType.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{CUSTOMER_TYPE_LABEL[row.key] ?? row.key}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          {report.bySupplier.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No data for this filter.</p>
          ) : (
            <div className="-mx-(--card-spacing) overflow-x-auto px-(--card-spacing)">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Books Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.bySupplier.map((row) => (
                    <TableRow key={row.supplier}>
                      <TableCell className="font-medium">{row.supplier}</TableCell>
                      <TableCell className="text-right">{row.booksSold}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
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
