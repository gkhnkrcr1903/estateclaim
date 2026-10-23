// TÜİK ADNKS ilçe nüfus serisini (2015, 2020, 2024, 2025) nufusune.com ilçe sayfalarından çekip
// data/kaynak/tuik-ilce-nufus.json'a yazar. Büyüme yönü tavsiyelerinde kullanılır.
// TÜİK yeni yılı yayımladığında (Şubat) yeniden çalıştırılır: node scripts/ilce-nufus-cek.mjs
// Siteyi yormamak için istekler arasında 1 saniye beklenir.
import { readFileSync, writeFileSync } from "node:fs";

const iller = JSON.parse(readFileSync(new URL("../data/iller.json", import.meta.url), "utf8"));
const HEDEF = new URL("../data/kaynak/tuik-ilce-nufus.json", import.meta.url);
const YILLAR = [2015, 2020, 2024, 2025];

const slug = (ad) =>
  ad.replaceAll("İ", "i").replaceAll("I", "ı").toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const metin = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

async function getir(url) {
  for (let d = 0; d < 3; d++) {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (arsa-analiz veri güncelleme)" } });
    if (r.ok) return r.text();
    await bekle(5000);
  }
  throw new Error("Alınamadı: " + url);
}

const sonuc = { kaynak: "TÜİK ADNKS (nufusune.com derlemesi)", tarih: new Date().toISOString().slice(0, 10), iller: {} };
for (const il of iller) {
  const ilHtml = await getir(`https://www.nufusune.com/${slug(il.ad)}-nufusu`);
  await bekle(1000);
  const linkler = [...new Set([...ilHtml.matchAll(/href="(\/[a-z0-9-]+-ilce-nufusu-[a-z0-9-]+)"/g)].map((m) => m[1]))];
  const ilceSlug = Object.fromEntries(il.ilceler.map((x) => [slug(x), x]));
  sonuc.iller[il.kod] = {};
  for (const l of linkler) {
    const ad = ilceSlug[l.slice(1).split("-ilce-nufusu-")[0]];
    if (!ad) continue;
    const t = metin(await getir("https://www.nufusune.com" + l));
    await bekle(1000);
    // "Yıl Toplam Erkek Kadın 2025 358.469 185.054 173.415 2024 …" tablosu
    const tablo = t.slice(t.indexOf("Yıl Toplam Erkek Kadın"));
    const seri = {};
    for (const y of YILLAR) {
      const m = new RegExp(`\\b${y} ([\\d.]+) [\\d.]+ [\\d.]+`).exec(tablo);
      if (m) seri[y] = Number(m[1].replace(/\./g, ""));
    }
    if (seri[2025]) sonuc.iller[il.kod][ad] = seri;
  }
  const eksik = il.ilceler.filter((x) => !sonuc.iller[il.kod][x]);
  console.log(il.ad, Object.keys(sonuc.iller[il.kod]).length + "/" + il.ilceler.length, eksik.length ? "eksik: " + eksik.join(",") : "");
  writeFileSync(HEDEF, JSON.stringify(sonuc));
}
