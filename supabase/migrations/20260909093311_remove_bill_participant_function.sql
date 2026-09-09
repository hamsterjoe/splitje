-- Extend item assignment with split modes.
-- Replaces the participant-ids-only version with a jsonb payload that
-- supports equal, quantity, percentage, and custom-amount splits.
-- Amounts are always computed or validated server-side against the
-- locked item row; clients supply intents and weights, never totals.

drop function if exists public.set_bill_item_allocations(uuid, uuid, uuid[]);

create function public.set_bill_item_allocations(
  p_bill_id uuid,
  p_item_id uuid,
  p_allocations jsonb
)
returns table (
  set_item_id uuid
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

  split_mode text;
  shares jsonb;

  share_participant_ids uuid[];
  share_weights bigint[];
  share_amounts_sen bigint[];

  distinct_participant_count integer;
  matched_participant_count integer;
  share_count integer;
  share_index integer;
  best_index integer;

  total_weight bigint;
  base_shares_sen bigint[];
  fractional_remainders bigint[];
  allocated_base_total_sen bigint;
  remaining_sen integer;
  remainder_recipient_indices integer[];

  final_amount_sen bigint;
  final_allocation_type text;
  final_quantity_share integer;
  final_percentage_basis_points integer;
  final_remainder_sen integer;

  previous_allocations jsonb;
  updated_allocations jsonb;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      using
        errcode = '42501',
        message =
          'Authentication is required.';
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
          'The bill must be reopened before item assignments can change.';
  end if;

  select item.*
  into target_item
  from public.bill_items as item
  where item.bill_id = p_bill_id
    and item.id = p_item_id
  for update;

  if not found then
    raise exception
      using
        errcode = '42501',
        message =
          'The item is not available.';
  end if;

  split_mode := p_allocations ->> 'mode';

  if
    split_mode is null
    or split_mode not in (
      'equal',
      'quantity',
      'percentage',
      'custom'
    )
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Choose a valid split mode.';
  end if;

  shares := p_allocations -> 'shares';

  if
    shares is null
    or jsonb_typeof(shares) <> 'array'
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Shares must be an array.';
  end if;

  -- Materialize shares into parallel arrays ordered by participant ID,
  -- matching the domain engine's canonical ordering.
  select
    coalesce(
      array_agg(
        (share_row.value ->> 'participantId')::uuid
        order by (share_row.value ->> 'participantId')::uuid
      ),
      array[]::uuid[]
    ),
    coalesce(
      array_agg(
        case
          when split_mode = 'quantity'
            then (share_row.value ->> 'quantityShare')::bigint
          when split_mode = 'percentage'
            then (share_row.value ->> 'percentageBasisPoints')::bigint
          when split_mode = 'equal'
            then 1::bigint
          else null
        end
        order by (share_row.value ->> 'participantId')::uuid
      ),
      array[]::bigint[]
    ),
    coalesce(
      array_agg(
        case
          when split_mode = 'custom'
            then (share_row.value ->> 'amountSen')::bigint
          else null
        end
        order by (share_row.value ->> 'participantId')::uuid
      ),
      array[]::bigint[]
    )
  into
    share_participant_ids,
    share_weights,
    share_amounts_sen
  from jsonb_array_elements(shares) as share_row(value);

  share_count := coalesce(
    array_length(share_participant_ids, 1),
    0
  );

  select count(distinct participant_id_value)
  into distinct_participant_count
  from unnest(share_participant_ids)
    as participant_id_value;

  if distinct_participant_count <> share_count then
    raise exception
      using
        errcode = '22023',
        message =
          'Each person can only appear once in an assignment.';
  end if;

  select count(*)
  into matched_participant_count
  from public.participants as participant
  where participant.bill_id = p_bill_id
    and participant.id = any (share_participant_ids);

  if matched_participant_count <> share_count then
    raise exception
      using
        errcode = '22023',
        message =
          'Every assigned person must belong to this bill.';
  end if;

  if split_mode = 'quantity' then
    for share_index in 1 .. share_count loop
      if
        share_weights[share_index] is null
        or share_weights[share_index] <= 0
        or share_weights[share_index] > 2147483647
      then
        raise exception
          using
            errcode = '22023',
            message =
              'Quantities must be positive whole numbers.';
      end if;
    end loop;
  end if;

  if split_mode = 'percentage' then
    for share_index in 1 .. share_count loop
      if
        share_weights[share_index] is null
        or share_weights[share_index] <= 0
        or share_weights[share_index] > 10000
      then
        raise exception
          using
            errcode = '22023',
            message =
              'Percentages must be between 0 and 100.';
      end if;
    end loop;

    select coalesce(sum(weight), 0)
    into total_weight
    from unnest(share_weights) as weight;

    if share_count > 0 and total_weight <> 10000 then
      raise exception
        using
          errcode = '22023',
          message =
            'Percentages must add up to exactly 100%.';
    end if;
  end if;

  if split_mode = 'custom' then
    for share_index in 1 .. share_count loop
      if
        share_amounts_sen[share_index] is null
        or share_amounts_sen[share_index] <= 0
        or share_amounts_sen[share_index] > 2147483647
      then
        raise exception
          using
            errcode = '22023',
            message =
              'Amounts must be positive whole sen.';
      end if;
    end loop;

    select coalesce(sum(amount), 0)
    into allocated_base_total_sen
    from unnest(share_amounts_sen) as amount;

    if allocated_base_total_sen > target_item.line_total_sen then
      raise exception
        using
          errcode = '22023',
          message =
            'Assigned amounts cannot exceed the item total.';
    end if;
  end if;

  -- Weighted modes (equal, quantity, percentage) distribute the full
  -- line total by largest remainder: participants are ordered by ID
  -- and the first `remaining` receive +1 sen, matching the domain
  -- engine's deterministic tie-break.
  if split_mode <> 'custom' and share_count > 0 then
    select coalesce(sum(weight), 0)
    into total_weight
    from unnest(share_weights) as weight;

    for share_index in 1 .. share_count loop
      base_shares_sen[share_index] :=
        (target_item.line_total_sen::bigint * share_weights[share_index])
        / total_weight;
      fractional_remainders[share_index] :=
        (target_item.line_total_sen::bigint * share_weights[share_index])
        % total_weight;
    end loop;

    select coalesce(sum(base_amount), 0)
    into allocated_base_total_sen
    from unnest(base_shares_sen) as base_amount;

    remaining_sen :=
      target_item.line_total_sen - allocated_base_total_sen;

    remainder_recipient_indices := array[]::integer[];

    while remaining_sen > 0 loop
      best_index := null;

      for share_index in 1 .. share_count loop
        if
          not (
            share_index = any (remainder_recipient_indices)
          )
        then
          if
            best_index is null
            or fractional_remainders[share_index] >
              fractional_remainders[best_index]
            or (
              fractional_remainders[share_index] =
                fractional_remainders[best_index]
              and share_participant_ids[share_index] <
                share_participant_ids[best_index]
            )
          then
            best_index := share_index;
          end if;
        end if;
      end loop;

      remainder_recipient_indices :=
        remainder_recipient_indices || best_index;
      remaining_sen := remaining_sen - 1;
    end loop;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'allocationId', allocation.id,
        'participantId', allocation.participant_id,
        'allocationType', allocation.allocation_type,
        'amountSen', allocation.amount_sen,
        'quantityShare', allocation.quantity_share,
        'percentageBasisPoints', allocation.percentage_basis_points,
        'remainderSen', allocation.remainder_sen
      )
      order by allocation.created_at, allocation.id
    ),
    '[]'::jsonb
  )
  into previous_allocations
  from public.item_allocations as allocation
  where allocation.bill_id = p_bill_id
    and allocation.item_id = p_item_id;

  delete from public.item_allocations as allocation
  where allocation.bill_id = p_bill_id
    and allocation.item_id = p_item_id;

  -- A single-person equal split is stored as an entire-item assignment.
  if split_mode = 'equal' and share_count = 1 then
    final_allocation_type := 'entire';
  else
    final_allocation_type := split_mode;
  end if;

  for share_index in 1 .. share_count loop
    if split_mode = 'custom' then
      final_amount_sen := share_amounts_sen[share_index];
      final_remainder_sen := 0;
    else
      final_amount_sen :=
        base_shares_sen[share_index]
        + case
            when share_index = any (remainder_recipient_indices)
              then 1
            else 0
          end;
      final_remainder_sen :=
        case
          when share_index = any (remainder_recipient_indices)
            then 1
          else 0
        end;
    end if;

    final_quantity_share :=
      case
        when split_mode = 'quantity'
          then share_weights[share_index]::integer
        else null
      end;

    final_percentage_basis_points :=
      case
        when split_mode = 'percentage'
          then share_weights[share_index]::integer
        else null
      end;

    insert into public.item_allocations (
      bill_id,
      item_id,
      participant_id,
      allocation_type,
      amount_sen,
      quantity_share,
      percentage_basis_points,
      remainder_sen
    )
    values (
      p_bill_id,
      p_item_id,
      share_participant_ids[share_index],
      final_allocation_type,
      final_amount_sen::integer,
      final_quantity_share,
      final_percentage_basis_points,
      final_remainder_sen
    );
  end loop;

  select participant.id
  into owner_participant_id
  from public.participants as participant
  where participant.bill_id = p_bill_id
    and participant.is_owner = true
    and participant.linked_user_id =
      current_user_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'allocationId', allocation.id,
        'participantId', allocation.participant_id,
        'allocationType', allocation.allocation_type,
        'amountSen', allocation.amount_sen,
        'quantityShare', allocation.quantity_share,
        'percentageBasisPoints', allocation.percentage_basis_points,
        'remainderSen', allocation.remainder_sen
      )
      order by allocation.created_at, allocation.id
    ),
    '[]'::jsonb
  )
  into updated_allocations
  from public.item_allocations as allocation
  where allocation.bill_id = p_bill_id
    and allocation.item_id = p_item_id;

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
    'item.allocations_updated',
    jsonb_build_object(
      'itemId', p_item_id,
      'mode', split_mode,
      'allocations', previous_allocations
    ),
    jsonb_build_object(
      'itemId', p_item_id,
      'mode', split_mode,
      'allocations', updated_allocations
    )
  );

  return query
  select p_item_id;
end;
$$;

revoke all
  on function public.set_bill_item_allocations(
    uuid,
    uuid,
    jsonb
  )
  from public, anon;

grant execute
  on function public.set_bill_item_allocations(
    uuid,
    uuid,
    jsonb
  )
  to authenticated;
