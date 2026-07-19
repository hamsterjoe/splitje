create or replace function public.add_bill_participant(
  p_bill_id uuid,
  p_display_name text
)
returns table (
  participant_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid;
  new_participant_id uuid;
  owner_participant_id uuid;
  next_sort_order integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      using
        errcode = '42501',
        message = 'Authentication is required.';
  end if;

  if
    p_display_name is null
    or length(btrim(p_display_name)) = 0
  then
    raise exception
      using
        errcode = '22023',
        message = 'Participant name is required.';
  end if;

  if length(btrim(p_display_name)) > 100 then
    raise exception
      using
        errcode = '22023',
        message =
          'Participant name cannot exceed 100 characters.';
  end if;

  /*
   * Lock the owner-visible bill row so concurrent participant
   * additions receive a stable sequential sort order.
   *
   * RLS and the explicit owner predicate both prevent a different
   * authenticated user from accessing the bill.
   */
  perform 1
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

  select
    coalesce(max(sort_order), -1) + 1
  into next_sort_order
  from public.participants
  where bill_id = p_bill_id;

  select id
  into owner_participant_id
  from public.participants
  where bill_id = p_bill_id
    and is_owner = true
    and linked_user_id = current_user_id;

  insert into public.participants (
    bill_id,
    display_name,
    linked_user_id,
    is_owner,
    sort_order
  )
  values (
    p_bill_id,
    btrim(p_display_name),
    null,
    false,
    next_sort_order
  )
  returning id
  into new_participant_id;

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
    'participant.created',
    jsonb_build_object(
      'participantId', new_participant_id,
      'displayName', btrim(p_display_name),
      'sortOrder', next_sort_order
    )
  );

  return query
  select new_participant_id;
end;
$$;

revoke all
  on function public.add_bill_participant(
    uuid,
    text
  )
  from public, anon;

grant execute
  on function public.add_bill_participant(
    uuid,
    text
  )
  to authenticated;