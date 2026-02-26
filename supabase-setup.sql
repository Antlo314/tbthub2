-- Create tables for Truth Be Told Hub (Run this in Supabase SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    username text,
    avatar_url text,
    tier text default 'Ember',
    votes_cast integer default 0,
    is_banned boolean default false,
    onboarding_completed boolean default false,
    username_last_changed timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Vote cycles table (Enhanced for active tracking)
create table if not exists public.vote_cycles (
    id uuid default uuid_generate_v4() primary key,
    label text default 'Current Cycle',
    is_active boolean default false,
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    ends_at timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Votes table (Unified for single-vote logic)
create table if not exists public.votes (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    sanctuary_id text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure UNIQUE(user_id) constraint exists
alter table public.votes drop constraint if exists one_vote_per_user;
alter table public.votes add constraint one_vote_per_user unique (user_id);

-- 4. System Announcements table (for Broadcasts)
create table if not exists public.system_announcements (
    id uuid default uuid_generate_v4() primary key,
    content text not null,
    author_id uuid references auth.users,
    type text default 'info', -- info, alert, priority
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS & Security
alter table public.vote_cycles enable row level security;
alter table public.system_announcements enable row level security;

-- Drop policies before creating them to ensure idempotency
drop policy if exists "Cycles are viewable by everyone" on public.vote_cycles;
drop policy if exists "Only admins can manage cycles" on public.vote_cycles;
drop policy if exists "Announcements are viewable by everyone" on public.system_announcements;
drop policy if exists "Only admins can post announcements" on public.system_announcements;

create policy "Cycles are viewable by everyone" on public.vote_cycles for select using (true);
create policy "Only admins can manage cycles" on public.vote_cycles for all 
    using (auth.jwt() ->> 'email' = 'admin@truthbtoldhub.com');

create policy "Announcements are viewable by everyone" on public.system_announcements for select using (true);
create policy "Only admins can post announcements" on public.system_announcements for all 
    using (auth.jwt() ->> 'email' = 'admin@truthbtoldhub.com');

-- STORAGE SETUP (Idempotent Bucket Creation)
-- Note: This requires the storage extension to be enabled in Supabase
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS Policies
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

create policy "Avatar images are publicly accessible" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can upload their own avatar" on storage.objects for insert with check (bucket_id = 'avatars' AND auth.uid() = owner);
create policy "Users can update their own avatar" on storage.objects for update with check (bucket_id = 'avatars' AND auth.uid() = owner);
create policy "Users can delete their own avatar" on storage.objects for delete using (bucket_id = 'avatars' AND auth.uid() = owner);

-- Functions & Views
create or replace function public.start_new_cycle(duration_hours int, cycle_label text)
returns uuid as $$
declare
    new_id uuid;
begin
    -- Safely deactivate any running cycle
    update public.vote_cycles set is_active = false where is_active = true;
    -- Wipe votes for a fresh start
    delete from public.votes where id is not null;
    
    -- Insert new cycle with ALL required columns (duration is NOT NULL)
    insert into public.vote_cycles (label, is_active, ends_at, duration, created_by)
    values (
        cycle_label,
        true,
        now() + (duration_hours || ' hours')::interval,
        duration_hours,
        auth.uid()
    )
    returning id into new_id;
    
    return new_id;
end;
$$ language plpgsql security definer;

-- NEW: Safe Admin RPCs to bypass client-side "safe update" restrictions
create or replace function public.terminate_active_cycle()
returns void as $$
begin
    update public.vote_cycles 
    set is_active = false 
    where is_active = true;
end;
$$ language plpgsql security definer;

create or replace function public.purge_all_votes()
returns void as $$
begin
    delete from public.votes where id is not null;
end;
$$ language plpgsql security definer;

create or replace function public.clear_whispers()
returns void as $$
begin
    delete from public.replies where id is not null;
    delete from public.suggestions where id is not null;
end;
$$ language plpgsql security definer;

create or replace function public.cast_vote(target_sanctuary_id text)
returns void as $$
begin
    insert into public.votes (user_id, sanctuary_id)
    values (auth.uid(), target_sanctuary_id)
    on conflict (user_id) 
    do update set sanctuary_id = excluded.sanctuary_id, created_at = now();
end;
$$ language plpgsql security definer;

create or replace view public.view_vote_counts as
select sanctuary_id, count(*) as count
from public.votes
group by sanctuary_id;

create or replace view public.view_member_ranks as
select 
    id,
    email,
    username,
    row_number() over (order by created_at asc) as join_rank
from public.profiles;

-- NEW: The Path of Ascension (Dynamic Tier Calculation)
create or replace view public.view_soul_power as
with vote_pts as (
    select user_id, count(*) * 2 as pts from public.votes group by user_id
),
suggestion_pts as (
    select user_id, count(*) * 1 as pts from public.suggestions group by user_id
),
reply_pts as (
    select user_id, count(*) * 1 as pts from public.replies group by user_id
)
select 
    p.id,
    p.email,
    p.username,
    case 
        when p.email = 'admin@truthbtoldhub.com' then 9999 -- MAX POWER
        else coalesce(v.pts, 0) + coalesce(s.pts, 0) + coalesce(r.pts, 0) + 5 -- +5 BASE (Initiation)
    end as soul_power,
    case 
        when p.email = 'admin@truthbtoldhub.com' then 'Architect'
        when (coalesce(v.pts, 0) + coalesce(s.pts, 0) + coalesce(r.pts, 0) + 5) >= 250 then 'Primordial'
        when (coalesce(v.pts, 0) + coalesce(s.pts, 0) + coalesce(r.pts, 0) + 5) >= 50 then 'Ascended'
        else 'Ember'
    end as earned_tier
from public.profiles p
left join vote_pts v on p.id = v.user_id
left join suggestion_pts s on p.id = s.user_id
left join reply_pts r on p.id = r.user_id;

-- Permissions
grant select on public.view_vote_counts to anon, authenticated;
grant select on public.view_member_ranks to anon, authenticated;
grant select on public.view_soul_power to anon, authenticated;
grant select on public.system_announcements to anon, authenticated;

-- 5. Suggestions (Whispers) Table
create table if not exists public.suggestions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users on delete cascade not null,
    content text not null,
    likes uuid[] default array[]::uuid[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Replies Table
create table if not exists public.replies (
    id uuid default uuid_generate_v4() primary key,
    suggestion_id uuid references public.suggestions on delete cascade not null,
    parent_reply_id uuid references public.replies on delete cascade, -- NEW: Nested replies
    user_id uuid references auth.users on delete cascade not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Suggestions & Replies
alter table public.suggestions enable row level security;
alter table public.replies enable row level security;

drop policy if exists "Suggestions are viewable by everyone" on public.suggestions;
drop policy if exists "Users can post suggestions" on public.suggestions;
drop policy if exists "Users can like suggestions" on public.suggestions;
drop policy if exists "Replies are viewable by everyone" on public.replies;
drop policy if exists "Users can post replies" on public.replies;

create policy "Suggestions are viewable by everyone" on public.suggestions for select using (true);
create policy "Users can post suggestions" on public.suggestions for insert with check (auth.uid() = user_id);
create policy "Users can like suggestions" on public.suggestions for update using (true); -- Simplified for array update

create policy "Replies are viewable by everyone" on public.replies for select using (true);
create policy "Users can post replies" on public.replies for insert with check (auth.uid() = user_id);

-- Grants
grant all on public.suggestions to authenticated;
grant all on public.replies to authenticated;
grant select on public.suggestions to anon;
grant select on public.replies to anon;
