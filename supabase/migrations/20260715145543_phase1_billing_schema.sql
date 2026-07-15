create extension if not exists pgcrypto
with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_bill_updated_at_and_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.row_version = old.row_version + 1;
  return new;
end;
$$;

-- Bills

create table public.bills (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  merchant_name text,
  receipt_date date,

  currency text not null default 'MYR'
    check (currency ~ '^[A-Z]{3}$'),

  printed_total_sen integer not null default 0
    check (printed_total_sen >= 0),

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'open',
        'finalised',
        'settled',
        'archived'
      )
    ),

  row_version bigint not null default 0
    check (row_version >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalised_at timestamptz,
  archived_at timestamptz,

  check (
    merchant_name is null
    or length(btrim(merchant_name)) > 0
  )
);

create index bills_owner_user_id_updated_at_idx
  on public.bills (
    owner_user_id,
    updated_at desc
  );

create index bills_owner_user_id_status_idx
  on public.bills (
    owner_user_id,
    status
  );

create trigger bills_set_updated_at_and_version
before update on public.bills
for each row
execute function public.set_bill_updated_at_and_version();

-- Participants and owner-created placeholders

create table public.participants (
  id uuid primary key default gen_random_uuid(),

  bill_id uuid not null
    references public.bills(id)
    on delete cascade,

  display_name text not null
    check (length(btrim(display_name)) > 0),

  linked_user_id uuid
    references auth.users(id)
    on delete set null,

  is_owner boolean not null default false,

  sort_order integer not null default 0
    check (sort_order >= 0),

  color_token text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (bill_id, id)
);

create unique index participants_one_owner_per_bill_idx
  on public.participants (bill_id)
  where is_owner = true;

create unique index participants_one_linked_user_per_bill_idx
  on public.participants (
    bill_id,
    linked_user_id
  )
  where linked_user_id is not null;

create index participants_bill_id_sort_order_idx
  on public.participants (
    bill_id,
    sort_order,
    created_at
  );

create trigger participants_set_updated_at
before update on public.participants
for each row
execute function public.set_updated_at();

-- Bill items

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),

  bill_id uuid not null
    references public.bills(id)
    on delete cascade,

  description text not null
    check (length(btrim(description)) > 0),

  quantity integer not null default 1
    check (quantity > 0),

  unit_price_sen integer not null default 0
    check (unit_price_sen >= 0),

  manual_line_total_sen integer
    check (
      manual_line_total_sen is null
      or manual_line_total_sen >= 0
    ),

  line_total_sen integer not null
    check (line_total_sen >= 0),

  sort_order integer not null default 0
    check (sort_order >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (bill_id, id),

  check (
    (
      manual_line_total_sen is null
      and line_total_sen::bigint =
        quantity::bigint * unit_price_sen::bigint
    )
    or
    (
      manual_line_total_sen is not null
      and line_total_sen = manual_line_total_sen
    )
  )
);

create index bill_items_bill_id_sort_order_idx
  on public.bill_items (
    bill_id,
    sort_order,
    created_at
  );

create trigger bill_items_set_updated_at
before update on public.bill_items
for each row
execute function public.set_updated_at();

-- Bill-level charges, taxes, discounts, refunds, and rounding

create table public.bill_adjustments (
  id uuid primary key default gen_random_uuid(),

  bill_id uuid not null
    references public.bills(id)
    on delete cascade,

  type text not null
    check (
      type in (
        'discount',
        'service_charge',
        'tax',
        'rounding',
        'other'
      )
    ),

  label text not null
    check (length(btrim(label)) > 0),

  amount_sen integer not null,

  calculation_method text not null default 'fixed'
    check (
      calculation_method in (
        'fixed',
        'rate'
      )
    ),

  rate_basis_points integer
    check (
      rate_basis_points is null
      or rate_basis_points <> 0
    ),

  rounding_mode text
    check (
      rounding_mode is null
      or rounding_mode in (
        'down',
        'half_up',
        'up'
      )
    ),

  calculation_base_mode text
    check (
      calculation_base_mode is null
      or calculation_base_mode in (
        'item_subtotal',
        'running_total'
      )
    ),

  manual_amount_sen integer,

  amount_source text not null default 'manual'
    check (
      amount_source in (
        'manual',
        'calculated',
        'printed',
        'manual_override'
      )
    ),

  allocation_method text not null default 'proportional'
    check (
      allocation_method in (
        'proportional',
        'equal',
        'single',
        'percentage',
        'custom'
      )
    ),

  applies_to_all_items boolean not null default true,

  sort_order integer not null default 0
    check (sort_order >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (bill_id, id),

  check (
    (
      calculation_method = 'fixed'
      and rate_basis_points is null
    )
    or
    (
      calculation_method = 'rate'
      and rate_basis_points is not null
    )
  )
);

create index bill_adjustments_bill_id_sort_order_idx
  on public.bill_adjustments (
    bill_id,
    sort_order,
    created_at
  );

create trigger bill_adjustments_set_updated_at
before update on public.bill_adjustments
for each row
execute function public.set_updated_at();

-- Selected items for item-specific taxes or discounts

create table public.adjustment_applicable_items (
  bill_id uuid not null,

  adjustment_id uuid not null,

  item_id uuid not null,

  created_at timestamptz not null default now(),

  primary key (
    adjustment_id,
    item_id
  ),

  foreign key (
    bill_id,
    adjustment_id
  )
    references public.bill_adjustments (
      bill_id,
      id
    )
    on delete cascade,

  foreign key (
    bill_id,
    item_id
  )
    references public.bill_items (
      bill_id,
      id
    )
    on delete cascade
);

create index adjustment_applicable_items_bill_id_idx
  on public.adjustment_applicable_items (bill_id);

-- Per-item participant allocations

create table public.item_allocations (
  id uuid primary key default gen_random_uuid(),

  bill_id uuid not null,

  item_id uuid not null,

  participant_id uuid not null,

  allocation_type text not null
    check (
      allocation_type in (
        'entire',
        'equal',
        'quantity',
        'percentage',
        'custom'
      )
    ),

  amount_sen integer not null
    check (amount_sen >= 0),

  quantity_share integer
    check (
      quantity_share is null
      or quantity_share > 0
    ),

  percentage_basis_points integer
    check (
      percentage_basis_points is null
      or percentage_basis_points between 1 and 10000
    ),

  remainder_sen smallint not null default 0
    check (remainder_sen in (0, 1)),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    item_id,
    participant_id
  ),

  foreign key (
    bill_id,
    item_id
  )
    references public.bill_items (
      bill_id,
      id
    )
    on delete cascade,

  foreign key (
    bill_id,
    participant_id
  )
    references public.participants (
      bill_id,
      id
    )
    on delete cascade,

  check (
    (
      allocation_type = 'quantity'
      and quantity_share is not null
      and percentage_basis_points is null
    )
    or
    (
      allocation_type = 'percentage'
      and percentage_basis_points is not null
      and quantity_share is null
    )
    or
    (
      allocation_type in (
        'entire',
        'equal',
        'custom'
      )
      and quantity_share is null
      and percentage_basis_points is null
    )
  )
);

