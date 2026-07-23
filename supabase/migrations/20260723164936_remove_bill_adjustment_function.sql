create function public.remove_bill_adjustment(
  p_bill_id uuid,
  p_adjustment_id uuid
)
returns table (
  removed_adjustment_id uuid
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

  applicable_item_ids uuid[];

  item_subtotal bigint;
  existing_adjustment_total bigint;
  calculated_total_after_removal bigint;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      using
        errcode = '42501',
        message =
          'Authentication is required.';
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
          'The bill must be reopened before adjustments can be removed.';
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

  select coalesce(
    sum(item.line_total_sen::bigint),
    0
  )
  into item_subtotal
  from public.bill_items as item
  where item.bill_id = p_bill_id;

  select coalesce(
    sum(adjustment.amount_sen::bigint),
    0
  )
  into existing_adjustment_total
  from public.bill_adjustments
    as adjustment
  where adjustment.bill_id =
    p_bill_id;

  calculated_total_after_removal :=
    item_subtotal
    + existing_adjustment_total
    - target_adjustment.amount_sen::bigint;

  if calculated_total_after_removal < 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Removing this adjustment would reduce the calculated receipt total below zero.';
  end if;

  select coalesce(
    array_agg(
      applicable_item.item_id
      order by applicable_item.item_id
    ),
    array[]::uuid[]
  )
  into applicable_item_ids
  from public.adjustment_applicable_items
    as applicable_item
  where applicable_item.bill_id =
      p_bill_id
    and applicable_item.adjustment_id =
      p_adjustment_id;

  select participant.id
  into owner_participant_id
  from public.participants
    as participant
  where participant.bill_id =
      p_bill_id
    and participant.is_owner = true
    and participant.linked_user_id =
      current_user_id;

  delete from public.bill_adjustments
  where bill_id = p_bill_id
    and id = p_adjustment_id;

  if not found then
    raise exception
      using
        errcode = '40001',
        message =
          'The adjustment changed before it could be removed.';
  end if;

  insert into public.audit_events (
    bill_id,
    actor_type,
    actor_user_id,
    actor_participant_id,
    event_type,
    before_state
  )
  values (
    p_bill_id,
    'user',
    current_user_id,
    owner_participant_id,
    'adjustment.deleted',
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
      target_adjustment.calculation_base_mode,
      'manualAmountSen',
      target_adjustment.manual_amount_sen,
      'amountSource',
      target_adjustment.amount_source,
      'allocationMethod',
      target_adjustment.allocation_method,
      'appliesToAllItems',
      target_adjustment.applies_to_all_items,
      'applicableItemIds',
      to_jsonb(applicable_item_ids),
      'sortOrder',
      target_adjustment.sort_order
    )
  );

  return query
  select target_adjustment.id;
end;
$$;

revoke all
  on function public.remove_bill_adjustment(
    uuid,
    uuid
  )
  from public, anon;

grant execute
  on function public.remove_bill_adjustment(
    uuid,
    uuid
  )
  to authenticated;