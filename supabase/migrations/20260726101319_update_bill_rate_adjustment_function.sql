create function public.update_bill_rate_adjustment(
  p_bill_id uuid,
  p_adjustment_id uuid,
  p_label text,
  p_rate_basis_points integer,
  p_applies_to_all_items boolean,
  p_applicable_item_ids uuid[]
)
returns table (
  updated_adjustment_id uuid,
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

  target_adjustment
    public.bill_adjustments%rowtype;

  resolved_label text;
  signed_rate_basis_points integer;

  full_item_count bigint;
  full_item_subtotal bigint;

  supplied_item_count bigint;
  distinct_item_count bigint;
  matched_item_count bigint;

  previous_item_ids uuid[];
  canonical_item_ids uuid[];

  calculation_base bigint;
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
        message =
          'Authentication is required.';
  end if;

  if
    p_rate_basis_points is null
    or p_rate_basis_points <= 0
    or p_rate_basis_points > 10000
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Rate must be between 0.01 and 100 percent.';
  end if;

  if p_applies_to_all_items is null then
    raise exception
      using
        errcode = '22023',
        message =
          'Adjustment item scope is required.';
  end if;

  if
    p_applies_to_all_items
    and coalesce(
      cardinality(
        p_applicable_item_ids
      ),
      0
    ) <> 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'All-item adjustments cannot contain selected item IDs.';
  end if;

  if
    not p_applies_to_all_items
    and coalesce(
      cardinality(
        p_applicable_item_ids
      ),
      0
    ) = 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Select at least one applicable item.';
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
          'The bill must be reopened before adjustments can be edited.';
  end if;

  select adjustment.*
  into target_adjustment
  from public.bill_adjustments
    as adjustment
  where adjustment.bill_id =
      p_bill_id
    and adjustment.id =
      p_adjustment_id
  for update;

  if not found then
    raise exception
      using
        errcode = '42501',
        message =
          'The adjustment is not available.';
  end if;

  if
    target_adjustment.calculation_method
      <> 'rate'
    or target_adjustment.type =
      'rounding'
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Only percentage adjustments can be edited through this workflow.';
  end if;

  if target_adjustment.type not in (
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
    target_adjustment.rounding_mode
      <> 'half_up'
    or target_adjustment
      .calculation_base_mode
      <> 'item_subtotal'
  then
    raise exception
      using
        errcode = '22023',
        message =
          'This percentage adjustment uses an unsupported calculation configuration.';
  end if;

  if exists (
    select 1
    from public.adjustment_allocations
      as allocation
    where allocation.bill_id =
        p_bill_id
      and allocation.adjustment_id =
        p_adjustment_id
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'Remove this adjustment''s allocations before editing it.';
  end if;

  resolved_label :=
    coalesce(
      nullif(
        btrim(p_label),
        ''
      ),
      case target_adjustment.type
        when 'discount'
          then 'Discount'
        when 'service_charge'
          then 'Service charge'
        when 'tax'
          then 'Tax / SST'
        when 'other'
          then 'Other fee'
      end
    );

  signed_rate_basis_points :=
    case
      when target_adjustment.type =
        'discount'
        then -p_rate_basis_points
      else p_rate_basis_points
    end;

  select
    count(*),
    coalesce(
      sum(item.line_total_sen::bigint),
      0
    )
  into
    full_item_count,
    full_item_subtotal
  from public.bill_items as item
  where item.bill_id = p_bill_id;

  if full_item_count = 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Add at least one item before editing a percentage adjustment.';
  end if;

  if p_applies_to_all_items then
    calculation_base :=
      full_item_subtotal;

    canonical_item_ids := null;
  else
    select
      count(*),
      count(distinct selected.item_id)
    into
      supplied_item_count,
      distinct_item_count
    from unnest(
      p_applicable_item_ids
    ) as selected(item_id);

    if
      supplied_item_count <>
      distinct_item_count
    then
      raise exception
        using
          errcode = '22023',
          message =
            'Applicable items must be unique.';
    end if;

    select array_agg(
      selected.item_id
      order by selected.item_id
    )
    into canonical_item_ids
    from unnest(
      p_applicable_item_ids
    ) as selected(item_id);

    select
      count(*),
      coalesce(
        sum(item.line_total_sen::bigint),
        0
      )
    into
      matched_item_count,
      calculation_base
    from public.bill_items as item
    where item.bill_id = p_bill_id
      and item.id = any(
        canonical_item_ids
      );

    if
      matched_item_count <>
      supplied_item_count
    then
      raise exception
        using
          errcode = '22023',
          message =
            'An applicable item does not exist in this bill.';
    end if;
  end if;

  numerator :=
    calculation_base *
    p_rate_basis_points::bigint;

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
      when signed_rate_basis_points < 0
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
    + existing_adjustment_total
    - target_adjustment.amount_sen::bigint
    + computed_amount;

  if calculated_receipt_total < 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Updating this adjustment would reduce the calculated receipt total below zero.';
  end if;

  select coalesce(
    array_agg(
      applicable_item.item_id
      order by applicable_item.item_id
    ),
    array[]::uuid[]
  )
  into previous_item_ids
  from public.adjustment_applicable_items
    as applicable_item
  where applicable_item.bill_id =
      p_bill_id
    and applicable_item.adjustment_id =
      p_adjustment_id;

  if
    target_adjustment.label =
      resolved_label
    and target_adjustment
      .rate_basis_points =
      signed_rate_basis_points
    and target_adjustment.amount_sen =
      computed_amount
    and target_adjustment
      .applies_to_all_items =
      p_applies_to_all_items
    and previous_item_ids =
      coalesce(
        canonical_item_ids,
        array[]::uuid[]
      )
  then
    return query
    select
      target_adjustment.id,
      computed_amount::integer;

    return;
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

  update public.bill_adjustments
  set
    label = resolved_label,
    amount_sen =
      computed_amount::integer,
    rate_basis_points =
      signed_rate_basis_points,
    manual_amount_sen = null,
    amount_source = 'calculated',
    applies_to_all_items =
      p_applies_to_all_items
  where bill_id = p_bill_id
    and id = p_adjustment_id;

  if not found then
    raise exception
      using
        errcode = '40001',
        message =
          'The adjustment changed before it could be updated.';
  end if;

  delete from
    public.adjustment_applicable_items
  where bill_id = p_bill_id
    and adjustment_id =
      p_adjustment_id;

  if not p_applies_to_all_items then
    insert into
      public.adjustment_applicable_items (
        bill_id,
        adjustment_id,
        item_id
      )
    select
      p_bill_id,
      p_adjustment_id,
      selected.item_id
    from unnest(
      canonical_item_ids
    ) as selected(item_id);
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
      target_adjustment.id,
      'type',
      target_adjustment.type,
      'label',
      target_adjustment.label,
      'amountSen',
      target_adjustment.amount_sen,
      'calculationMethod',
      target_adjustment.calculation_method,
      'rateBasisPoints',
      target_adjustment.rate_basis_points,
      'roundingMode',
      target_adjustment.rounding_mode,
      'calculationBaseMode',
      target_adjustment
        .calculation_base_mode,
      'amountSource',
      target_adjustment.amount_source,
      'allocationMethod',
      target_adjustment.allocation_method,
      'appliesToAllItems',
      target_adjustment
        .applies_to_all_items,
      'applicableItemIds',
      to_jsonb(
        previous_item_ids
      ),
      'sortOrder',
      target_adjustment.sort_order
    ),
    jsonb_build_object(
      'adjustmentId',
      target_adjustment.id,
      'type',
      target_adjustment.type,
      'label',
      resolved_label,
      'amountSen',
      computed_amount,
      'calculationMethod',
      'rate',
      'rateBasisPoints',
      signed_rate_basis_points,
      'roundingMode',
      'half_up',
      'calculationBaseMode',
      'item_subtotal',
      'calculationBaseSen',
      calculation_base,
      'amountSource',
      'calculated',
      'allocationMethod',
      target_adjustment.allocation_method,
      'appliesToAllItems',
      p_applies_to_all_items,
      'applicableItemIds',
      coalesce(
        to_jsonb(
          canonical_item_ids
        ),
        '[]'::jsonb
      ),
      'sortOrder',
      target_adjustment.sort_order
    )
  );

  return query
  select
    target_adjustment.id,
    computed_amount::integer;
end;
$$;

revoke all
  on function public.update_bill_rate_adjustment(
    uuid,
    uuid,
    text,
    integer,
    boolean,
    uuid[]
  )
  from public, anon;

grant execute
  on function public.update_bill_rate_adjustment(
    uuid,
    uuid,
    text,
    integer,
    boolean,
    uuid[]
  )
  to authenticated;