# Apify TikTok Scraper ile repost çekme (HackTank)

Durum (2026-10-10): Apify aktörü denendi, çalışıyor. Henüz koda entegre edilmedi.

## Neden Apify
- `tiktok-scraper` (drawrowfly) kütüphanesi çalışmıyor: boş liste döndürüyor.
- yt-dlp sadece tek video için çalışıyor, kullanıcı/repost listesi yok.
- Playwright (headless ve görünür) TikTok'un kaydırmalı puzzle CAPTCHA'sına takılıyor. Aşmaya çalışılmadı.
- Tarayıcı eklentisi ücretsiz yol, ama sadece kullanıcının kendi tarayıcısında açtığı profillerde çalışır, sunucudan toplu tarama yapamaz.

## Aktör
- Clockworks / TikTok Scraper: `clockworks/tiktok-scraper` (API'de `clockworks~tiktok-scraper`; ID'yi Apify API sekmesinden teyit et)
- Kapalı kaynak, ücretli (pay per event).

## Fiyat (Free plan)
| Kalem | Ücret |
|---|---|
| Sonuç | $3.70 / 1.000 sonuç ($0.0037 / sonuç) |
| Tarih filtresi eklentisi | +$1.30 / 1.000 |
| Çalıştırma başlatma | $0.001 |
| Platform kullanımı | dahil |

İlk deneme: 200 sonuç = $0.74 (100'ü gereksiz `#fyp` hashtag'inden, 100'ü optimusbot repostları). Fiyat sonuç başına $0.0037 ile birebir tuttu.

**Hesap başı maliyet (10 repost): ~$0.038** (10 x $0.0037 + $0.001).
$5/ay ile yaklaşık 130 hesap taraması. Birden çok profil tek çalıştırmada verilirse başlatma ücreti bir kez ödenir.

## Çalıştırılacak girdi
```json
{
  "profiles": ["optimusbot"],
  "resultsPerPage": 10,
  "profileScrapeSections": ["reposts"],
  "profileSorting": "latest",
  "excludePinnedPosts": false,
  "maxFollowersPerProfile": 0,
  "maxFollowingPerProfile": 0,
  "scrapeRelatedVideos": false,
  "scrapeAdditionalAuthorMeta": false,
  "shouldDownloadVideos": false,
  "shouldDownloadCovers": false,
  "shouldDownloadSlideshowImages": false,
  "shouldDownloadAvatars": false,
  "shouldDownloadMusicCovers": false,
  "downloadSubtitlesOptions": "NEVER_DOWNLOAD_SUBTITLES",
  "aiVideoDescription": false,
  "aiVideoSummary": false,
  "commentsPerPost": 0,
  "topLevelCommentsPerPost": 0,
  "maxRepliesPerComment": 0,
  "proxyCountryCode": "None"
}
```
- `hashtags` yok: paranın yarısı hashtag'e gidiyordu.
- `profileScrapeSections` sadece `["reposts"]`: `"videos"` hesabın kendi videolarını da ücretlendirir.
- `resultsPerPage` her girdi için ayrı uygulanıyor (ilk denemede hashtag 100 + profil 100 döndü).
- Tarih filtresi kullanma: `createTime` videonun yüklenme tarihi, repost tarihi değil. Liste zaten en yeni repost başta sıralı geliyor.
- **DOĞRULANMADI:** hesap listesinin alan adı `"profiles"`. Varsayılan girdide görünmüyordu. Apify Input sekmesinde JSON görünümünden doğrula.

## API çağrısı
```
POST https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items
Authorization: Bearer <APIFY_TOKEN>
Content-Type: application/json
(gövde: yukarıdaki girdi)
```
Yanıt: video nesnelerinden oluşan JSON dizisi. İlk deneme 26 sn sürdü (senkron uç nokta limiti için sorun değil).

## Çıktıdan kullanılacak alanlar
`id`, `webVideoUrl`, `text`, `authorMeta.name`, `playCount`, `diggCount`, `createTimeISO`, `isSlideshow`.
- Repost satırları: `fromProfileSection == "reposts"`.
- `error` / `errorCode` olan satırlar hata kaydıdır, ele. Bu satırların ücretlendirilip ücretlendirilmediği bilinmiyor.
- Repost zamanı çıktıda yok.

## Entegrasyon tasarımı (Supabase Edge Function)
```
site -> Edge Function "fetch-reposts" -> Apify API -> Postgres -> site
```
1. **Token:** `APIFY_TOKEN` yalnızca `supabase secrets set` ile. `site/config.js` herkese açık, oraya ASLA yazılmaz.
2. **Yetkilendirme:** `tiktok-exchange` `--no-verify-jwt` ile açık. Yeni fonksiyonda JWT doğrulaması açık kalsın, kullanıcıyı `auth.getUser()` ile al. Aksi halde herkes bütçeyi yakabilir.
3. **Önbellek (ana maliyet kontrolü):** `reposts` ve `scrape_log` tabloları.
   - Aynı kullanıcı adı için son çekim 24 saatten yeniyse Apify'a gitme.
   - Kullanıcı başına günlük çekim limiti.
   - Aylık toplam çalıştırma sayacı, üst sınırı aşınca reddet.
   - Apify'da Billing -> Limits'ten $5 sert limit koy (ikinci güvenlik katmanı).
4. **Kayıt:** satırları `id` üzerinden upsert et. Boş sonucu da önbelleğe "boş" olarak yaz (özel hesap / repost yok), tekrar para ödenmesin.
5. `resultsPerPage` kodda sabit olsun, istemciden gelmesin.
6. CORS: `tiktok-exchange` içindeki `ALLOWED_ORIGIN` kalıbını kullan.
7. **Gizlilik:** `site/privacy.html` ve `terms.html` şu an sadece kullanıcı adı ve profil fotoğrafından bahsediyor. Başkalarının herkese açık repostları işlenmeye başlayınca güncelle. TikTok kullanım koşulları scraping konusunda gri alan.

## Proje kısıtı
HackTank kuralı: projenin en fazla %30'u AI ile yapılabilir. Kullanıcı kodun büyük kısmını kendi yazmalı. AI tasarım, açıklama ve gözden geçirme yapsın. Supabase dashboard'daki SQL Hackatime'a sayılmaz, migration'ları editörde CLI ile yaz.

## Sıradaki adımlar
- [ ] Apify Input sekmesinden `profiles` alan adını doğrula
- [ ] Tek hesapla ilk çalıştırma, Usage'dan gerçek maliyeti ve hata satırı ücretini kontrol et
- [ ] Apify'da $5 aylık sert limit
- [ ] Migration: `reposts`, `scrape_log` tabloları
- [ ] Edge Function `fetch-reposts` (kullanıcı yazar, AI gözden geçirir)
- [ ] Gizlilik ve şartlar sayfalarını güncelle
