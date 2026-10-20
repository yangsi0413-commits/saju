-- 사주풀이 저장 서버 (Supabase / PostgreSQL)
-- Supabase 대시보드 → SQL Editor에 이 파일 전체를 붙여 넣고 Run 하세요.
--
-- 보안 구조
--   · 방문자(anon): 동의한 경우에만 기록을 "추가"할 수 있고, 읽기·수정은 불가
--   · 방문자: 저장할 때 받은 삭제 코드로 자기 기록만 삭제 가능 (delete_my_record 함수)
--   · 관리자: admins 표에 등록된 로그인 사용자만 전체 읽기·삭제 가능

create extension if not exists pgcrypto;

create table if not exists public.saju_records (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  delete_token  uuid not null default gen_random_uuid(),   -- 저장한 사람에게만 보여 주는 삭제 코드
  consent_version text not null,                          -- 동의한 안내문 버전
  menu          text,                                     -- 어떤 풀이를 보며 저장했는지 (saju, persona, compat …)
  -- 입력 정보
  name          text check (char_length(name) <= 20),
  gender        text not null check (gender in ('M', 'F')),
  calendar      text not null check (calendar in ('solar', 'lunar')),
  is_leap_month boolean not null default false,
  birth_year    int not null check (birth_year between 1900 and 2100),
  birth_month   int not null check (birth_month between 1 and 12),
  birth_day     int not null check (birth_day between 1 and 31),
  birth_hour    int check (birth_hour between 0 and 23),
  birth_minute  int check (birth_minute between 0 and 59),
  place         text check (char_length(place) <= 20),
  time_mode     text check (time_mode in ('solar', 'standard', 'clock')),
  longitude     numeric check (longitude between 100 and 160),
  zi_hour       text check (zi_hour in ('next', 'split')),
  method        text check (char_length(method) <= 20),   -- 해석 방법(학파)
  -- 핵심 결과 요약 (열람 화면에서 전체 풀이는 입력 정보로 다시 계산)
  result        jsonb not null default '{}'::jsonb check (pg_column_size(result) < 8000)
);

create index if not exists saju_records_created_at on public.saju_records (created_at desc);

-- 관리자 목록: Authentication에서 만든 내 계정의 user id를 여기에 넣는다
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.saju_records enable row level security;
alter table public.admins enable row level security;

-- 방문자는 표에 직접 쓰거나 읽을 수 없다. 저장은 아래 save_saju_record 함수로만 (입력값 검증 + 삭제 코드 발급)
drop policy if exists "anyone can insert with consent" on public.saju_records;
revoke insert, update, delete, select on public.saju_records from anon;

-- 관리자: 전체 조회·삭제
drop policy if exists "admins can read" on public.saju_records;
create policy "admins can read" on public.saju_records
  for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "admins can delete" on public.saju_records;
create policy "admins can delete" on public.saju_records
  for delete to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "admins can see themselves" on public.admins;
create policy "admins can see themselves" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- 저장 직후 삭제 코드를 돌려주는 함수 (방문자는 표를 직접 읽을 수 없으므로)
create or replace function public.save_saju_record(rec jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  token uuid;
begin
  if coalesce(rec->>'consent_version', '') = '' then
    raise exception 'consent required';
  end if;
  insert into public.saju_records (
    consent_version, menu, name, gender, calendar, is_leap_month,
    birth_year, birth_month, birth_day, birth_hour, birth_minute,
    place, time_mode, longitude, zi_hour, method, result
  ) values (
    rec->>'consent_version', rec->>'menu', nullif(rec->>'name', ''), rec->>'gender', rec->>'calendar',
    coalesce((rec->>'is_leap_month')::boolean, false),
    (rec->>'birth_year')::int, (rec->>'birth_month')::int, (rec->>'birth_day')::int,
    (rec->>'birth_hour')::int, (rec->>'birth_minute')::int,
    rec->>'place', rec->>'time_mode', (rec->>'longitude')::numeric, rec->>'zi_hour', rec->>'method',
    coalesce(rec->'result', '{}'::jsonb)
  )
  returning delete_token into token;
  return token;
end;
$$;

-- 삭제 코드로 자기 기록 삭제 (삭제된 개수를 돌려준다)
create or replace function public.delete_my_record(token uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.saju_records where delete_token = token;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 보관 기간이 지난 기록 정리 (1년). Supabase의 pg_cron으로 매일 실행하거나, 관리자 페이지에서 수동 실행
create or replace function public.purge_old_records()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'admin only';
  end if;
  delete from public.saju_records where created_at < now() - interval '1 year';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.save_saju_record(jsonb) from public;
revoke all on function public.delete_my_record(uuid) from public;
revoke all on function public.purge_old_records() from public;
grant execute on function public.save_saju_record(jsonb) to anon, authenticated;
grant execute on function public.delete_my_record(uuid) to anon, authenticated;
grant execute on function public.purge_old_records() to authenticated;
