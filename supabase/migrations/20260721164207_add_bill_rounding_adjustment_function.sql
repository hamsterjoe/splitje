create or replace function public.add_bill_rounding_adjustment(
  p_bill_id uuid,
  p_amount_sen integer
)
returns table (
  adjustment_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_bill_status text;
  owner_participant_id uuid;
  new_adjustment_id uuid;
  next_sort_order integer;

  item_count bigint;
  item_subtotal bigint;
  existing_adjustment_total bigint;
  calculated_receipt_total bigint;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      using
        errcode = '42501',
        message =
          'Authentication is required.';
  end if;

  if
    p_amount_sen is null
    or p_amount_sen = 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Rounding amount must be non-zero integer sen.';
  end if;

  select status
  into current_bill_status
  from public.bills
  where id = p_bill_id
    and owner_user_id =
      current_user_id
  for update;

  if not found then
    raise exception
      using
        errcode = '42501',
        message =
          'The bill is not available.';
  end if;

  if current_bill_status not in (
    'draft',
    'open'
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'The bill must be reopened before rounding can be added.';
  end if;

  select
    count(*),
    coalesce(
      sum(line_total_sen::bigint),
      0
    )
  into
    item_count,
    item_subtotal
  from public.bill_items
  where bill_id = p_bill_id;

  if item_count = 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Add at least one item before adding rounding.';
  end if;

  select
    coalesce(
      sum(amount_sen::bigint),
      0
    )
  into existing_adjustment_total
  from public.bill_adjustments
  where bill_id = p_bill_id;

  calculated_receipt_total :=
    item_subtotal +
    existing_adjustment_total +
    p_amount_sen::bigint;

  if calculated_receipt_total < 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Rounding cannot reduce the calculated receipt total below zero.';
  end if;

  select
    coalesce(
      max(sort_order),
      -1
    ) + 1
  into next_sort_order
  from public.bill_adjustments
  where bill_id = p_bill_id;

  select id
  into owner_participant_id
  from public.participants
  where bill_id = p_bill_id
    and is_owner = true
    and linked_user_id =
      current_user_id;

  insert into public.bill_adjustments (
    bill_id,
    type,
    label,
    amount_sen,
    calculation_method,
    rate_basis_points,
    rounding_mode,
    calculation_base_mode,
    manual_amount_sen,
    amount_source,
    allocation_method,
    applies_to_all_items,
    sort_order
  )
  values (
    p_bill_id,
    'rounding',
    'Rounding',
    p_amount_sen,
    'fixed',
    null,
    null,
    null,
    null,
    'manual',
    'proportional',
    true,
    next_sort_order
  )
  returning id
  into new_adjustment_id;

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
    'adjustment.created',
    jsonb_build_object(
      'adjustmentId',
      new_adjustment_id,
      'type',
      'rounding',
      'label',
      'Rounding',
      'calculationMethod',
      'fixed',
      'amountSen',
      p_amount_sen,
      'allocationMethod',
      'proportional',
      'appliesToAllItems',
      true,
      'sortOrder',
      next_sort_order
    )
  );

  return query
  select new_adjustment_id;
end;
$$;

revoke all
  on function public.add_bill_rounding_adjustment(
    uuid,
    integer
  )
  from public, anon;

grant execute
  on function public.add_bill_rounding_adjustment(
    uuid,
    integer
  )
  to authenticated;