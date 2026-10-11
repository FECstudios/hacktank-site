// TikTok Login Kit: authorization code -> access token -> user info -> profiles'a kaydet.
//
// İstek: POST { code }  +  Authorization: Bearer <Supabase access token>
// Supabase oturumu olmayan istek reddedilir; TikTok hesabı o oturumun profiline yazılır.
//
// Gerekli secret: TIKTOK_CLIENT_SECRET
// (TIKTOK_CLIENT_KEY ve TIKTOK_REDIRECT_URI isteğe bağlı, varsayılanları aşağıda)
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase tarafından otomatik verilir.
// Deploy:
//   npx supabase functions deploy tiktok-exchange --no-verify-jwt
//   (JWT'yi aşağıda kendimiz doğruluyoruz, böylece net hata mesajı dönebiliyoruz.)

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://fecstudios.github.io", "http://localhost:5174"];

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 1) Supabase oturumunu doğrula
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "server_not_configured" }, 500);

  // Service role: RLS'i atlayan admin bağlantısı. SADECE sunucuda kullanılır.
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "not_logged_in", detail: "Please log in first." }, 401);

  const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !user) return json({ error: "not_logged_in", detail: "Your session expired. Please log in again." }, 401);

  // 2) TikTok code -> access token
  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code) return json({ error: "missing_code" }, 400);

  // Client key ve redirect URI gizli değil (site/config.js'te de var); sadece secret gizli.
  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "sbaw6xnir5ldz5r0v8";
  const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");
  const redirectUri = Deno.env.get("TIKTOK_REDIRECT_URI") ??
    "https://fecstudios.github.io/hacktank-site/callback.html";
  if (!clientSecret) return json({ error: "server_not_configured", detail: "TikTok secret is not set" }, 500);

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) {
    return json({ error: "token_exchange_failed", detail: token.error_description ?? token.error }, 400);
  }

  // 3) TikTok kullanıcı bilgisi
  const userRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,username",
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  );
  const info = await userRes.json();
  if (info.error?.code && info.error.code !== "ok") {
    return json({ error: "user_info_failed", detail: info.error.message }, 400);
  }
  const tt = info.data.user;

  // 4) Profile kaydet
  const { error: dbError } = await admin
    .from("profiles")
    .update({
      tiktok_open_id: tt.open_id,
      tiktok_username: tt.username,
      display_name: tt.display_name,
      avatar_url: tt.avatar_url,
    })
    .eq("id", user.id);

  if (dbError) {
    // 23505 = unique ihlali: bu TikTok hesabı başka bir tiq hesabına bağlı
    if (dbError.code === "23505") {
      return json({ error: "tiktok_already_linked", detail: "This TikTok account is already linked to another tiq account." }, 409);
    }
    return json({ error: "db_error", detail: dbError.message }, 500);
  }

  // TikTok access token'ını tarayıcıya göndermiyoruz ve saklamıyoruz (artık gerek yok).
  return json({ user: tt, scope: token.scope });
});
