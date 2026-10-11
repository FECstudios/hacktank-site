// Client key gizli değil (zaten TikTok yetkilendirme URL'sinde görünüyor).
// Client SECRET buraya ASLA yazılmaz; sadece Supabase Edge Function'da durur.
export const TIKTOK_CLIENT_KEY = "sbaw6xnir5ldz5r0v8";
export const REDIRECT_URI = "https://fecstudios.github.io/hacktank-site/callback.html";
export const EXCHANGE_URL = "https://kgqisatstiybsbwsotug.supabase.co/functions/v1/tiktok-exchange";
export const SCOPES = "user.info.basic,user.info.profile";

// Supabase: publishable anahtar herkese açık olabilir, güvenliği RLS sağlıyor.
export const SUPABASE_URL = "https://kgqisatstiybsbwsotug.supabase.co";
export const SUPABASE_KEY = "sb_publishable_FK6ajXGFCBxqsEuFteYFoA_rfJM-rqH";
