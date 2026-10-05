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

  affected_adjustment
    public.bill_adjustments%rowtype;

  full_item_subtotal bigint;
  calculation_base bigint;

  numerator bigint;
  quotient bigint;
  remainder bigint;
  rounded_magnitude bigint;
  computed_amount bigint;
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

  -- Adding an item grows the item subtotal, so every all-items rate
  -- adjustment is recalculated against the new base. Scoped rate
  -- adjustments cannot reference an item that did not exist when
  -- they were created, so they are untouched.
  select coalesce(
    sum(item.line_total_sen::bigint),
    0
  )
  into full_item_subtotal
  from public.bill_items as item
  where item.bill_id = p_bill_id;

  for affected_adjustment in
    select adjustment.*
    from public.bill_adjustments
      as adjustment
    where adjustment.bill_id =
        p_bill_id
      and adjustment
        .calculation_method =
        'rate'
      and adjustment
        .applies_to_all_items
    order by
      adjustment.sort_order,
      adjustment.id
    for update of adjustment
  loop
    if
      affected_adjustment.type =
        'rounding'
      or affected_adjustment
        .rate_basis_points
        is null
      or abs(
        affected_adjustment
          .rate_basis_points::bigint
      ) > 10000
      or affected_adjustment
        .rounding_mode <>
        'half_up'
      or affected_adjustment
        .calculation_base_mode <>
        'item_subtotal'
      or affected_adjustment
        .amount_source <>
        'calculated'
      or affected_adjustment
        .manual_amount_sen
        is not null
    then
      raise exception
        using
          errcode = '22023',
          message =
            'An affected percentage adjustment uses an unsupported calculation configuration.';
    end if;

    calculation_base :=
      full_item_subtotal;

    numerator :=
      calculation_base
      * abs(
        affected_adjustment
          .rate_basis_points::bigint
      );

    quotient :=
      numerator / 10000;

    remainder :=
      numerator % 10000;

    if
      remainder * 2 >= 10000
    then
      rounded_magnitude :=
        quotient + 1;
    else
      rounded_magnitude :=
        quotient;
    end if;

    computed_amount :=
      case
        when rounded_magnitude = 0
          then 0
        when affected_adjustment
          .rate_basis_points < 0
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
            'A recalculated adjustment exceeds integer storage.';
    end if;

    if
      affected_adjustment
        .amount_sen <>
        computed_amount
    then
      update public.bill_adjustments
      set
        amount_sen =
          computed_amount::integer,
        manual_amount_sen = null,
        amount_source =
          'calculated'
      where bill_id = p_bill_id
        and id =
          affected_adjustment.id;

      if not found then
        raise exception
          using
            errcode = '40001',
            message =
              'An affected adjustment changed before it could be updated.';
      end if;

      insert into public.audit_events (
        bill_id,
        actor_type,
        actor_user_id,
        actor_participant_id,
        event_type,
        before_state,
        after_state
      )
      values (
        p_bill_id,
        'user',
        current_user_id,
        owner_participant_id,
        'adjustment.updated',
        jsonb_build_object(
          'adjustmentId',
          affected_adjustment.id,
          'type',
          affected_adjustment.type,
          'label',
          affected_adjustment.label,
          'amountSen',
          affected_adjustment
            .amount_sen,
          'calculationMethod',
          affected_adjustment
            .calculation_method,
          'rateBasisPoints',
          affected_adjustment
            .rate_basis_points,
          'roundingMode',
          affected_adjustment
            .rounding_mode,
          'calculationBaseMode',
          affected_adjustment
            .calculation_base_mode,
          'amountSource',
          affected_adjustment
            .amount_source,
          'allocationMethod',
          affected_adjustment
            .allocation_method,
          'appliesToAllItems',
          affected_adjustment
            .applies_to_all_items,
          'applicableItemIds',
          to_jsonb(array[]::uuid[]),
          'sortOrder',
          affected_adjustment
            .sort_order
        ),
        jsonb_build_object(
          'adjustmentId',
          affected_adjustment.id,
          'type',
          affected_adjustment.type,
          'label',
          affected_adjustment.label,
          'amountSen',
          computed_amount,
          'calculationMethod',
          'rate',
          'rateBasisPoints',
          affected_adjustment
            .rate_basis_points,
          'roundingMode',
          'half_up',
          'calculationBaseMode',
          'item_subtotal',
          'calculationBaseSen',
          calculation_base,
          'amountSource',
          'calculated',
          'allocationMethod',
          affected_adjustment
            .allocation_method,
          'appliesToAllItems',
          affected_adjustment
            .applies_to_all_items,
          'applicableItemIds',
          to_jsonb(array[]::uuid[]),
          'sortOrder',
          affected_adjustment
            .sort_order
        )
      );
    end if;
  end loop;

  return query
  select new_item_id;
end;
$$;