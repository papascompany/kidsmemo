alter table public.push_deliveries
  add column if not exists retry_count integer not null default 0,
  add column if not exists next_retry_at timestamptz;

alter table public.push_deliveries
  add constraint push_deliveries_retry_count_check check (retry_count >= 0);

create index if not exists push_deliveries_retry_idx
  on public.push_deliveries(campaign_id, status, next_retry_at)
  where status = 'failed' and next_retry_at is not null;
