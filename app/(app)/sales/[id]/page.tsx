import Link from "next/link";
import { notFound } from "next/navigation";
import { getSaleWithItems } from "@/lib/data/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteSaleButton } from "@/components/delete-sale-button";
import { formatCurrency } from "@/lib/money";
import { formatDateTime, paymentMethodLabel } from "@/lib/format";
import { ArrowLeftIcon } from "lucide-react";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await getSaleWithItems(id);
  if (!sale) notFound();

  return (
    <div className="space-y-6">
      <Link href="/sales" className={buttonVariants({ variant: "ghost", className: "-ml-2" })}>
        <ArrowLeftIcon className="size-4" />
        Back to Sales History
      </Link>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl">{sale.transaction_code}</CardTitle>
            <p className="text-sm text-muted-foreground">{formatDateTime(sale.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={sale.cash_paid ? "secondary" : "destructive"}>
              {paymentMethodLabel(sale.payment_method)}
            </Badge>
            <a href={`/api/export/receipt/${sale.id}`} className={buttonVariants({ variant: "outline" })}>
              Download Excel
            </a>
            <DeleteSaleButton saleId={sale.id} transactionCode={sale.transaction_code} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Customer Type</p>
              <p className="font-medium capitalize">{sale.customer_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{sale.customer_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount Paid</p>
              <p className="font-medium">{formatCurrency(sale.amount_paid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance Due</p>
              <p className="font-medium">{formatCurrency(sale.balance_due)}</p>
            </div>
          </div>

          <div className="-mx-(--card-spacing) overflow-x-auto px-(--card-spacing)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Supplier</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="hidden sm:table-cell">List Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Discount %</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title_snapshot}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {item.supplier_name_snapshot}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatCurrency(item.unit_list_price)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{item.discount_percent}%</TableCell>
                    <TableCell>{formatCurrency(item.unit_selling_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>−{formatCurrency(sale.discount_total)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(sale.total_amount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
