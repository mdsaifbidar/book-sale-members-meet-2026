import Link from "next/link";
import { getDashboardStats, getLowStockBooks, getRecentSales } from "@/lib/data/dashboard";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { BanknoteIcon, BookOpenIcon, PackageIcon, ReceiptIcon, AlertTriangleIcon } from "lucide-react";

export default async function DashboardPage() {
  const [stats, recentSales, lowStock] = await Promise.all([
    getDashboardStats(),
    getRecentSales(10),
    getLowStockBooks(5, 15),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live overview of the book sale.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Sales" value={String(stats.total_sales)} icon={ReceiptIcon} />
        <StatCard label="Books Sold" value={String(stats.books_sold)} icon={BookOpenIcon} />
        <StatCard label="Remaining Stock" value={String(stats.remaining_stock)} icon={PackageIcon} />
        <StatCard label="Total Collected" value={formatCurrency(stats.total_collected)} icon={BanknoteIcon} />
        <StatCard
          label="Unpaid Sales"
          value={formatCurrency(stats.total_unpaid)}
          icon={AlertTriangleIcon}
          tone={stats.total_unpaid > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <Link href={`/sales/${sale.id}`} className="font-medium text-primary hover:underline">
                          {sale.transaction_code}
                        </Link>
                      </TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(sale.created_at)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={sale.cash_paid ? "secondary" : "destructive"}>
                          {sale.cash_paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing running low.</p>
            ) : (
              lowStock.map((book) => (
                <div key={book.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate" title={book.title}>
                    {book.title}
                  </span>
                  <Badge variant={book.remaining_stock === 0 ? "destructive" : "outline"}>
                    {book.remaining_stock} left
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
