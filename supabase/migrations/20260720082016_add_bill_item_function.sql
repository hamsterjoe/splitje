create or replace function public.add_bill_item(
  p_bill_id uuid,
  p_description text,
  p_quantity integer,
  p_unit_price_sen integer,
  p_line_total_sen integer
)
returns table (
  item_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_bill_status text;
  owner_participant_id uuid;
  new_item_id uuid;
  next_sort_order integer;
  calculated_line_total bigint;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      using
        errcode = '42501',
        message = 'Authentication is required.';
  end if;

  if
    p_description is null
    or length(btrim(p_description)) = 0
  then
    raise exception
      using
        errcode = '22023',
        message = 'Item description is required.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Item quantity must be a positive integer.';
  end if;

  if
    p_unit_price_sen is null
    or p_unit_price_sen < 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Unit price must be non-negative integer sen.';
  end if;

  if
    p_line_total_sen is null
    or p_line_total_sen < 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Line total must be non-negative integer sen.';
  end if;

  select status
  into current_bill_status
  from public.bills
  where id = p_bill_id
    and owner_user_id = current_user_id
  for update;

  if not found then
    raise exception
      using
        errcode = '42501',
        message = 'The bill is not available.';
  end if;

  if current_bill_status not in (
    'draft',
    'open'
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'The bill must be reopened before items can be added.';
  end if;

  calculated_line_total :=
    p_quantity::bigint *
    p_unit_price_sen::bigint;

  if
    calculated_line_total >
    2147483647
  then
    raise exception
      using
        errcode = '22003',
        message =
          'Line total exceeds integer storage.';
  end if;

  if
    calculated_line_total <>
    p_line_total_sen::bigint
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Line total does not match quantity multiplied by unit price.';
  end if;

  select
    coalesce(max(sort_order), -1) + 1
  into next_sort_order
  from public.bill_items
  where bill_id = p_bill_id;

  select id
  into owner_participant_id
  from public.participants
  where bill_id = p_bill_id
    and is_owner = true
    and linked_user_id = current_user_id;

  insert into public.bill_items (
    bill_id,
    description,
    quantity,
    unit_price_sen,
    manual_line_total_sen,
    line_total_sen,
    sort_order
  )
  values (
    p_bill_id,
    btrim(p_description),
    p_quantity,
    p_unit_price_sen,
    null,
    p_line_total_sen,
    next_sort_order
  )
  returning id
  into new_item_id;

  insert into public.audit_events (
    bill_id,
    actor_type,
    actor_user_id,
    actor_participant_id,
    event_type,
    after_state
  )
  values (
    p_bill_id,
    'user',
    current_user_id,
    owner_participant_id,
    'item.created',
    jsonb_build_object(
      'itemId', new_item_id,
      'description', btrim(p_description),
      'quantity', p_quantity,
      'unitPriceSen', p_unit_price_sen,
      'lineTotalSen', p_line_total_sen,
      'sortOrder', next_sort_order
    )
  );

  return query
  select new_item_id;
end;
$$;

revoke all
  on function public.add_bill_item(
    uuid,
    text,
    integer,
    integer,
    integer
  )
  from public, anon;

grant execute
  on function public.add_bill_item(
    uuid,
    text,
    integer,
    integer,
    integer
  )
  to authenticated;