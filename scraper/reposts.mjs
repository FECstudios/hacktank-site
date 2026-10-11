// Kullanım: node reposts.mjs <kullaniciadi> [--headed]
// Profilin Reposts sekmesini açar, TikTok'un kendi /api/repost/item_list isteklerini dinler
// ve sayfayı kaydırarak tüm repost'ları JSON olarak toplar.
import { chromium } from "playwright";

const username = process.argv[2]?.replace(/^@/, "");
if (!username) {
  console.error("Kullanım: node reposts.mjs <kullaniciadi>");
  process.exit(1);
}
const headed = process.argv.includes("--headed");

const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage({ locale: "en-US", viewport: { width: 1280, height: 900 } });

const reposts = new Map();
let hasMore = true;
let apiCalls = 0;

page.on("response", async (res) => {
  if (!res.url().includes("/api/repost/item_list")) return;
  apiCalls++;
  try {
    const data = await res.json();
    for (const item of data.itemList ?? []) {
      reposts.set(item.id, {
        id: item.id,
        url: `https://www.tiktok.com/@${item.author?.uniqueId}/video/${item.id}`,
        author: item.author?.uniqueId,
        desc: item.desc,
        plays: item.stats?.playCount,
      });
    }
    hasMore = Boolean(data.hasMore);
  } catch {
    // boş veya JSON olmayan cevap: TikTok bot sandı olabilir
  }
});

await page.goto(`https://www.tiktok.com/@${username}`, { waitUntil: "domcontentloaded" });

const repostTab = page.locator('[data-e2e="repost-tab"], [role="tab"]:has-text("Reposts")').first();
try {
  await repostTab.waitFor({ timeout: 15000 });
} catch {
  console.error("Reposts sekmesi bulunamadı (gizli hesap, repost yok ya da TikTok sayfayı engelledi).");
  await page.screenshot({ path: "debug.png" });
  await browser.close();
  process.exit(2);
}
await repostTab.click();

// Yeni repost gelmeyene kadar aşağı kaydır
let lastCount = -1;
for (let i = 0; i < 30 && hasMore; i++) {
  await page.waitForTimeout(1500 + Math.random() * 1000);
  if (reposts.size === lastCount && i > 2) break;
  lastCount = reposts.size;
  await page.mouse.wheel(0, 4000);
}

console.error(`API çağrısı: ${apiCalls}, repost: ${reposts.size}`);
console.log(JSON.stringify([...reposts.values()], null, 2));
await browser.close();
