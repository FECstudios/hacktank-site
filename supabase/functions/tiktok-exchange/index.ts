// TikTok Login Kit: authorization code -> access token -> user info.
// Client secret sadece burada, Supabase secret olarak durur.
//
// Gerekli secret: TIKTOK_CLIENT_SECRET
// (TIKTOK_CLIENT_KEY ve TIKTOK_REDIRECT_URI isteğe bağlı, varsayılanları aşağıda)
// Deploy:
//   npx supabase functions deploy tiktok-exchange --no-verify-jwt

const ALLOWED_ORIGIN = "https://fecstudios.github.io";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code) return json({ error: "missing_code" }, 400);

  // Client key ve redirect URI gizli değil (site/config.js'te de var); sadece secret gizli.
  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "sbaw6xnir5ldz5r0v8";
  const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");
  const redirectUri = Deno.env.get("TIKTOK_REDIRECT_URI") ??
    "https://fecstudios.github.io/hacktank-site/callback.html";
  if (!clientKey || !clientSecret || !redirectUri) {
    return json({ error: "server_not_configured", detail: "TikTok secrets are not set" }, 500);
  }

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

  const userRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,username",
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  );
  const info = await userRes.json();
  if (info.error?.code && info.error.code !== "ok") {
    return json({ error: "user_info_failed", detail: info.error.message }, 400);
  }

  // Access token'ı tarayıcıya geri göndermiyoruz; ileride burada Supabase'e kaydedilecek.
  return json({ user: info.data.user, scope: token.scope });
});
