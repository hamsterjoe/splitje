create or replace function public.update_bill_printed_total(
  p_bill_id uuid,
  p_expected_row_version bigint,
  p_printed_total_sen integer
)
returns table (
  updated_row_version bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_bill_status text;
  current_row_version bigint;
  current_printed_total_sen integer;
  new_row_version bigint;
  owner_participant_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      using
        errcode = '42501',
        message = 'Authentication is required.';
  end if;

  if
    p_expected_row_version is null
    or p_expected_row_version < 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Expected row version must be non-negative.';
  end if;

  if
    p_printed_total_sen is null
    or p_printed_total_sen < 0
  then
    raise exception
      using
        errcode = '22023',
        message =
          'Printed total must be non-negative integer sen.';
  end if;

  select
    status,
    row_version,
    printed_total_sen
  into
    current_bill_status,
    current_row_version,
    current_printed_total_sen
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
          'The bill must be reopened before its receipt total can be changed.';
  end if;

  if
    current_row_version <>
    p_expected_row_version
  then
    raise exception
      using
        errcode = '40001',
        message =
          'The bill changed after it was loaded.';
  end if;

  if
    current_printed_total_sen =
    p_printed_total_sen
  then
    return query
    select current_row_version;

    return;
  end if;

  update public.bills
  set printed_total_sen =
    p_printed_total_sen
  where id = p_bill_id
  returning row_version
  into new_row_version;

  select id
  into owner_participant_id
  from public.participants
  where bill_id = p_bill_id
    and is_owner = true
    and linked_user_id = current_user_id;

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
    'bill.printed_total_updated',
    jsonb_build_object(
      'printedTotalSen',
      current_printed_total_sen,
      'rowVersion',
      current_row_version
    ),
    jsonb_build_object(
      'printedTotalSen',
      p_printed_total_sen,
      'rowVersion',
      new_row_version
    )
  );

  return query
  select new_row_version;
end;
$$;

revoke all
  on function public.update_bill_printed_total(
    uuid,
    bigint,
    integer
  )
  from public, anon;

grant execute
  on function public.update_bill_printed_total(
    uuid,
    bigint,
    integer
  )
  to authenticated;