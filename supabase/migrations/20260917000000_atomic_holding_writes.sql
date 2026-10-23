-- redesign-data-model review: two Holding writes that touched two tables in
-- separate statements now run as one function call, so one transaction.
--
-- Both are security invoker like replace_positions: RLS applies, so a User can
-- only change their own Holdings. A Holding RLS hides reads as missing and the
-- function raises, which the route reports as an error.

-- Edit a Stocks Holding: rename and replace its Positions together (design D5).
-- A failed Positions insert rolls the new name back.
create function public.update_stocks_holding(
  p_holding_id uuid,
  p_name text,
  p_description text,
  p_positions jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.holding
     set name = p_name, description = p_description
   where id = p_holding_id and asset_class = 'stocks' and archived_at is null;
  if not found then
    raise exception 'Holding not found' using errcode = 'P0002';
  end if;

  perform public.replace_positions(p_holding_id, p_positions);
end;
$$;

revoke all on function public.update_stocks_holding(uuid, text, text, jsonb) from public, anon;
grant execute on function public.update_stocks_holding(uuid, text, text, jsonb) to authenticated;

-- Archive a Holding and unlink the active loans financing it (design D9,
-- DM-26): never an archived Holding with a loan still linked to it.
create function public.archive_holding(p_holding_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.holding
     set archived_at = now()
   where id = p_holding_id and archived_at is null;
  if not found then
    raise exception 'Holding not found' using errcode = 'P0002';
  end if;

  update public.liability
     set linked_holding_id = null
   where linked_holding_id = p_holding_id and archived_at is null;
end;
$$;

revoke all on function public.archive_holding(uuid) from public, anon;
grant execute on function public.archive_holding(uuid) to authenticated;
