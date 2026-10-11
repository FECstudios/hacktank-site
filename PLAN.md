# tiq – Ana akış planı

> Kodu sen yazıyorsun (HackTank: en fazla %30 AI). Bu dosya yol haritası.
> SQL'i Supabase panelinde değil, VS Code'da `supabase/migrations/` altına yaz (Hackatime saysın).
> Her adım bitince devlog yaz (AI'sız, ekran görüntüsüyle).

## Neler hazır

| Parça | Nerede | Durum |
|---|---|---|
| Statik site (GitHub Pages) | `site/` → fecstudios.github.io/hacktank-site | ✅ |
| Terms / Privacy | `site/terms.html`, `site/privacy.html` | ✅ (repost kısmı Apify'a göre güncellenecek) |
| TikTok Login Kit | `site/connect.html`, `site/callback.html`, `supabase/functions/tiktok-exchange` | ✅ sandbox'ta çalışıyor, incelemede |
| Apify ile repost çekme | `APIFY_REPOSTS.md` | ✅ test edildi, koda girmedi |
| Embed player | `prototype/player-test.html` | ✅ test edildi |
| Supabase projesi | FIQ, ref `kgqisatstiybsbwsotug`, eu-central-1 | ✅ boş |

## Mimari

```
GitHub Pages (HTML + JS, supabase-js CDN'den)
   │
   ├── Supabase Auth ........ mail ile kod (OTP)
   ├── Postgres + RLS ....... tablolar
   ├── RPC (SQL fonksiyonları) .. next_target, submit_guess  ← puan hesabı BURADA
   └── Edge Functions
         ├── tiktok-exchange .. TikTok hesabını kullanıcıya bağlar
         └── fetch-reposts .... Apify'dan 10 repost çeker, kaydeder
                                     │
TikTok embed player  ◄── sadece video ID (video indirilmez)
```

Kural: **Puan, IQ ve multiplier hesabı asla tarayıcıda yapılmaz.** Tarayıcı sadece "şu kişiye şu tahmini yaptım" der.

## Sayfalar

| Sayfa | Ne yapar |
|---|---|
| `index.html` | Hoş geldin: LOGIN / CREATE ACCOUNT |
| `login.html` | Mail gir → koda bak → kodu gir (resend / confirm) |
| `connect.html` | TikTok'u bağla (var, Supabase oturumu eklenecek) |
| `callback.html` | TikTok dönüşü (var, Supabase oturumu eklenecek) |
| `app.html` | Feed → tahmin → sonuç → sonraki kişi |

## Veritabanı

### `profiles`
| Sütun | Tip | Not |
|---|---|---|
| `id` | uuid PK | `auth.users.id` ile aynı |
| `tiktok_open_id` | text **unique** | Login Kit'ten. Bir TikTok hesabı tek kullanıcıya |
| `tiktok_username` | text | Login Kit'ten, kullanıcı **yazmaz** |
| `display_name`, `avatar_url` | text | Login Kit'ten |
| `iq` | numeric, default 100 | 0–200 arası kalsın (check) |
| `guesses_received` | int, default 0 | k'yı küçültmek için |
| `reposts_ready` | bool, default false | En az 5 repost çekildiyse true. Feed sadece bunları gösterir |
| `created_at` | timestamptz | |

### `reposts`
| Sütun | Tip | Not |
|---|---|---|
| `profile_id` | uuid → profiles | |
| `video_id` | text | TikTok video ID |
| `author` | text | Videonun yaratıcısı (repost eden değil) |
| `position` | int | 1–10, en yeni repost 1 |
| `broken` | bool, default false | Player 1001 hatası verirse true |
| PK | (`profile_id`, `video_id`) | |

### `guesses`
| Sütun | Tip | Not |
|---|---|---|
| `id` | bigint identity PK | |
| `guesser_id`, `target_id` | uuid → profiles | |
| `guess` | int | 0–200 |
| `target_iq_before` | numeric | Sonuç ekranında gösterilir |
| `delta` | numeric | Hedefin IQ'su ne kadar değişti |
| `counted` | bool | Uçuk tahminse false |
| unique | (`guesser_id`, `target_id`) | Aynı kişiyi bir kez tahmin |
| check | `guesser_id <> target_id` | Kendine tahmin yok |

### `likes`
`profile_id`, `video_id`, `created_at`, PK (`profile_id`, `video_id`). Hem 👍 hem 👎 için `value smallint` (1 / -1) ekleyebilirsin.

### `reports`
`id`, `reporter_id`, `target_id`, `video_id` (null olabilir), `reason`, `created_at`.

### `scrape_log`
`profile_id`, `ran_at`, `result_count`, `ok bool`. Apify bütçesini korumak için (bkz. `APIFY_REPOSTS.md`).

### RLS (hepsinde AÇIK)
- `profiles`: herkes `id, tiktok_username, avatar_url` okuyabilir ama **`iq` doğrudan okunmasın** (tahminden önce görünmemeli). Kullanıcı kendi satırını okur. **Kimse `iq`'yu doğrudan update edemez.**
- `reposts`: giriş yapmış herkes okur, yazma sadece Edge Function (service role).
- `guesses`: kullanıcı sadece kendi tahminlerini okur. Insert sadece `submit_guess` RPC'si üzerinden.
- `likes`, `reports`: kullanıcı kendi satırını ekler/siler.

> İpucu: Hedefin IQ'sunu gizlemenin en kolay yolu, `iq`'yu tarayıcıya hiç vermemek; sadece `submit_guess` sonucunda döndürmek.

## RPC'ler (SQL fonksiyonları, `security definer`)

### `next_target()` → hedef + 10 video
- `reposts_ready = true` olan,
- kendisi olmayan,
- daha önce tahmin etmediği,
- rastgele bir kişi.
- Dönen: `target_id`, video ID listesi (broken olmayanlar). **Kullanıcı adı ve IQ dönmesin** (taslakta "REDACTED").

### `submit_guess(target uuid, guess int)` → sonuç
1. `guess` 0–200 değilse hata.
2. Hedef satırını kilitle: `select ... for update`.
3. `m = max(0.1, guesser.iq / 100)`
4. `counted = abs(guess - target.iq) <= 50`
5. `k = 0.1 / sqrt(1 + target.guesses_received)`
6. `delta = counted ? k * m * (guess - target.iq) : 0`
7. Hedefin `iq += delta` (0–200 arasında tut), `guesses_received += 1`
8. `guesses`'a satır ekle (unique ihlali = zaten tahmin etmiş → hata).
9. Dön: `target_iq_before`, `delta`, `counted`, `tiktok_username`, `avatar_url`.

## Edge Function'lar

### `tiktok-exchange` (var, güncellenecek)
- Şu an sadece kullanıcı bilgisini döndürüyor.
- Eklenecek: istekle birlikte **Supabase access token** gelsin (`Authorization: Bearer ...`), fonksiyon `auth.getUser()` ile kullanıcıyı bulsun, `profiles` satırına `tiktok_open_id`, `tiktok_username`, `display_name`, `avatar_url` yazsın (service role ile).
- `tiktok_open_id` başka bir kullanıcıda varsa → hata ("bu TikTok hesabı başka bir hesaba bağlı").
- Sonra `fetch-reposts`'u tetikle (ya da callback sayfası çağırsın).

### `fetch-reposts` (yeni)
- JWT doğrulaması **açık**. Kullanıcı sadece **kendi** hesabının repost'larını çektirebilir (kullanıcı adı istekten değil `profiles`'tan alınır).
- 24 saatten yeni bir `scrape_log` varsa Apify'a gitme.
- Apify girdisi `APIFY_REPOSTS.md`'de. `resultsPerPage: 10` kodda sabit.
- Sonuçları `reposts`'a upsert et, `error` satırlarını at.
- 5 veya daha fazla repost → `reposts_ready = true`.
- `APIFY_TOKEN` sadece `supabase secrets set` ile.

## app.html akışı

1. Sayfa açılır → oturum yoksa `login.html`'e, TikTok bağlı değilse `connect.html`'e yönlendir.
2. Sol panel: kendi avatarın, `@kullaniciadin`, IQ'n (kendi IQ'nu görebilirsin).
3. **"Başla"** butonu (tarayıcının otomatik oynatma kuralı için ilk tıklama şart).
4. `next_target()` → 10 video.
5. Embed player: `autoplay=1&loop=1&description=0&music_info=0&rel=0`
   - ↑ / ↓ ile önceki / sonraki, `1 / 10` sayacı
   - `onCurrentTime` ile her videonun en az %50'si izlenmeden ↓ açılmasın
   - `onPlayerError 1001` → videoyu atla (ileride `broken = true`)
   - 👍 👎 → `likes`, report → `reports`, "view on tt" → `https://www.tiktok.com/@{author}/video/{id}`
