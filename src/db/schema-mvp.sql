-- ============================================================
-- First Connect · Quote Connector · MVP Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Applications (one per quoting session)
create table if not exists applications (
  id                   uuid primary key default gen_random_uuid(),
  insured_name         text not null,
  ein                  text,
  state                char(2) not null,
  ncci_code            text not null,
  industry_label       text not null,
  annual_payroll       numeric,
  employee_count       int,
  selected_carrier_ids text[]   not null default '{}',
  status               text     not null default 'draft'
                         check (status in ('draft','submitted','quoting','quoted','bound','expired')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Raw answers — one row per (application × question_key)
create table if not exists application_answers (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references applications(id) on delete cascade,
  question_key    text not null,   -- shared_question_key or internal_key from question-taxonomy
  raw_value       text not null,
  updated_at      timestamptz not null default now(),
  unique(application_id, question_key)
);

-- Quote results — one row per (application × carrier)
create table if not exists quotes (
  id                   uuid primary key default gen_random_uuid(),
  application_id       uuid not null references applications(id) on delete cascade,
  carrier_id           text not null,  -- 'pieco' | 'amtrust'
  status               text not null default 'pending'
                         check (status in ('pending','quotable','refer','decline','error','timeout')),
  premium_annual       numeric,
  refer_reasons        text[],
  carrier_response_raw jsonb,
  responded_at         timestamptz,
  created_at           timestamptz not null default now(),
  unique(application_id, carrier_id)
);

-- Enable Realtime on quotes so the results page gets live updates
alter publication supabase_realtime add table quotes;

-- ── RLS (permissive for demo — tighten in production) ──────
alter table applications        enable row level security;
alter table application_answers enable row level security;
alter table quotes              enable row level security;

create policy "anon_all_applications"        on applications        for all using (true) with check (true);
create policy "anon_all_answers"             on application_answers for all using (true) with check (true);
create policy "anon_all_quotes"              on quotes              for all using (true) with check (true);
