// Giriş yapmış kullanıcının KENDİ TikTok hesabının son 10 repost'unu Apify ile çeker,
// public.reposts tablosuna yazar.
//
// İstek: POST (gövde gerekmez)  +  Authorization: Bearer <Supabase access token>
// Kullanıcı adı istekten DEĞİL, profiles tablosundan (Login Kit ile doğrulanmış) alınır.
//
// Bütçe korumaları (Apify sonuç başına ücret alıyor):
//   - Son 24 saatte başarılı çekim varsa Apify'a gitmez, mevcut repost'ları döndürür.
//   - Aynı kullanıcı için 10 dakikada bir denemeden fazlasına izin vermez.
//   - Ay içindeki toplam Apify çalıştırması MONTHLY_RUN_LIMIT'i geçerse durur.
//   - RESULTS_PER_PROFILE kodda sabit, istemciden gelmez.
//   (İkinci katman: Apify panelinde Billing -> Limits'ten aylık sert limit koy.)
//
// Gerekli secret: APIFY_TOKEN
// Deploy: npx supabase functions deploy fetch-reposts --no-verify-jwt
//   (JWT'yi aşağıda kendimiz doğruluyoruz.)

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://fecstudios.github.io", "http://localhost:5174"];
const ACTOR = "clockworks~tiktok-scraper";
const RESULTS_PER_PROFILE = 10;
const MIN_REPOSTS_FOR_FEED = 5;
const CACHE_HOURS = 24 * 6.5;
const RETRY_MINUTES = 10;
const MONTHLY_RUN_LIMIT = 120; // ~$0.038 x 120 ≈ $4.6 (Apify free: $5/ay)

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apifyToken = Deno.env.get("APIFY_TOKEN");
  if (!supabaseUrl || !serviceKey || !apifyToken) return json({ error: "server_not_configured" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1) Kim istiyor?
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "not_logged_in", detail: "Please log in first." }, 401);
  const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !user) return json({ error: "not_logged_in", detail: "Your session expired. Please log in again." }, 401);

  const { data: profile } = await admin
    .from("profiles").select("tiktok_username").eq("id", user.id).single();
  const username = profile?.tiktok_username;
  if (!username) return json({ error: "tiktok_not_connected", detail: "Connect your TikTok account first." }, 400);

  const currentReposts = async () => {
    const { count } = await admin
      .from("reposts").select("*", { count: "exact", head: true })
      .eq("profile_id", user.id).eq("broken", false);
    return count ?? 0;
  };

  // 2) Önbellek ve limitler
  const { data: lastOk } = await admin
    .from("scrape_log").select("ran_at")
    .eq("profile_id", user.id).eq("ok", true).gte("ran_at", hoursAgo(CACHE_HOURS))
    .limit(1);
  if (lastOk?.length) {
    const count = await currentReposts();
    return json({ cached: true, count, ready: count >= MIN_REPOSTS_FOR_FEED });
  }

  const { data: recentTry } = await admin
    .from("scrape_log").select("ran_at")
    .eq("profile_id", user.id).gte("ran_at", hoursAgo(RETRY_MINUTES / 60))
    .limit(1);
  if (recentTry?.length) {
    return json({ error: "too_many_requests", detail: `Please wait ${RETRY_MINUTES} minutes before trying again.` }, 429);
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count: monthRuns } = await admin
    .from("scrape_log").select("*", { count: "exact", head: true })
    .gte("ran_at", monthStart.toISOString());
  if ((monthRuns ?? 0) >= MONTHLY_RUN_LIMIT) {
    return json({ error: "monthly_limit", detail: "tiq is very popular right now. Please try again later." }, 503);
  }

  // 3) Apify
  const log = (ok: boolean, result_count: number) =>
    admin.from("scrape_log").insert({ profile_id: user.id, ok, result_count });

  let items: any[];
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=120`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apifyToken}` },
        body: JSON.stringify({
          profiles: [username],
          profileScrapeSections: ["reposts"],
          resultsPerPage: RESULTS_PER_PROFILE,
          profileSorting: "latest",
          excludePinnedPosts: false,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
          shouldDownloadSlideshowImages: false,
          shouldDownloadAvatars: false,
          shouldDownloadMusicCovers: false,
          scrapeRelatedVideos: false,
          commentsPerPost: 0,
          maxFollowersPerProfile: 0,
          maxFollowingPerProfile: 0,
        }),
        signal: AbortSignal.timeout(130_000),
      },
    );
    if (!res.ok) throw new Error(`Apify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    items = await res.json();
  } catch (e) {
    await log(false, 0);
    console.error("apify_failed", String(e));
    return json({ error: "fetch_failed", detail: "Could not load your reposts. Please try again later." }, 502);
  }

  // 4) Sadece geçerli repost satırları (error satırlarını at), en fazla 10, tekrarsız
  const seen = new Set<string>();
  const rows = items
    .filter((it) => !it.error && it.id && (it.fromProfileSection ?? "reposts") === "reposts")
    .filter((it) => (seen.has(String(it.id)) ? false : (seen.add(String(it.id)), true)))
    .slice(0, RESULTS_PER_PROFILE)
    .map((it, i) => ({
      profile_id: user.id,
      video_id: String(it.id),
      author: it.authorMeta?.name ?? null,
      position: i + 1,
      broken: false,
    }));

  // 5) Eski listeyi yenisiyle değiştir
  const { error: delError } = await admin.from("reposts").delete().eq("profile_id", user.id);
  const { error: insError } = rows.length ? await admin.from("reposts").insert(rows) : { error: null };
  if (delError || insError) {
    await log(false, rows.length);
    return json({ error: "db_error", detail: (delError ?? insError)!.message }, 500);
  }

  const ready = rows.length >= MIN_REPOSTS_FOR_FEED;
  await admin.from("profiles").update({ reposts_ready: ready }).eq("id", user.id);
  await log(true, rows.length);

  return json({ cached: false, count: rows.length, ready });
});
