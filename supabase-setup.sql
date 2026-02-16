-- Create tables for Truth Be Told Hub (Run this in Supabase SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    display_name text,
    tier text default 'ember',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Votes table
create table public.votes (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    sanctuary_id text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Suggestions table
create table public.suggestions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    content text not null check (char_length(content) <= 500),
    likes uuid[] default array[]::uuid[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Replies table
create table public.replies (
    id uuid default uuid_generate_v4() primary key,
    suggestion_id uuid references public.suggestions(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    content text not null check (char_length(content) <= 300),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Vote cycles table (for admin control)
create table public.vote_cycles (
    id uuid default uuid_generate_v4() primary key,
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    ends_at timestamp with time zone not null,
    duration integer not null,
    created_by uuid references public.profiles(id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.votes enable row level security;
alter table public.suggestions enable row level security;
alter table public.replies enable row level security;
alter table public.vote_cycles enable row level security;

-- Create policies

-- Profiles: Users can read all profiles, update only their own
create policy "Profiles are viewable by everyone" 
    on public.profiles for select using (true);

create policy "Users can update own profile" 
    on public.profiles for update using (auth.uid() = id);

-- Votes: Users can read all votes, create their own, delete their own
create policy "Votes are viewable by everyone" 
    on public.votes for select using (true);

create policy "Authenticated users can create votes" 
    on public.votes for insert with check (auth.role() = 'authenticated');

create policy "Users can delete own votes" 
    on public.votes for delete using (auth.uid() = user_id);

-- Suggestions: Users can read all, create if authenticated, delete own or if admin
create policy "Suggestions are viewable by everyone" 
    on public.suggestions for select using (true);

create policy "Authenticated users can create suggestions" 
    on public.suggestions for insert with check (auth.role() = 'authenticated');

create policy "Users can delete own suggestions" 
    on public.suggestions for delete using (auth.uid() = user_id);

-- Replies: Same as suggestions
create policy "Replies are viewable by everyone" 
    on public.replies for select using (true);

create policy "Authenticated users can create replies" 
    on public.replies for insert with check (auth.role() = 'authenticated');

create policy "Users can delete own replies" 
    on public.replies for delete using (auth.uid() = user_id);

-- Function to handle new user signup (creates profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email);
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile on signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();