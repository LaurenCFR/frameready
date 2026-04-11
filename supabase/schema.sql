create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_order_id text unique,

  client_name text,
  client_email text,
  notes text,

  package_id text not null,
  package_name text not null,

  add_on_ids text[] not null default '{}',
  add_on_labels text[] not null default '{}',

  localized_languages text[] not null default '{}',
  localized_titles jsonb not null default '{}'::jsonb,
  localized_region_guidelines text,

  package_font_info text,

  uploaded_files jsonb not null default '[]'::jsonb,
  uploaded_font_files jsonb not null default '[]'::jsonb,

  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  currency text not null default 'usd',

  payment_status text not null default 'unpaid',
  order_status text not null default 'draft',

  stripe_checkout_session_id text,
  stripe_payment_intent_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_client_email_idx on public.orders (client_email);
create index if not exists orders_order_status_idx on public.orders (order_status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on public.orders;

create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();