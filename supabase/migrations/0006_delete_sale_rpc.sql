-- Lets staff remove a sale entered by mistake. Restores the stock it had
-- decremented and removes the sale + its line items, atomically — the
-- mirror image of create_sale.

create or replace function delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from sales where id = p_sale_id) then
    raise exception 'sale not found';
  end if;

  -- Lock the referenced books (stable order) before restoring stock, same
  -- concurrency rationale as create_sale's row locking.
  perform 1
  from books
  where id in (select book_id from sale_items where sale_id = p_sale_id)
  order by id
  for update;

  for v_item in select book_id, quantity from sale_items where sale_id = p_sale_id
  loop
    update books set remaining_stock = remaining_stock + v_item.quantity where id = v_item.book_id;
  end loop;

  delete from sale_items where sale_id = p_sale_id;
  delete from sales where id = p_sale_id;
end;
$$;

revoke all on function delete_sale(uuid) from public, anon;
grant execute on function delete_sale(uuid) to authenticated;
