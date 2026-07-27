create function public.update_bill_item(
  p_bill_id uuid,
  p_item_id uuid,
  p_description text,
  p_quantity integer,
  p_unit_price_sen integer,
  p_line_total_sen integer
)
returns table (
  updated_item_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_bill_status text;
  owner_participant_id uuid;

  target_item
    public.bill_items%rowtype;

  affected_adjustment
    public.bill_adjustments%rowtype;

  calculated_line_total bigint;
  full_item_subtotal bigint;
  calculation_base bigint;

  numerator bigint;
  quotient bigint;
  remainder bigint;
  rounded_magnitude bigint;
  computed_amount bigint;

  existing_adjustment_total bigint;
  calculated_receipt_total bigint;

  applicable_item_ids uuid[];
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
    p_description is null
    or length(
      btrim(p_description)
    ) = 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Item description is required.';
  end if;

  if
    p_quantity is null
    or p_quantity <= 0
  then
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

  calculated_line_total :=
    p_quantity::bigint
    * p_unit_price_sen::bigint;

  if
    calculated_line_total >
      2147483647::bigint
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

  select bill.status
  into current_bill_status
  from public.bills as bill
  where bill.id = p_bill_id
    and bill.owner_user_id =
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
          'The bill must be reopened before items can be edited.';
  end if;

  select item.*
  into target_item
  from public.bill_items
    as item
  where item.bill_id =
      p_bill_id
    and item.id = p_item_id
  for update;

  if not found then
    raise exception
      using
        errcode = '42501',
        message =
          'The item is not available.';
  end if;

  if
    target_item.description =
      btrim(p_description)
    and target_item.quantity =
      p_quantity
    and target_item
      .unit_price_sen =
      p_unit_price_sen
    and target_item
      .line_total_sen =
      p_line_total_sen
    and target_item
      .manual_line_total_sen
      is null
  then
    return query
    select target_item.id;

    return;
  end if;

  if exists (
    select 1
    from public.item_allocations
      as allocation
    where allocation.bill_id =
        p_bill_id
      and allocation.item_id =
        p_item_id
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'Remove this item''s allocations before editing it.';
  end if;

  if exists (
    select 1
    from public.adjustment_allocations
      as allocation
    join public.bill_adjustments
      as adjustment
      on adjustment.bill_id =
        allocation.bill_id
      and adjustment.id =
        allocation.adjustment_id
    where adjustment.bill_id =
        p_bill_id
      and adjustment
        .calculation_method =
        'rate'
      and (
        adjustment
          .applies_to_all_items
        or exists (
          select 1
          from public
            .adjustment_applicable_items
            as applicable_item
          where applicable_item
              .bill_id =
              p_bill_id
            and applicable_item
              .adjustment_id =
              adjustment.id
            and applicable_item
              .item_id =
              p_item_id
        )
      )
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'Remove affected adjustment allocations before editing this item.';
  end if;

  select participant.id
  into owner_participant_id
  from public.participants
    as participant
  where participant.bill_id =
      p_bill_id
    and participant.is_owner = true
    and participant.linked_user_id =
      current_user_id;

  update public.bill_items
  set
    description =
      btrim(p_description),
    quantity = p_quantity,
    unit_price_sen =
      p_unit_price_sen,
    manual_line_total_sen = null,
    line_total_sen =
      p_line_total_sen
  where bill_id = p_bill_id
    and id = p_item_id;

  if not found then
    raise exception
      using
        errcode = '40001',
        message =
          'The item changed before it could be updated.';
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
    'item.updated',
    jsonb_build_object(
      'itemId',
      target_item.id,
      'description',
      target_item.description,
      'quantity',
      target_item.quantity,
      'unitPriceSen',
      target_item
        .unit_price_sen,
      'manualLineTotalSen',
      target_item
        .manual_line_total_sen,
      'lineTotalSen',
      target_item
        .line_total_sen,
      'sortOrder',
      target_item.sort_order
    ),
    jsonb_build_object(
      'itemId',
      target_item.id,
      'description',
      btrim(p_description),
      'quantity',
      p_quantity,
      'unitPriceSen',
      p_unit_price_sen,
      'manualLineTotalSen',
      null,
      'lineTotalSen',
      p_line_total_sen,
      'sortOrder',
      target_item.sort_order
    )
  );

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
      and (
        adjustment
          .applies_to_all_items
        or exists (
          select 1
          from public
            .adjustment_applicable_items
            as applicable_item
          where applicable_item
              .bill_id =
              p_bill_id
            and applicable_item
              .adjustment_id =
              adjustment.id
            and applicable_item
              .item_id =
              p_item_id
        )
      )
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

    if affected_adjustment
      .applies_to_all_items
    then
      calculation_base :=
        full_item_subtotal;

      applicable_item_ids :=
        array[]::uuid[];
    else
      select coalesce(
        array_agg(
          applicable_item.item_id
          order by
            applicable_item.item_id
        ),
        array[]::uuid[]
      )
      into applicable_item_ids
      from public
        .adjustment_applicable_items
        as applicable_item
      where applicable_item.bill_id =
          p_bill_id
        and applicable_item
          .adjustment_id =
          affected_adjustment.id;

      if
        cardinality(
          applicable_item_ids
        ) = 0
      then
        raise exception
          using
            errcode = '22023',
            message =
              'An affected percentage adjustment has no applicable items.';
      end if;

      select coalesce(
        sum(
          item.line_total_sen::bigint
        ),
        0
      )
      into calculation_base
      from public
        .adjustment_applicable_items
        as applicable_item
      join public.bill_items
        as item
        on item.bill_id =
          applicable_item.bill_id
        and item.id =
          applicable_item.item_id
      where applicable_item.bill_id =
          p_bill_id
        and applicable_item
          .adjustment_id =
          affected_adjustment.id;
    end if;

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
          to_jsonb(
            applicable_item_ids
          ),
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
          to_jsonb(
            applicable_item_ids
          ),
          'sortOrder',
          affected_adjustment
            .sort_order
        )
      );
    end if;
  end loop;

  select coalesce(
    sum(
      adjustment.amount_sen::bigint
    ),
    0
  )
  into existing_adjustment_total
  from public.bill_adjustments
    as adjustment
  where adjustment.bill_id =
    p_bill_id;

  calculated_receipt_total :=
    full_item_subtotal
    + existing_adjustment_total;

  if calculated_receipt_total < 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Updating this item would reduce the calculated receipt total below zero.';
  end if;

  return query
  select target_item.id;
end;
$$;

revoke all
  on function public.update_bill_item(
    uuid,
    uuid,
    text,
    integer,
    integer,
    integer
  )
  from public, anon;

grant execute
  on function public.update_bill_item(
    uuid,
    uuid,
    text,
    integer,
    integer,
    integer
  )
  to authenticated;