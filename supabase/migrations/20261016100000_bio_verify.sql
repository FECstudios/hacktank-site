create table public.verify_codes (
    profile_id uuid primary key references public.profiles (id) on delete cascade,
    username text not null,
    code text not null,
    attempts integer not null default 0,
    created_at timestamptz not null default now()

);
alter table public.verify_codes enable row level security;
create unique index profiles_tiktok_username_unique on public.profiles (lower(tiktok_username));