6. 10 video bitince: slider 0–200 + SUBMIT → `submit_guess()`
7. Sonuç: "USER'S IQ WAS 143", kullanıcı adı ve avatar açılır, "IQ x puan değişti" → NEXT PERSON (4'e dön).
8. Hiç hedef kalmadıysa: "Herkesi tahmin ettin, sonra tekrar gel".

## Yapım sırası

- [x] **1. Şema:** `supabase init`, `supabase/migrations/0001_schema.sql` → tablolar + check'ler + unique'ler
- [x] **2. RLS:** `0002_rls.sql` → hepsinde enable + politikalar
- [x] **3. Giriş:** (OTP kod yerine magic link + Brevo SMTP) `login.html` → `signInWithOtp({ email })` + `verifyOtp({ email, token, type: 'email' })`. Kayıt olunca `profiles` satırı (trigger ile: `on auth.users insert`)
- [x] **4. TikTok bağlama:** `tiktok-exchange`'i Supabase kullanıcısına bağla
- [x] **5. Repost çekme:** `fetch-reposts` + Apify. Önce `profiles` alan adını Apify Input sekmesinden doğrula
- [x] **6. RPC'ler:** `0003_rpc.sql` → `next_target`, `submit_guess`. SQL editöründe iki test kullanıcısıyla dene
- [x] **7. Feed:** `app.html` → player, ↑/↓, %50 kuralı
- [x] **8. Tahmin + sonuç ekranı**
- [x] **9. Likes / view on tt** (report butonu henüz yok)
- [x] **10. Gizlilik politikası:** repost'ların Apify ile herkese açık profilden çekildiğini yaz, Apify'ı "Service providers"a ekle
- [ ] **11. Test:** 3-4 arkadaşla gerçek oyun

Her adımdan sonra: Supabase'de **Advisors → Security** uyarılarına bak (ya da bana "kontrol et" de).

## Açık kararlar
- Herkes **100 IQ** ile mi başlıyor, yoksa ilk planda olduğu gibi bir IQ testi mi var? (Taslakta test yok → şimdilik 100.)
- Uçuk tahmin sınırı **±50** iyi mi?
- Tahmin edenin kendi IQ'su da değişsin mi (iyi tahmin edene ödül)? Şimdilik hayır.
