create or replace function public.create_draft_bill(
  p_owner_display_name text default 'You',
  p_merchant_name text default null,
  p_printed_total_sen integer default 0
)
returns table (
  bill_id uuid,
  owner_participant_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid;
  new_bill_id uuid;
  new_owner_participant_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      using
        errcode = '42501',
        message = 'Authentication is required to create a bill.';
  end if;

  if
    p_owner_display_name is null
    or length(btrim(p_owner_display_name)) = 0
  then
    raise exception
      using
        errcode = '22023',
        message = 'Owner display name is required.';
  end if;

  if length(p_owner_display_name) > 100 then
    raise exception
      using
        errcode = '22023',
        message = 'Owner display name cannot exceed 100 characters.';
  end if;

  if
    p_merchant_name is not null
    and length(btrim(p_merchant_name)) = 0
  then
    raise exception
      using
        errcode = '22023',
        message = 'Merchant name cannot be blank.';
  end if;

  if
    p_merchant_name is not null
    and length(p_merchant_name) > 200
  then
    raise exception
      using
        errcode = '22023',
        message = 'Merchant name cannot exceed 200 characters.';
  end if;

  if
    p_printed_total_sen is null
    or p_printed_total_sen < 0
  then
    raise exception
      using
        errcode = '22023',
        message = 'Printed total must be non-negative integer sen.';
  end if;

  insert into public.bills (
    owner_user_id,
    merchant_name,
    printed_total_sen,
    currency,
    status
  )
  values (
    current_user_id,
    p_merchant_name,
    p_printed_total_sen,
    'MYR',
    'draft'
  )
  returning id
  into new_bill_id;

  insert into public.participants (
    bill_id,
    display_name,
    linked_user_id,
    is_owner,
    sort_order
  )
  values (
    new_bill_id,
    p_owner_display_name,
    current_user_id,
    true,
    0
  )
  returning id
  into new_owner_participant_id;

  insert into public.audit_events (
    bill_id,
    actor_type,
    actor_user_id,
    actor_participant_id,
    event_type,
    after_state
  )
  values (
    new_bill_id,
    'user',
    current_user_id,
    new_owner_participant_id,
    'bill.created',
    jsonb_build_object(
      'status', 'draft',
      'currency', 'MYR',
      'printedTotalSen', p_printed_total_sen
    )
  );

  return query
  select
    new_bill_id,
    new_owner_participant_id;
end;
$$;

revoke all
  on function public.create_draft_bill(
    text,
    text,
    integer
  )
  from public, anon;

grant execute
  on function public.create_draft_bill(
    text,
    text,
    integer
  )
  to authenticated;