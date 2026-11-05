alter table public.orders
  add column if not exists delivery_destinations text[] not null default '{}';

alter table public.orders
  add column if not exists delivery_destination_other text;
