// OpenStreetMap'ten (Overpass API, ODbL) 81 ilin hastane, okul ve AVM'lerini çekip il başına küçük dosyalar yazar:
// public/yakin/{ilKodu}.json. "Bu ev alınır mı?" sayfası yalnızca seçilen ilin dosyasını indirir.
// Arada bir (birkaç ayda bir) elle çalıştırılır: node scripts/yakin-yerler-cek.mjs   (~10–20 dk)
// Tek il: node scripts/yakin-yerler-cek.mjs 34 · Yalnızca dosyası olmayan iller: node scripts/yakin-yerler-cek.mjs eksik
//
// Boyutu küçük tutmak için: adı olmayan ve hastane/okul sayılmayan kayıtlar (ASM, poliklinik, kurs, anaokulu…)
// atılır, koordinat 4 ondalığa (~10 m) yuvarlanır, her kayıt [tür, alt bilgi, ad, enlem, boylam] dizisidir.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const iller = JSON.parse(readFileSync(new URL("../data/iller.json", import.meta.url), "utf8"));
const HEDEF = new URL("../public/yakin/", import.meta.url);
mkdirSync(HEDEF, { recursive: true });

const SUNUCULAR = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Sınıflama YakinYerler bileşenindeki kurallarla aynıdır (değiştirirken ikisini birlikte güncelleyin).
const HASTANE_DISI = /aile sağlığı|asm\b|sağlık ocağı|ağız ve diş|diş hastanesi|veteriner|tıbbiye binası|polikl?in|dispanser|tıp merkezi|sağlık merkezi|laboratuvar|fizik tedavi|diyaliz|görüntüleme/i;
// OSM adlarında "Egitim", "Etüd" gibi Türkçe karakter ve yazım farkları sık görülür.
const OKUL_DISI = /halk e[gğ]itim|e[gğ]itim merkezi|kurs|sürücü|dershane|etü[dt]|anaokulu|kreş|üniversite|fakülte|yüksekokul|rehabilitasyon|akademi|öğretmenevi|akşam sanat/i;
function sinifla(t) {
  const ad = (t.name ?? "").trim();
  if (!ad) return null;
  const ozel = /^özel\b|\bözel\b/i.test(ad) || t["operator:type"] === "private";
  if (t.amenity === "hospital") {
    if (HASTANE_DISI.test(ad)) return null;
    const kamu = t["operator:type"] === "government" || /devlet|şehir hastanesi|eğitim ve araştırma|numune|sağlık bakanlığı|üniversite/i.test(ad);
    return ["H", ozel ? "Özel" : kamu ? "Kamu" : "", ad];
  }
  if (t.amenity === "school") {
    if (OKUL_DISI.test(ad)) return null;
    const kademe = /lise/i.test(ad) ? "Lise" : /ortaokul/i.test(ad) ? "Ortaokul" : /ilkokul|ilköğretim/i.test(ad) ? "İlkokul" : "";
    return ["O", [ozel ? "Özel" : "Devlet", kademe].filter(Boolean).join(" · "), ad];
  }
  if (t.shop === "mall") return ["A", "", ad];
  return null;
}

async function sorgu(kod) {
  const q = `[out:json][timeout:180];area["ISO3166-2"="TR-${kod}"]->.il;(nwr(area.il)[amenity=hospital][name];nwr(area.il)[amenity=school][name];nwr(area.il)[shop=mall][name];);out center tags qt;`;
  for (let tur = 0; tur < 3; tur++) {
    for (const u of SUNUCULAR) {
      try {
        const r = await fetch(u, {
          method: "POST",
          body: "data=" + encodeURIComponent(q),
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "estateclaim-veri/1.0 (github.com/gkhnkrcr1903/estateclaim)" },
          signal: AbortSignal.timeout(200000),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return (await r.json()).elements;
      } catch (h) {
        console.log(`  ${kod} ${new URL(u).host}: ${h.message}`);
        await bekle(5000);
      }
    }
    await bekle(30000 * (tur + 1));
  }
  throw new Error("Alınamadı: " + kod);
}

const secim = process.argv[2];
const liste = iller.filter((i) => (secim === "eksik" ? !existsSync(new URL(`${i.kod}.json`, HEDEF)) : !secim || i.kod === secim));
let toplamBayt = 0;
const alinamayan = [];
for (const il of liste) {
  let elemanlar;
  try {
    elemanlar = await sorgu(il.kod);
  } catch {
    // Sunucular yoğunsa ili atla; sonra "eksik" ile yeniden denenir.
    alinamayan.push(il.ad);
    continue;
  }
  const goruldu = new Set();
  const y = [];
  for (const e of elemanlar) {
    const p = e.center ?? (e.lat !== undefined ? { lat: e.lat, lon: e.lon } : null);
    const s = e.tags && sinifla(e.tags);
    if (!p || !s) continue;
    // Aynı yer hem nokta hem alan olarak girilmiş olabilir: aynı tür ve adda, ~300 m içindekiler tekilleştirilir.
    const anahtar = `${s[0]}|${s[2]}|${p.lat.toFixed(2)}|${p.lon.toFixed(2)}`;
    if (goruldu.has(anahtar)) continue;
    goruldu.add(anahtar);
    y.push([...s, Math.round(p.lat * 1e4) / 1e4, Math.round(p.lon * 1e4) / 1e4]);
  }
  const metin = JSON.stringify({ v: 1, tarih: new Date().toISOString().slice(0, 10), y });
  writeFileSync(new URL(`${il.kod}.json`, HEDEF), metin);
  toplamBayt += metin.length;
  const say = (t) => y.filter((x) => x[0] === t).length;
  console.log(`${il.ad}: ${say("H")} hastane, ${say("O")} okul, ${say("A")} AVM — ${Math.round(metin.length / 1024)} KB`);
  await bekle(3000);
}
console.log(`Toplam ${Math.round(toplamBayt / 1024)} KB`);
if (alinamayan.length) console.log(`Alınamayan: ${alinamayan.join(", ")} — tekrar: node scripts/yakin-yerler-cek.mjs eksik`);
