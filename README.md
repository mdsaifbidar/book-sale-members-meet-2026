# SIO Book Sale Portal — Members Meet 2026

A point-of-sale web app for selling books at the SIO Karnataka State Members Meet
(16–18 October 2026, Mangalore): live dashboard, a fast sale-entry flow with an
atomic stock-safe checkout, inventory management, and sales history with Excel
exports.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) ·
Supabase (Postgres + Auth, via `@supabase/ssr`) · ExcelJS · Zod · Vitest

## How auth works

There is a single shared admin account (one Supabase Auth user used by event
staff), not a multi-tenant login system. Every table has Row Level Security
enabled with one policy: any authenticated session gets full access, anonymous
requests get none (see `supabase/migrations/0001_schema.sql`). The browser
talks to Supabase directly using the public **publishable key** — that's safe
because RLS, not a secret key, is what's actually gating access. There is no
service-role key anywhere in this app.

## One-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** (if you don't have one) at
   [supabase.com](https://supabase.com), then copy `.env.example` to
   `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` —
     Project Settings → API in your Supabase dashboard.

3. **Run the database migrations.** Open the Supabase SQL Editor and run,
   in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_create_sale_rpc.sql`
   - `supabase/migrations/0003_views.sql`

4. **Create the admin login.** In Supabase Dashboard → Authentication →
   Users → Add user, create one user (tick "Auto Confirm User") with the
   email/password you want staff to log in with. Put the same email/password
   in `.env.local` as `ADMIN_EMAIL` / `ADMIN_PASSWORD` purely as a reference —
   nothing reads those two lines at runtime, they just keep the demo
   credentials documented in one place. **Change the password** (via the
   in-app Account page, once logged in) before the real event.

5. **Import the book catalogue.** The source file
   `data/Sale - Book List.xlsx` has already been parsed once; regenerate the
   seed SQL any time the source file changes:

   ```bash
   npm run import:books
   ```

   This writes `supabase/seed/import_books.sql`. Open it and run it in the
   Supabase SQL Editor. It's safe to re-run after edits to the source
   spreadsheet — books are matched on (supplier, Sl.No), and `remaining_stock`
   is only set on first insert, so re-importing never resets stock that's
   already been sold.

   Two catalogue rows were flagged `needs_review` by the import (see the
   script's console output) because the source sheet was ambiguous there —
   fix them on the **Inventory** page once you're logged in:
   - *"Islam, Islamic Movement & SIO"* (Kannada section) had no stock
     quantity in the sheet — imported with 0 stock.
   - *"Muhabbat e Rasool aur uske taqaze"* is an Urdu title with an author,
     sitting under the Kannada-syllabus header — its supplier/category may
     need correcting.

6. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, sign in with the admin account from step 4.

## How pricing works

- **White Dot Publisher** titles: no discount — selling price = list price.
- **Hidayat Publishers & Distributors** titles: a verified **40% discount**
  applies to every title (confirmed against the source sheet's own pricing
  worksheet: `list price × quantity × 0.6` matches its stated line totals
  exactly). Selling price = list price × 0.6.
- **SIO Syllabus / Other** (Kannada/Urdu) titles: no discount info available
  — selling price = list price.

List price and discount % are stored separately on each book, and again as a
snapshot on every `sale_items` row, so editing a book's price later never
changes the numbers on a receipt that was already issued.

## How a sale is saved (concurrency & correctness)

Confirming a sale calls a single Postgres function, `create_sale` (see
`supabase/migrations/0002_create_sale_rpc.sql`), as one atomic transaction:

1. Locks every book row referenced in the cart (`SELECT ... FOR UPDATE`), in a
   stable order, so two staff selling the same book at the same time
   serialize instead of both succeeding and overselling.
2. Validates requested quantity against `remaining_stock` for every line;
   any failure raises an exception and the whole transaction rolls back —
   nothing is partially saved.
3. Recomputes every line total and the sale total **server-side** from the
   submitted price/discount (staff can edit both at confirmation) — the
   client's own totals are never trusted.
4. Inserts the sale, its line-item snapshots, and decrements stock — together.
5. Is idempotent: the client sends a `idempotencyKey` (a UUID generated once
   when the New Sale form loads); resubmitting the same key (double-click,
   network retry) returns the original sale instead of creating a duplicate.

## Scripts

| Command               | What it does                                      |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start the dev server                                |
| `npm run build`        | Production build                                    |
| `npm run lint`         | ESLint                                              |
| `npm test`             | Run the Vitest suite (pricing math + import parser) |
| `npm run import:books` | Re-parse the xlsx catalogue into seed SQL           |

## Manual test checklist before the event

- [ ] Log in, change the demo password on the Account page.
- [ ] Create a sale with multiple books, edit price/discount/qty at
      confirmation, confirm, and check the receipt total.
- [ ] Try to sell more than `remaining_stock` of a book — confirm it's
      rejected and nothing is saved (check Inventory stock is unchanged).
- [ ] Open the New Sale form in two tabs, add the same book with the last
      few units in stock in both, and confirm both at the same time — only
      one should succeed (or both, if combined quantity still fits); stock
      should never go negative.
- [ ] Double-click "Confirm Sale" (or resubmit the same idempotency key) —
      confirm only one sale is created.
- [ ] Mark a sale "Cash paid" vs. leave it unpaid, check the Dashboard's
      "Total Collected" / "Unpaid Sales" figures update correctly.
- [ ] Edit a book's price/discount/stock on the Inventory page.
- [ ] Filter Sales History by date, customer, book, supplier, and payment
      status.
- [ ] Export: all sales, a filtered set, a single receipt, and the inventory
      report — open each `.xlsx` and spot-check the numbers.
- [ ] Fix the two `needs_review`-flagged catalogue rows (see step 5 above).

## Not built in this version

Email receipts (Resend) were deliberately deferred — the spec listed it as
optional, and there's no `RESEND_API_KEY` wiring in this version. Add it as a
follow-up if needed.
