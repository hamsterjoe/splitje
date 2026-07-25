create function public.update_fixed_bill_adjustment(
  p_bill_id uuid,
  p_adjustment_id uuid,
  p_label text,
  p_amount_sen integer
)
returns table (
  updated_adjustment_id uuid
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
  updated_amount_sen integer;

  item_subtotal bigint;
  existing_adjustment_total bigint;
  calculated_total_after_update bigint;
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
    or p_amount_sen < 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Adjustment amount must be zero or positive.';
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
      <> 'fixed'
    or target_adjustment.type =
      'rounding'
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Only fixed non-rounding adjustments can be edited through this workflow.';
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

  updated_amount_sen :=
    case
      when
        target_adjustment.type =
          'discount'
        and p_amount_sen <> 0
        then -p_amount_sen
      else p_amount_sen
    end;

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

  calculated_total_after_update :=
    item_subtotal
    + existing_adjustment_total
    - target_adjustment.amount_sen::bigint
    + updated_amount_sen::bigint;

  if calculated_total_after_update < 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'Updating this adjustment would reduce the calculated receipt total below zero.';
  end if;

  if
    target_adjustment.label =
      resolved_label
    and target_adjustment.amount_sen =
      updated_amount_sen
  then
    return query
    select target_adjustment.id;

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
      updated_amount_sen,
    manual_amount_sen = null,
    amount_source = 'manual'
  where bill_id = p_bill_id
    and id = p_adjustment_id;

  if not found then
    raise exception
      using
        errcode = '40001',
        message =
          'The adjustment changed before it could be updated.';
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
      'amountSource',
      target_adjustment.amount_source,
      'allocationMethod',
      target_adjustment.allocation_method,
      'appliesToAllItems',
      target_adjustment.applies_to_all_items,
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
      updated_amount_sen,
      'calculationMethod',
      'fixed',
      'amountSource',
      'manual',
      'allocationMethod',
      target_adjustment.allocation_method,
      'appliesToAllItems',
      target_adjustment.applies_to_all_items,
      'sortOrder',
      target_adjustment.sort_order
    )
  );

  return query
  select target_adjustment.id;
end;
$$;

revoke all
  on function public.update_fixed_bill_adjustment(
    uuid,
    uuid,
    text,
    integer
  )
  from public, anon;

grant execute
  on function public.update_fixed_bill_adjustment(
    uuid,
    uuid,
    text,
    integer
  )
  to authenticated;