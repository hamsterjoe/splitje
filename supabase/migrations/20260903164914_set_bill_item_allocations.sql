create function public.set_bill_item_allocations(
  p_bill_id uuid,
  p_item_id uuid,
  p_participant_ids uuid[]
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

  requested_participant_count integer;
  ordered_participant_ids uuid[];
  participant_count integer;

  base_share_sen bigint;
  remainder_participant_count integer;
  allocation_index integer;
  current_participant_id uuid;
  assigned_amount_sen bigint;

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

  select count(distinct requested.id)
  into requested_participant_count
  from unnest(
    coalesce(p_participant_ids, array[]::uuid[])
  ) as requested(id);

  -- Deterministic remainder order matches the domain engine:
  -- participants ordered by id; the first `remainder` receive +1 sen.
  select coalesce(
    array_agg(
      participant.id
      order by participant.id
    ),
    array[]::uuid[]
  )
  into ordered_participant_ids
  from public.participants as participant
  where participant.bill_id = p_bill_id
    and participant.id in (
      select distinct requested.id
      from unnest(
        coalesce(p_participant_ids, array[]::uuid[])
      ) as requested(id)
    );

  participant_count := coalesce(
    array_length(ordered_participant_ids, 1),
    0
  );

  if
    participant_count <>
    requested_participant_count
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Every assigned person must belong to this bill.';
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

  if participant_count = 1 then
    insert into public.item_allocations (
      bill_id,
      item_id,
      participant_id,
      allocation_type,
      amount_sen,
      remainder_sen
    )
    values (
      p_bill_id,
      p_item_id,
      ordered_participant_ids[1],
      'entire',
      target_item.line_total_sen,
      0
    );
  elsif participant_count > 1 then
    base_share_sen :=
      target_item.line_total_sen
      / participant_count;

    remainder_participant_count :=
      target_item.line_total_sen
      - base_share_sen * participant_count;

    allocation_index := 0;

    foreach current_participant_id in array ordered_participant_ids
    loop
      allocation_index := allocation_index + 1;

      assigned_amount_sen :=
        base_share_sen
        + case
            when allocation_index <= remainder_participant_count
              then 1
            else 0
          end;

      insert into public.item_allocations (
        bill_id,
        item_id,
        participant_id,
        allocation_type,
        amount_sen,
        remainder_sen
      )
      values (
        p_bill_id,
        p_item_id,
        current_participant_id,
        'equal',
        assigned_amount_sen,
        case
          when allocation_index <= remainder_participant_count
            then 1
          else 0
        end
      );
    end loop;
  end if;

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
      'allocations', previous_allocations
    ),
    jsonb_build_object(
      'itemId', p_item_id,
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
    uuid[]
  )
  from public, anon;

grant execute
  on function public.set_bill_item_allocations(
    uuid,
    uuid,
    uuid[]
  )
  to authenticated;