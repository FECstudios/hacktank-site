// Client key gizli değil (zaten TikTok yetkilendirme URL'sinde görünüyor).
// Client SECRET buraya ASLA yazılmaz; sadece Supabase Edge Function'da durur.
export const TIKTOK_CLIENT_KEY = "BURAYA_CLIENT_KEY";
export const REDIRECT_URI = "https://fecstudios.github.io/hacktank-site/callback.html";
export const EXCHANGE_URL = "https://PROJE_REF.supabase.co/functions/v1/tiktok-exchange";
export const SCOPES = "user.info.basic,user.info.profile";
