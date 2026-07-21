create or replace function public.add_bill_rate_adjustment(
  p_bill_id uuid,
  p_type text,
  p_label text,
  p_rate_basis_points integer,
  p_rounding_mode text,
  p_calculation_base_mode text
)
returns table (
  adjustment_id uuid,
  calculated_amount_sen integer
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

  numerator bigint;
  quotient bigint;
  remainder bigint;
  rounded_magnitude bigint;
  computed_amount bigint;
  calculated_receipt_total bigint;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      using
        errcode = '42501',
        message = 'Authentication is required.';
  end if;

  if p_type not in (
    'discount',
    'service_charge',
    'tax',
    'other'
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'Unsupported rate adjustment type.';
  end if;

  if
    p_label is null
    or length(btrim(p_label)) = 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Adjustment label is required.';
  end if;

  if
    p_rate_basis_points is null
    or p_rate_basis_points = 0
    or abs(
      p_rate_basis_points::bigint
    ) > 10000
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Rate must be between 0.01 and 100 percent.';
  end if;

  if
    p_type = 'discount'
    and p_rate_basis_points > 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Discount rates must be negative.';
  end if;

  if
    p_type <> 'discount'
    and p_rate_basis_points < 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Charge and tax rates must be positive.';
  end if;

  if p_rounding_mode not in (
    'down',
    'half_up',
    'up'
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'Unsupported rate rounding mode.';
  end if;

  if
    p_calculation_base_mode <>
    'item_subtotal'
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Unsupported calculation base.';
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
          'The bill must be reopened before adjustments can be added.';
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
          'Add at least one item before adding a percentage adjustment.';
  end if;

  numerator :=
    item_subtotal *
    abs(p_rate_basis_points::bigint);

  quotient := numerator / 10000;
  remainder := numerator % 10000;

  if remainder = 0 then
    rounded_magnitude := quotient;
  elsif p_rounding_mode = 'down' then
    rounded_magnitude := quotient;
  elsif p_rounding_mode = 'up' then
    rounded_magnitude :=
      quotient + 1;
  elsif remainder * 2 >= 10000 then
    rounded_magnitude :=
      quotient + 1;
  else
    rounded_magnitude := quotient;
  end if;

  computed_amount :=
    case
      when rounded_magnitude = 0
        then 0
      when p_rate_basis_points < 0
        then -rounded_magnitude
      else rounded_magnitude
    end;

  if
    computed_amount <
      -2147483648::bigint
    or computed_amount >
      2147483647::bigint
  then
    raise exception
      using
        errcode = '22003',
        message =
          'Calculated adjustment exceeds integer storage.';
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
    computed_amount;

  if calculated_receipt_total < 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Adjustments cannot reduce the calculated receipt total below zero.';
  end if;

  select
    coalesce(max(sort_order), -1) + 1
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
    p_type,
    btrim(p_label),
    computed_amount::integer,
    'rate',
    p_rate_basis_points,
    p_rounding_mode,
    p_calculation_base_mode,
    null,
    'calculated',
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
      p_type,
      'label',
      btrim(p_label),
      'calculationMethod',
      'rate',
      'rateBasisPoints',
      p_rate_basis_points,
      'roundingMode',
      p_rounding_mode,
      'calculationBaseMode',
      p_calculation_base_mode,
      'calculationBaseSen',
      item_subtotal,
      'amountSen',
      computed_amount,
      'allocationMethod',
      'proportional',
      'appliesToAllItems',
      true,
      'sortOrder',
      next_sort_order
    )
  );

  return query
  select
    new_adjustment_id,
    computed_amount::integer;
end;
$$;

revoke all
  on function public.add_bill_rate_adjustment(
    uuid,
    text,
    text,
    integer,
    text,
    text
  )
  from public, anon;

grant execute
  on function public.add_bill_rate_adjustment(
    uuid,
    text,
    text,
    integer,
    text,
    text
  )
  to authenticated;