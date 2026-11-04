-- FrameReady Preview schema. Run only in the isolated Preview Supabase project.
-- This creates the tables and private buckets used by the current application.

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
  delivery_files jsonb not null default '[]'::jsonb,
  delivery_sets jsonb not null default '[]'::jsonb,
  revision_delivery_files jsonb not null default '[]'::jsonb,
  revision_delivery_sets jsonb not null default '[]'::jsonb,
  revision_history jsonb not null default '[]'::jsonb,
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  currency text not null default 'usd',
  payment_status text not null default 'unpaid',
  order_status text not null default 'draft',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  payment_receipt_sent_at timestamptz,
  delivery_token text unique,
  delivered_at timestamptz,
  delivered_by text,
  delivery_email_sent_at timestamptz,
  delivery_status text not null default 'not_sent',
  revision_requested_at timestamptz,
  revision_request_message text,
  revision_count integer not null default 0,
  revision_limit integer not null default 1,
  revision_email_sent_at timestamptz,
  paid_revision_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep an existing Preview database compatible if an older baseline was applied.
alter table public.orders add column if not exists delivery_files jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists delivery_sets jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists revision_delivery_files jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists revision_delivery_sets jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists revision_history jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists payment_receipt_sent_at timestamptz;
alter table public.orders add column if not exists delivery_token text;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists delivered_by text;
alter table public.orders add column if not exists delivery_email_sent_at timestamptz;
alter table public.orders add column if not exists delivery_status text not null default 'not_sent';
alter table public.orders add column if not exists revision_requested_at timestamptz;
alter table public.orders add column if not exists revision_request_message text;
alter table public.orders add column if not exists revision_count integer not null default 0;
alter table public.orders add column if not exists revision_limit integer not null default 1;
alter table public.orders add column if not exists revision_email_sent_at timestamptz;
alter table public.orders add column if not exists paid_revision_paid_at timestamptz;

create unique index if not exists orders_delivery_token_idx
  on public.orders (delivery_token)
  where delivery_token is not null;
create index if not exists orders_client_email_idx on public.orders (client_email);
create index if not exists orders_order_status_idx on public.orders (order_status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create table if not exists public.checker_submissions (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  project_title text,
  file_name text,
  file_type text,
  file_size_bytes bigint,
  width integer,
  height integer,
  selected_platforms text[] not null default '{}',
  checker_results jsonb not null default '[]'::jsonb,
  recommended_assets jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  followup_email_sent_at timestamptz,
  followup_email_subject text,
  followup_email_error text,
  lead_status text not null default 'new',
  lead_status_updated_at timestamptz,
  lead_notes text,
  review_requested_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checker_submissions_created_at_idx
  on public.checker_submissions (created_at desc);
create index if not exists checker_submissions_lead_status_idx
  on public.checker_submissions (lead_status);

create table if not exists public.checker_review_requests (
  id uuid primary key default gen_random_uuid(),
  checker_submission_id uuid not null references public.checker_submissions(id) on delete cascade,
  uploaded_files jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  review_response_sent_at timestamptz,
  review_response_subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checker_review_requests_submission_idx
  on public.checker_review_requests (checker_submission_id, created_at desc);

create table if not exists public.system_events (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

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
for each row execute function public.set_updated_at();

drop trigger if exists trg_checker_submissions_updated_at on public.checker_submissions;
create trigger trg_checker_submissions_updated_at
before update on public.checker_submissions
for each row execute function public.set_updated_at();

drop trigger if exists trg_checker_review_requests_updated_at on public.checker_review_requests;
create trigger trg_checker_review_requests_updated_at
before update on public.checker_review_requests
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.checker_submissions enable row level security;
alter table public.checker_review_requests enable row level security;
alter table public.system_events enable row level security;

-- All table operations use the server-side service role. Deliberately create no
-- anon/authenticated table policies.

insert into storage.buckets (id, name, public)
values
  ('order-uploads', 'order-uploads', false),
  ('review-requests', 'review-requests', false)
on conflict (id) do update set public = false;

-- Deliberately create no public storage.objects policies. The service role creates
-- signed upload/download URLs; the browser uploads only with a signed upload token.