create index item_allocations_bill_id_idx
  on public.item_allocations (bill_id);

create index item_allocations_participant_id_idx
  on public.item_allocations (
    participant_id,
    item_id
  );

create trigger item_allocations_set_updated_at
before update on public.item_allocations
for each row
execute function public.set_updated_at();

-- Per-adjustment participant allocations

create table public.adjustment_allocations (
  id uuid primary key default gen_random_uuid(),

  bill_id uuid not null,

  adjustment_id uuid not null,

  participant_id uuid not null,

  amount_sen integer not null,

  percentage_basis_points integer
    check (
      percentage_basis_points is null
      or percentage_basis_points between 1 and 10000
    ),

  remainder_sen smallint not null default 0
    check (remainder_sen in (-1, 0, 1)),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    adjustment_id,
    participant_id
  ),

  foreign key (
    bill_id,
    adjustment_id
  )
    references public.bill_adjustments (
      bill_id,
      id
    )
    on delete cascade,

  foreign key (
    bill_id,
    participant_id
  )
    references public.participants (
      bill_id,
      id
    )
    on delete cascade
);

create index adjustment_allocations_bill_id_idx
  on public.adjustment_allocations (bill_id);

create index adjustment_allocations_participant_id_idx
  on public.adjustment_allocations (
    participant_id,
    adjustment_id
  );

create trigger adjustment_allocations_set_updated_at
before update on public.adjustment_allocations
for each row
execute function public.set_updated_at();

-- Audit trail for meaningful bill changes

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),

  bill_id uuid not null
    references public.bills(id)
    on delete cascade,

  actor_type text not null
    check (
      actor_type in (
        'user',
        'guest',
        'system'
      )
    ),

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  actor_participant_id uuid
    references public.participants(id)
    on delete set null,

  event_type text not null
    check (length(btrim(event_type)) > 0),

  before_state jsonb,
  after_state jsonb,

  created_at timestamptz not null default now(),

  check (
    before_state is not null
    or after_state is not null
  )
);

create index audit_events_bill_id_created_at_idx
  on public.audit_events (
    bill_id,
    created_at desc
  );

-- Deny-by-default row-level security.
-- Policies and explicit Data API grants will be added separately.

alter table public.bills
  enable row level security;

alter table public.participants
  enable row level security;

alter table public.bill_items
  enable row level security;

alter table public.bill_adjustments
  enable row level security;

alter table public.adjustment_applicable_items
  enable row level security;

alter table public.item_allocations
  enable row level security;

alter table public.adjustment_allocations
  enable row level security;

alter table public.audit_events
  enable row level security;

revoke all on table public.bills
  from anon, authenticated;

revoke all on table public.participants
  from anon, authenticated;

revoke all on table public.bill_items
  from anon, authenticated;

revoke all on table public.bill_adjustments
  from anon, authenticated;

revoke all on table public.adjustment_applicable_items
  from anon, authenticated;

revoke all on table public.item_allocations
  from anon, authenticated;

revoke all on table public.adjustment_allocations
  from anon, authenticated;

revoke all on table public.audit_events
  from anon, authenticated;

revoke execute
  on function public.set_updated_at()
  from public, anon, authenticated;

revoke execute
  on function public.set_bill_updated_at_and_version()
  from public, anon, authenticated;