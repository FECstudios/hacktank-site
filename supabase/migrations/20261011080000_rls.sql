-- ============================================================
-- 1) YENİ KULLANICI GELİNCE OTOMATİK PROFİL
-- ============================================================
-- Biri mail ile ilk kez giriş yaptığında Supabase auth.users'a bir satır ekler.
-- Bu trigger o anda profiles'a da aynı id ile bir satır ekler (IQ = 100, varsayılan).
--
-- security definer: fonksiyon, onu çağıran kullanıcının değil, fonksiyonu
--   oluşturanın (admin) yetkisiyle çalışır. Gerekli, çünkü profiles kilitli
--   ve yeni kullanıcının oraya yazma izni yok.
-- set search_path = '': güvenlik önlemi. Fonksiyon tablo adlarını sadece
--   tam yazıldığı gibi (public.profiles) arar, başka bir yerdeki sahte
--   "profiles" tablosuna kandırılamaz.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 2) RLS KURALLARI (POLICY)
-- ============================================================
-- RLS açık bir tabloda hiçbir şeye izin yoktur. Her "create policy" bir kapı açar.
--
-- to authenticated: kural sadece giriş yapmış kullanıcılar için. Giriş
--   yapmamış biri (anon) hiçbir tabloya dokunamaz.
-- using (...): hangi satırları GÖREBİLİR / değiştirebilir / silebilir.
-- with check (...): hangi satırları EKLEYEBİLİR / hangi hale getirebilir.
-- (select auth.uid()): şu an giriş yapmış kullanıcının id'si.
--   "select" içine almak Supabase'in önerisi: her satır için değil,
--   sorgu başına bir kez hesaplanır, daha hızlı.
--
-- Kasıtlı olarak HİÇ AÇILMAYAN kapılar (bunlar sadece RPC ve Edge Function'lardan yapılır):
--   - profiles'a yazmak (IQ'yu kimse kendisi değiştiremez)
--   - başkalarının profilini okumak (tahminden önce kimlik ve IQ gizli kalmalı)
--   - guesses'a doğrudan yazmak (puan hesabı submit_guess RPC'sinde)
--   - reposts'a yazmak (Apify sonuçlarını sadece fetch-reposts yazar)
--   - scrape_log (sadece sunucu)


-- profiles: herkes SADECE kendi satırını görür (kendi IQ'su dahil).
create policy "profiles: kendi profilini oku"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));


-- reposts: kendi repost'larını görebilirsin. Başkalarınınkiler next_target RPC'siyle gelir.
create policy "reposts: kendi repostlarını oku"
  on public.reposts for select
  to authenticated
  using (profile_id = (select auth.uid()));


-- guesses: sadece kendi yaptığın tahminleri görürsün ("guesses" sekmesi için).
create policy "guesses: kendi tahminlerini oku"
  on public.guesses for select
  to authenticated
  using (guesser_id = (select auth.uid()));


-- likes: kendi beğenilerini oku, ekle, değiştir (👍 → 👎), sil.
create policy "likes: kendi beğenilerini oku"
  on public.likes for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "likes: kendi adına beğen"
  on public.likes for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "likes: kendi beğenini değiştir"
  on public.likes for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "likes: kendi beğenini sil"
  on public.likes for delete
  to authenticated
  using (profile_id = (select auth.uid()));


-- reports: sadece kendi adına bildirim ekleyebilirsin, kendini bildiremezsin.
-- Okuma kapısı yok: bildirimleri sadece sen (admin) panelden görürsün.
create policy "reports: kendi adına bildir"
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and target_id <> (select auth.uid())
  );
