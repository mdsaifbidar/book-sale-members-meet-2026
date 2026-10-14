-- Fix: RLS policies alone don't grant SQL privileges — Postgres checks the
-- base GRANT first, then RLS filters rows on top of it. Tables created via a
-- direct `postgres` connection (rather than through Supabase's own migration
-- path) don't inherit Supabase's usual default privileges for anon/
-- authenticated, so the 0001 migration's policies had nothing to filter —
-- every query was rejected with 42501 (insufficient_privilege) before RLS
-- even ran.
grant select, insert, update, delete on suppliers to authenticated;
grant select, insert, update, delete on books to authenticated;
grant select, insert, update, delete on sales to authenticated;
grant select, insert, update, delete on sale_items to authenticated;
grant select, insert, update, delete on inventory_adjustments to authenticated;
