"use client";

import { useState } from "react";
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
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer on navigation rather than leaving it open behind the
  // new page. Adjusted during render (not an effect) per React's guidance
  // for resetting state when a prop changes: https://react.dev/learn/you-might-not-need-an-effect
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const currentLabel = NAV_ITEMS.find(
    ({ href }) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
  )?.label;

  return (
    <div className="flex h-screen overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 -translate-x-full flex-col overflow-y-auto bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out print:hidden lg:static lg:w-60 lg:translate-x-0",
          mobileOpen && "translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <div>
            <p className="text-sm font-semibold tracking-tight">SIO Book Sale</p>
            <p className="text-xs text-sidebar-foreground/60">Members Meet 2026</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors lg:py-2",
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

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3 print:hidden lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-foreground hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-semibold">{currentLabel ?? "SIO Book Sale"}</span>
        </header>
        <main className="h-full flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
