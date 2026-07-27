create function public.rename_bill_participant(
  p_bill_id uuid,
  p_participant_id uuid,
  p_display_name text
)
returns table (
  updated_participant_id uuid
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

  resolved_display_name text;
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
    p_display_name is null
    or length(btrim(p_display_name)) = 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Participant name is required.';
  end if;

  resolved_display_name :=
    btrim(p_display_name);

  if length(resolved_display_name) > 100 then
    raise exception
      using
        errcode = '22023',
        message =
          'Participant name cannot exceed 100 characters.';
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
          'The bill must be reopened before participants can be renamed.';
  end if;

  select participant.*
  into target_participant
  from public.participants
    as participant
  where participant.bill_id =
      p_bill_id
    and participant.id =
      p_participant_id
  for update;

  if not found then
    raise exception
      using
        errcode = '42501',
        message =
          'The participant is not available.';
  end if;

  if target_participant.display_name =
    resolved_display_name
  then
    return query
    select target_participant.id;

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

  update public.participants
  set display_name = resolved_display_name
  where bill_id = p_bill_id
    and id = p_participant_id;

  if not found then
    raise exception
      using
        errcode = '40001',
        message =
          'The participant changed before the name could be updated.';
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
    'participant.updated',
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
    ),
    jsonb_build_object(
      'participantId',
      target_participant.id,
      'displayName',
      resolved_display_name,
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

  return query
  select target_participant.id;
end;
$$;

revoke all
  on function public.rename_bill_participant(
    uuid,
    uuid,
    text
  )
  from public, anon;

grant execute
  on function public.rename_bill_participant(
    uuid,
    uuid,
    text
  )
  to authenticated;
