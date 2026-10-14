"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ReceiptText,
  BookOpen,
  History,
  UserCircle,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales/new", label: "New Sale", icon: ReceiptText },
  { href: "/sales", label: "Sales History", icon: History },
  { href: "/inventory", label: "Inventory", icon: BookOpen },
  { href: "/account", label: "Account", icon: UserCircle },
];

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground print:hidden">
        <div className="px-5 py-6">
          <p className="text-sm font-semibold tracking-tight">SIO Book Sale</p>
          <p className="text-xs text-sidebar-foreground/60">Members Meet 2026</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-xs text-sidebar-foreground/60">{email}</p>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 flex items-center gap-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
