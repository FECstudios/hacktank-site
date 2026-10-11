create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    tiktok_open_id text unique,
    tiktok_username text,
    display_name text,
    avatar_url text,
    iq numeric not null default 100 check (iq between 0 and 200),
    guesses_received integer not null default 0,
    reposts_ready boolean not null default false,
    created_at timestamptz not null default now()
);

create table public.likes (
    profile_id uuid references public.profiles (id) on delete cascade,
    video_id text not null,
    value smallint check (value in (-1,1)) not null,
    created_at timestamptz not null default now(),
    primary key (profile_id, video_id)
);

create table public.reposts (
    profile_id uuid references public.profiles (id) on delete cascade,
    video_id text not null,
    author text,
    position integer check (position between 1 and 10) not null,
    broken boolean default false not null,
    primary key (profile_id, video_id)
);

create table public.guesses (
    id bigint generated always as identity primary key,
    guesser_id uuid references public.profiles (id) on delete cascade not null,
    target_id uuid references public.profiles (id) on delete cascade not null,
    guess integer not null check (guess between 0 and 200),
    target_iq_before numeric not null default 100 check (target_iq_before between 0 and 200),
    delta numeric not null default 0,
    counted boolean not null,
    created_at timestamptz not null default now(),

    check (guesser_id <> target_id),
    unique (guesser_id, target_id)
);

create table public.reports (
    id bigint generated always as identity primary key,
    reporter_id uuid references public.profiles (id) on delete cascade not null,
    target_id uuid references public.profiles (id) on delete cascade not null,
    video_id text,
    reason text not null,
    created_at timestamptz not null default now()
);

create table public.scrape_log (
    id bigint generated always as identity primary key,
    profile_id uuid references public.profiles (id) on delete cascade not null,
    ran_at timestamptz not null default now(),
    result_count integer not null default 0,
    ok boolean not null
);

alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.reposts enable row level security;
alter table public.guesses enable row level security;
alter table public.reports enable row level security;
alter table public.scrape_log enable row level security;