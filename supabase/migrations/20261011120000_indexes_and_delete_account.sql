-- 1) Yabancı anahtarlar için index (Supabase performance advisor).
--    Örn. bir oyuncu silinince "on delete cascade" bu sütunlarda arama yapar.
create index guesses_target_id_idx on public.guesses (target_id);
create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_target_id_idx on public.reports (target_id);
create index scrape_log_profile_id_ran_at_idx on public.scrape_log (profile_id, ran_at desc);


-- 2) Hesabımı sil (gizlilik politikasındaki söz).
--    auth.users satırı silinince "on delete cascade" sayesinde profil, repost'lar,
--    tahminler, beğeniler, bildirimler ve scrape_log da otomatik silinir.
--    Kullanıcı SADECE kendi hesabını silebilir (auth.uid()).
--    Tarayıcıdan: await supabase.rpc("delete_my_account"); sonra supabase.auth.signOut();
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Please log in first.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
