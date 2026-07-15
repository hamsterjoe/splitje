-- Centralized ownership check for bill child-table policies.

create or replace function public.is_bill_owner(
  target_bill_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bills as bill
    where bill.id = target_bill_id
      and bill.owner_user_id = (
        select auth.uid()
      )
  );
$$;

revoke all
  on function public.is_bill_owner(uuid)
  from public, anon;

grant execute
  on function public.is_bill_owner(uuid)
  to authenticated;

grant usage
  on schema public
  to authenticated;

-- Bills

grant select, insert, update, delete
  on table public.bills
  to authenticated;

create policy bills_owner_all
on public.bills
for all
to authenticated
using (
  owner_user_id = (
    select auth.uid()
  )
)
with check (
  owner_user_id = (
    select auth.uid()
  )
);

-- Participants

grant select, insert, update, delete
  on table public.participants
  to authenticated;

create policy participants_owner_all
on public.participants
for all
to authenticated
using (
  public.is_bill_owner(bill_id)
)
with check (
  public.is_bill_owner(bill_id)
);

-- Bill items

grant select, insert, update, delete
  on table public.bill_items
  to authenticated;

create policy bill_items_owner_all
on public.bill_items
for all
to authenticated
using (
  public.is_bill_owner(bill_id)
)
with check (
  public.is_bill_owner(bill_id)
);

-- Bill adjustments

grant select, insert, update, delete
  on table public.bill_adjustments
  to authenticated;

create policy bill_adjustments_owner_all
on public.bill_adjustments
for all
to authenticated
using (
  public.is_bill_owner(bill_id)
)
with check (
  public.is_bill_owner(bill_id)
);

-- Adjustment-to-item applicability

grant select, insert, update, delete
  on table public.adjustment_applicable_items
  to authenticated;

create policy adjustment_applicable_items_owner_all
on public.adjustment_applicable_items
for all
to authenticated
using (
  public.is_bill_owner(bill_id)
)
with check (
  public.is_bill_owner(bill_id)
);

-- Item allocations

grant select, insert, update, delete
  on table public.item_allocations
  to authenticated;

create policy item_allocations_owner_all
on public.item_allocations
for all
to authenticated
using (
  public.is_bill_owner(bill_id)
)
with check (
  public.is_bill_owner(bill_id)
);

-- Adjustment allocations

grant select, insert, update, delete
  on table public.adjustment_allocations
  to authenticated;

create policy adjustment_allocations_owner_all
on public.adjustment_allocations
for all
to authenticated
using (
  public.is_bill_owner(bill_id)
)
with check (
  public.is_bill_owner(bill_id)
);

-- Audit events are append-only for application users.

grant select, insert
  on table public.audit_events
  to authenticated;

create policy audit_events_owner_select
on public.audit_events
for select
to authenticated
using (
  public.is_bill_owner(bill_id)
);

create policy audit_events_owner_insert
on public.audit_events
for insert
to authenticated
with check (
  public.is_bill_owner(bill_id)
  and (
    actor_user_id is null
    or actor_user_id = (
      select auth.uid()
    )
  )
);