-- ============================================================
-- OYUN FONKSİYONLARI (RPC)
-- ============================================================
-- Tarayıcıdan şöyle çağrılır:
--   const { data, error } = await supabase.rpc("next_target");
--   const { data, error } = await supabase.rpc("submit_guess", { p_target: ..., p_guess: 131 });
--
-- İkisi de "security definer": RLS'i atlayıp admin yetkisiyle çalışır.
-- Bu yüzden içlerindeki her kontrol (kim çağırıyor, ne gönderdi) çok önemli.
-- Tarayıcı ne gönderirse göndersin, puan hesabı SADECE burada yapılır.


-- ------------------------------------------------------------
-- next_target(): sıradaki gizli oyuncu + videoları
-- ------------------------------------------------------------
-- Seçim kuralları:
--   - repost'ları hazır (reposts_ready),
--   - kendin değil,
--   - daha önce tahmin etmediğin,
--   - rastgele biri.
-- Dönen: { target_id, videos: [{ video_id, author }, ...] }  ya da kimse kalmadıysa null.
-- Kullanıcı adı, avatar ve IQ DÖNMEZ (tahminden önce gizli).
-- author = videonun asıl yaratıcısı, repost eden kişi değil (kimliği açığa çıkarmaz).

create function public.next_target()
returns jsonb
language plpgsql
volatile            -- random() kullandığı için
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_target uuid;
begin
  if v_me is null then
    raise exception 'Please log in first.';
  end if;

  select p.id into v_target
  from public.profiles p
  where p.reposts_ready
    and p.id <> v_me
    and not exists (
      select 1 from public.guesses g
      where g.guesser_id = v_me and g.target_id = p.id
    )
  order by random()
  limit 1;

  if v_target is null then
    return null;   -- tahmin edilecek kimse kalmadı
  end if;

  return jsonb_build_object(
    'target_id', v_target,
    'videos', (
      select jsonb_agg(jsonb_build_object('video_id', r.video_id, 'author', r.author) order by r.position)
      from public.reposts r
      where r.profile_id = v_target and not r.broken
    )
  );
end;
$$;


-- ------------------------------------------------------------
-- submit_guess(p_target, p_guess): tahmini kaydet, IQ'yu güncelle, sonucu döndür
-- ------------------------------------------------------------
-- Formül (PLAN.md):
--   m       = max(0.1, tahmin_eden_iq / 100)          -- 0 IQ → 0.1x, 100 → 1x, 200 → 2x
--   counted = |tahmin - hedef_iq| <= 50               -- uçuk tahminler sayılmaz
--   k       = 0.1 / sqrt(1 + hedefin_sayılan_tahmin_sayısı)   -- çok tahmin almış biri az oynar
--   delta   = counted ? k * m * (tahmin - hedef_iq) : 0
--   yeni_iq = hedef_iq + delta  (0–200 arasında tutulur)

create function public.submit_guess(p_target uuid, p_guess integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_my_iq numeric;
  v_target public.profiles%rowtype;
  v_m numeric;
  v_k numeric;
  v_counted boolean;
  v_delta numeric;
  v_new_iq numeric;
begin
  if v_me is null then
    raise exception 'Please log in first.';
  end if;
  if p_guess is null or p_guess < 0 or p_guess > 200 then
    raise exception 'Your guess must be between 0 and 200.';
  end if;
  if p_target is null or p_target = v_me then
    raise exception 'You can''t guess your own IQ.';
  end if;

  select iq into v_my_iq from public.profiles where id = v_me;
  if not found then
    raise exception 'Your profile was not found.';
  end if;

  -- "for update": bu satırı kilitle. Aynı anda iki kişi aynı hedefi tahmin ederse
  -- ikincisi birincinin bitmesini bekler; böylece IQ güncellemeleri birbirini ezmez.
  select * into v_target
  from public.profiles
  where id = p_target and reposts_ready
  for update;
  if not found then
    raise exception 'This player is not available.';
  end if;

  if exists (select 1 from public.guesses where guesser_id = v_me and target_id = p_target) then
    raise exception 'You already guessed this player.';
  end if;

  v_m       := greatest(0.1, v_my_iq / 100);
  v_counted := abs(p_guess - v_target.iq) <= 50;
  v_k       := 0.1 / sqrt(1 + v_target.guesses_received);
  v_delta   := case when v_counted then v_k * v_m * (p_guess - v_target.iq) else 0 end;
  v_new_iq  := least(200, greatest(0, v_target.iq + v_delta));
  v_delta   := v_new_iq - v_target.iq;   -- sınırlara takıldıysa gerçek değişim

  update public.profiles
  set iq = v_new_iq,
      guesses_received = guesses_received + (case when v_counted then 1 else 0 end)
  where id = p_target;

  insert into public.guesses (guesser_id, target_id, guess, target_iq_before, delta, counted)
  values (v_me, p_target, p_guess, v_target.iq, v_delta, v_counted);

  -- Kimlik ve gerçek IQ ancak şimdi açılır.
  return jsonb_build_object(
    'guess',            p_guess,
    'target_iq_before', round(v_target.iq, 1),
    'target_iq_after',  round(v_new_iq, 1),
    'delta',            round(v_delta, 2),
    'counted',          v_counted,
    'tiktok_username',  v_target.tiktok_username,
    'display_name',     v_target.display_name,
    'avatar_url',       v_target.avatar_url
  );
end;
$$;


-- ------------------------------------------------------------
-- İzinler: sadece giriş yapmış kullanıcılar çağırabilir
-- ------------------------------------------------------------
revoke execute on function public.next_target() from public, anon;
revoke execute on function public.submit_guess(uuid, integer) from public, anon;
grant execute on function public.next_target() to authenticated;
grant execute on function public.submit_guess(uuid, integer) to authenticated;
