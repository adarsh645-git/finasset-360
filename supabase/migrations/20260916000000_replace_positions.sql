-- redesign-data-model, ticket 5: replace a Stocks Holding's Positions in one
-- call (design.md D5). One function call is one transaction, so a failed
-- insert rolls the delete back and the old list stays.
--
-- security invoker: RLS applies, so a User can only replace Positions of their
-- own Holding (the insert's user_id must equal auth.uid()).

create function public.replace_positions(p_holding_id uuid, p_positions jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.position where holding_id = p_holding_id;

  insert into public.position
    (user_id, holding_id, ticker, shares, avg_cost, hand_price, price_as_of, sector, name)
  select
    auth.uid(), p_holding_id, p.ticker, p.shares, p.avg_cost, p.hand_price, p.price_as_of, p.sector, p.name
  from jsonb_to_recordset(p_positions) as p(
    ticker text, shares numeric, avg_cost numeric, hand_price numeric,
    price_as_of date, sector text, name text
  );
end;
$$;

revoke all on function public.replace_positions(uuid, jsonb) from public, anon;
grant execute on function public.replace_positions(uuid, jsonb) to authenticated;
