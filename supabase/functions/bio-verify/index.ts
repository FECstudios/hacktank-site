import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://fecstudios.github.io", "http://localhost:5174"];
const ACTOR = "clockworks~tiktok-scraper";

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

  const body = await req.json().catch(() => ({}));

    // 2) Kod üret
  if (body.action === "start") {
    // a) kullanıcı adını temizle
    const username = String(body.username ?? "").trim().replace(/^@/, "").toLowerCase()  // ← buraya .trim() .replace(...) .toLowerCase() ekle
    if (!/^[a-z0-9._]{2,24}$/.test(username)) return json({ error: "bad_username" }, 400);

    // b) başkası almış mı?
    const { data: taken } = await admin
      .from("profiles").select("id")
      .eq("tiktok_username", username)
      .neq("id", user.id)
      .limit(1);
    if (taken?.length) return json({ error: "username_taken" }, 409);

    // c) kod üret
    const WORDS = ["mango", "rocket", "cactus", "noodle", "pixel", "turbo", "banana", "goblin", "waffle", "sigma", "laser", "pickle", "nebula", "toast", "ninja", "disco", "potato", "zebra", "comet", "bubble"];
    const pick = () => WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDS.length];
    const num = () => crypto.getRandomValues(new Uint32Array(1))[0] % 90 + 10;
    const code = `tiq-${pick()}-${pick()}-${num()}`;

        // b2) daha önce kod almış mı? (sayaç sıfırlanmasın diye)
    const { data: old } = await admin
      .from("verify_codes")                        // hangi tablo?
      .select("attempts, created_at")    // sadece lazım olan iki sütun
      .eq("profile_id", user.id)                 // hangi sütun bu kullanıcıyı gösteriyor?
      .maybeSingle();                    // satır yoksa hata değil, null
    const recent = old && Date.now() - new Date(old.created_at).getTime() < 30 * 60_000
    const attempts = recent ? old.attempts : 0;

    // d) kaydet (upsert)
    const { error: saveError } = await admin.from("verify_codes").upsert({
      profile_id: user.id,
      username: username,
      code: code,
      attempts: attempts,
      created_at: new Date().toISOString(),
    });
    if (saveError) return json({ error: "db_error", detail: saveError.message }, 500);

    return json({ code });
  }


  if(body.action === "check") {
    const {data: row } = await admin
        .from("verify_codes").select("*").eq("profile_id", user.id).single();
        if(!row) return json({error: "no_code", detail: "Get a code first."}, 400);

        if(Date.now() - new Date(row.created_at).getTime() > 30 * 60_000) {
            return json({ error: "code_expired", detail: "Your code expired. Get a new one."}, 400);
        }
        //MAX 5
        if (row.attempts >= 5) {
            return json({error: "too_many_attempts", detail: "Too many tries. Get a new code."}, 429);
        }
        await admin.from("verify_codes").update({ attempts: row.attempts + 1}).eq("profile_id", user.id);
  
        let items: any[] = [];
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=90`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apifyToken}` },
          body: JSON.stringify({
            profiles: [row.username],
            profileScrapeSections: ["videos"],
            resultsPerPage: 1,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
            shouldDownloadAvatars: false,
          }),
          signal: AbortSignal.timeout(100_000),
        },
      );
      if (!res.ok) throw new Error(`Apify HTTP ${res.status}`);
      items = await res.json();
    } catch (e) {
      console.error("apify_failed", String(e));
      return json({ error: "fetch_failed", detail: "Could not read your profile. Try again." }, 502);
    }
    const meta = items.find((it) => it.authorMeta)?.authorMeta;
    if (!meta) return json({ error: "profile_not_found", detail: "Profile not found, or it is private"}, 404)

    const bio = String(meta.signature ?? "").toLowerCase();
    if (!bio.includes(row.code)) {
        return json({ ok: false, attemptsLeft: 4 - row.attempts, detail: "Code not found..." });
    }

    const { error: dbError} = await admin.from("profiles").update({
        tiktok_username: row.username,
        display_name: meta.nickName ?? null,
        avatar_url: meta.avatar ?? null,
    }).eq("id", user.id);
    if (dbError) {
        if (dbError.code === "23505") return json({ error: "username_taken"}, 409);
        return json({ error: "db_error", detail: dbError.message }, 500);
    }
    await admin.from("verify_codes").delete().eq("profile_id", user.id);
    return json({ ok: true, username: row.username });

    }

  return json({ error: "unknown_action" }, 400);
});
