-- Album "Quarant'anni insieme": tables, storage and access rules.
-- Run in Supabase > SQL Editor (running it again is harmless).
-- Photos, memories and stories are shared by every signed-in family member.
-- Favourites and personal albums are private: each person only ever sees their own.

create table if not exists public.photos (
  id text primary key,
  date text not null,                -- "1992-08-15", or "1992-08-00" / "1992-00-00" when only the month or year is known
  ar real default 1,
  path text not null,
  thumb_path text not null,
  place text default '',
  people text default '',
  caption text default '',
  added_by text,
  created_at timestamptz default now()
);

-- Added later. Running this file again keeps the existing photos.
alter table public.photos alter column date type text using date::text;
alter table public.photos add column if not exists tags text[] default '{}';       -- words people added to find the photo
alter table public.photos add column if not exists ai_tags text[] default '{}';    -- what the AI saw
alter table public.photos add column if not exists ai_caption text default '';
alter table public.photos add column if not exists ai_place text default '';
alter table public.photos add column if not exists ai_area text default '';
alter table public.photos add column if not exists ai_group text default '';
alter table public.photos add column if not exists lat double precision;          -- where it was taken, from the photo itself
alter table public.photos add column if not exists lon double precision;
alter table public.photos add column if not exists video_path text;               -- videos: the file to play (path holds a still frame)
alter table public.photos add column if not exists dur real;                       -- videos: length in seconds

create table if not exists public.memories (
  id text primary key,
  who text not null,
  created bigint,
  title text,
  year int,
  place text,
  people text,
  text text not null,
  quote text,
  chapter text,
  photo_ids text[] default '{}',
  qa jsonb,
  inserted_at timestamptz default now()
);

alter table public.memories add column if not exists tags text[] default '{}';

-- Asking to take a photo out of the album. It leaves the album once both partners asked (or whoever added it);
-- the photo itself stays, so it can always be put back.
create table if not exists public.removals (
  photo_id text not null references public.photos(id) on delete cascade,
  who text not null,
  created_at timestamptz default now(),
  primary key (photo_id, who)
);

create table if not exists public.stories (
  chapter text primary key,
  story text,
  details jsonb,
  count int,
  updated bigint
);

-- Chapters kept as data: a name for a stretch of time, and the photos of those days go in it by themselves.
-- The album's own come from the private guide, so they never sit in the public code; the family adds more.
create table if not exists public.chapters (
  id text primary key,
  title text not null,
  date_from text not null,           -- "1995-06-01"
  date_to text not null,             -- "1995-08-31"
  added_by text,
  created bigint
);

-- Added later: the chapter's own label ("Estate 1995", shown instead of the months), first question and cover photo.
alter table public.chapters add column if not exists label text;
alter table public.chapters add column if not exists starter text;
alter table public.chapters add column if not exists cover text;

alter table public.photos enable row level security;
alter table public.memories enable row level security;
alter table public.stories enable row level security;
alter table public.removals enable row level security;
alter table public.chapters enable row level security;

drop policy if exists "family photos" on public.photos;
create policy "family photos" on public.photos for all to authenticated using (true) with check (true);
drop policy if exists "family memories" on public.memories;
create policy "family memories" on public.memories for all to authenticated using (true) with check (true);
drop policy if exists "family stories" on public.stories;
create policy "family stories" on public.stories for all to authenticated using (true) with check (true);
drop policy if exists "family removals" on public.removals;
create policy "family removals" on public.removals for all to authenticated using (true) with check (true);
drop policy if exists "family chapters" on public.chapters;
create policy "family chapters" on public.chapters for all to authenticated using (true) with check (true);

-- Only signed-in family members reach the tables, and the rules above say which rows.
grant select, insert, update, delete on public.photos, public.memories, public.removals, public.stories, public.chapters to authenticated;

create table if not exists public.favorites (
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  photo_id text not null,
  created_at timestamptz default now(),
  primary key (owner, photo_id)
);

create table if not exists public.albums (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  photo_ids text[] not null default '{}',
  created bigint,
  updated_at timestamptz default now()
);

alter table public.favorites enable row level security;
alter table public.albums enable row level security;

drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "own albums" on public.albums;
create policy "own albums" on public.albums for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on public.favorites, public.albums to authenticated;

insert into storage.buckets (id, name, public) values ('album', 'album', false) on conflict (id) do nothing;

drop policy if exists "family read files" on storage.objects;
create policy "family read files" on storage.objects for select to authenticated using (bucket_id = 'album');
drop policy if exists "family add files" on storage.objects;
create policy "family add files" on storage.objects for insert to authenticated with check (bucket_id = 'album');
drop policy if exists "family remove files" on storage.objects;
create policy "family remove files" on storage.objects for delete to authenticated using (bucket_id = 'album');
drop policy if exists "family update files" on storage.objects;
create policy "family update files" on storage.objects for update to authenticated using (bucket_id = 'album');

-- The natural voices (Google's) are free up to a monthly allowance. This counts the characters the album asked
-- Google to read this month and says no past 900,000, a little under the free million, so they never cost anything.
-- Nobody reads or changes the count directly: only these two functions do.
create table if not exists public.voice_usage (
  month text primary key,            -- "2026-10": Google's billing month, which follows Pacific time
  chars bigint not null default 0
);
alter table public.voice_usage enable row level security;

create or replace function public.voice_take(n int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  m text := to_char(now() at time zone 'America/Los_Angeles', 'YYYY-MM');
  ok boolean;
begin
  if n is null or n < 1 or n > 1500 then return false; end if;
  insert into public.voice_usage as u (month, chars) values (m, n)
    on conflict (month) do update set chars = u.chars + excluded.chars
    where u.chars + excluded.chars <= 900000
    returning true into ok;
  return coalesce(ok, false);
end $$;

create or replace function public.voice_left() returns bigint
language sql stable security definer set search_path = public as $$
  select 900000 - coalesce((select chars from public.voice_usage
    where month = to_char(now() at time zone 'America/Los_Angeles', 'YYYY-MM')), 0);
$$;

revoke all on function public.voice_take(int) from public, anon;
revoke all on function public.voice_left() from public, anon;
grant execute on function public.voice_take(int) to authenticated;
grant execute on function public.voice_left() to authenticated;
