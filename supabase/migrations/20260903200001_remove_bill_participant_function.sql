create function public.remove_bill_participant(
  p_bill_id uuid,
  p_participant_id uuid
)
returns table (
  removed_participant_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_bill_status text;
  owner_participant_id uuid;

  target_participant
    public.participants%rowtype;
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
          'The bill must be reopened before participants can be removed.';
  end if;

  select participant.*
  into target_participant
  from public.participants as participant
  where participant.bill_id = p_bill_id
    and participant.id = p_participant_id
  for update;

  if not found then
    raise exception
      using
        errcode = '42501',
        message =
          'The participant is not available.';
  end if;

  if target_participant.is_owner then
    raise exception
      using
        errcode = '22023',
        message =
          'The bill owner cannot be removed.';
  end if;

  if exists (
    select 1
    from public.item_allocations as allocation
    where allocation.bill_id = p_bill_id
      and allocation.participant_id =
        p_participant_id
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'Remove this person''s item assignments before removing them.';
  end if;

  if exists (
    select 1
    from public.adjustment_allocations as allocation
    where allocation.bill_id = p_bill_id
      and allocation.participant_id =
        p_participant_id
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'Remove this person''s adjustment allocations before removing them.';
  end if;

  select participant.id
  into owner_participant_id
  from public.participants as participant
  where participant.bill_id = p_bill_id
    and participant.is_owner = true
    and participant.linked_user_id =
      current_user_id;

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
    'participant.deleted',
    jsonb_build_object(
      'participantId',
      target_participant.id,
      'displayName',
      target_participant.display_name,
      'linkedUserId',
      target_participant.linked_user_id,
      'isOwner',
      target_participant.is_owner,
      'sortOrder',
      target_participant.sort_order,
      'colorToken',
      target_participant.color_token
    )
  );

  delete from public.participants
  where bill_id = p_bill_id
    and id = p_participant_id;

  if not found then
    raise exception
      using
        errcode = '40001',
        message =
          'The participant changed before they could be removed.';
  end if;

  return query
  select target_participant.id;
end;
$$;

revoke all
  on function public.remove_bill_participant(
    uuid,
    uuid
  )
  from public, anon;

grant execute
  on function public.remove_bill_participant(
    uuid,
    uuid
  )
  to authenticated;
