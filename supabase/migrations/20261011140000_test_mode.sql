-- ============================================================
-- TEST MODU (sadece test hesapları)
-- ============================================================
-- preview_guess: tahmini KAYDETMEDEN sonucu gösterir (gerçek IQ dahil).
--   Herkese açık olsaydı herkes önce gerçek IQ'yu öğrenip sonra tam isabet yapardı,
--   bu yüzden sadece testers tablosundaki hesaplar çağırabilir.
-- reset_my_guesses: test hesabının bütün tahminlerini geri alır (hedeflerin IQ'ları eski haline döner).

create table public.testers (
  profile_id uuid primary key references public.profiles (id) on delete cascade
);
alter table public.testers enable row level security;   -- kural yok: tarayıcıdan okunamaz/yazılamaz

insert into public.testers (profile_id)
select id from public.profiles where tiktok_username in ('optimusbot', 'fecstudios_tt');

create function public.is_tester()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.testers where profile_id = auth.uid());
$$;


-- submit_guess ile AYNI formül; sadece hiçbir şey yazmıyor.
create function public.preview_guess(p_target uuid, p_guess integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_my_iq numeric;
  v_target public.profiles%rowtype;
  v_m numeric;
  v_counted boolean;
  v_delta numeric;
  v_new_iq numeric;
begin
  if not public.is_tester() then
    raise exception 'Test mode is only for test accounts.';
  end if;
  if p_guess is null or p_guess < 0 or p_guess > 200 then
    raise exception 'Your guess must be between 0 and 200.';
  end if;

  select iq into v_my_iq from public.profiles where id = v_me;
  select * into v_target from public.profiles where id = p_target;
  if not found then
    raise exception 'This player is not available.';
  end if;

  v_m       := greatest(0.1, v_my_iq / 100);
  v_counted := abs(p_guess - v_target.iq) <= 50;
  v_delta   := case when v_counted then (0.1 / sqrt(1 + v_target.guesses_received)) * v_m * (p_guess - v_target.iq) else 0 end;
  v_new_iq  := least(200, greatest(0, v_target.iq + v_delta));

  return jsonb_build_object(
    'preview',          true,
    'guess',            p_guess,
    'target_iq_before', round(v_target.iq, 1),
    'target_iq_after',  round(v_new_iq, 1),
    'delta',            round(v_new_iq - v_target.iq, 2),
    'counted',          v_counted,
    'tiktok_username',  v_target.tiktok_username,
    'display_name',     v_target.display_name,
    'avatar_url',       v_target.avatar_url
  );
end;
$$;


-- Test hesabının bütün tahminlerini geri al (en yeniden eskiye).
create function public.reset_my_guesses()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  n integer := 0;
begin
  if not public.is_tester() then
    raise exception 'Test mode is only for test accounts.';
  end if;

  for g in
    select * from public.guesses where guesser_id = auth.uid() order by id desc
  loop
    update public.profiles
    set iq = least(200, greatest(0, iq - g.delta)),
        guesses_received = greatest(0, guesses_received - (case when g.counted then 1 else 0 end))
    where id = g.target_id;
    delete from public.guesses where id = g.id;
    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke execute on function public.is_tester() from public, anon;
revoke execute on function public.preview_guess(uuid, integer) from public, anon;
revoke execute on function public.reset_my_guesses() from public, anon;
grant execute on function public.is_tester() to authenticated;
grant execute on function public.preview_guess(uuid, integer) to authenticated;
grant execute on function public.reset_my_guesses() to authenticated;
