-- Dashboard aggregate view. Keeps the dashboard query simple and consistent
-- between the dashboard page and any future report.
-- security_invoker: evaluate RLS as the querying role (authenticated),
-- rather than the view owner — required for RLS to apply through a view.
create or replace view dashboard_stats
with (security_invoker = true)
as
select
  (select count(*) from sales) as total_sales,
  (select coalesce(sum(quantity), 0) from sale_items) as books_sold,
  (select coalesce(sum(remaining_stock), 0) from books) as remaining_stock,
  (select coalesce(sum(amount_paid), 0) from sales) as total_collected,
  (select coalesce(sum(balance_due), 0) from sales) as total_unpaid;

revoke all on dashboard_stats from public, anon;
grant select on dashboard_stats to authenticated;
