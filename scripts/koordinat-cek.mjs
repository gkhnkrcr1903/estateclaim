// Wikidata'dan (CC0) ilçe ve mahalle koordinatlarını çeker, PTT il/ilçe/mahalle adlarıyla eşleştirir.
// Çıktı: data/kaynak/ilce-koordinat.json ve data/kaynak/mahalle-koordinat.json. Elle çalıştırılır:
//   node scripts/koordinat-cek.mjs
// Eşleşmeyen ilçe/mahalle olursa uygulama il (veya ilçe) merkezini kullanır ve konumu "yaklaşık" sayar.
import { readFileSync, writeFileSync } from "node:fs";

const yol = (p) => new URL(`../data/${p}`, import.meta.url);
const iller = JSON.parse(readFileSync(yol("iller.json"), "utf8"));
const ilKoord = JSON.parse(readFileSync(yol("kaynak/koordinat.json"), "utf8"));

async function sorgu(q, deneme = 0) {
  const r = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "User-Agent": "estateclaim-veri/1.0", "Content-Type": "application/x-www-form-urlencoded" },
    body: "query=" + encodeURIComponent(q),
  });
  // Yoğunlukta 429/502 döner; birkaç kez bekleyip yeniden dene.
  if ((r.status === 429 || r.status >= 500) && deneme < 4) {
    await new Promise((t) => setTimeout(t, 30000 * (deneme + 1)));
    return sorgu(q, deneme + 1);
  }
  if (!r.ok) throw new Error("Wikidata " + r.status);
  return (await r.json()).results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
}

const nokta = (s) => {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(s);
  return m ? [Math.round(+m[2] * 1e4) / 1e4, Math.round(+m[1] * 1e4) / 1e4] : null;
};
const sade = (s) =>
  s
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/,.*$/, "")
    .replace(/\s+(mahallesi|mah\.?|köyü|ilçesi)$/i, "")
    .toLocaleLowerCase("tr")
    .replace(/[^a-zçğıöşü0-9]/g, "");
const km = (a, b) => {
  const r = Math.PI / 180;
  const x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r);
  return Math.hypot(x, (b[0] - a[0]) * r) * 6371;
};

// "district of Turkey" (Q1147395) ve "mahalle" (Q17051044) / "village of Turkey" (Q1529096; büyükşehirlerde köyler mahalle oldu); üst birim (P131) ve Türkçe adlarla.
const ilceSatir = await sorgu(`SELECT ?ad ?il ?coord WHERE { ?d wdt:P31 wd:Q1147395; wdt:P625 ?coord; rdfs:label ?ad. FILTER(lang(?ad)="tr")
  OPTIONAL { ?d wdt:P131 ?p. ?p rdfs:label ?il. FILTER(lang(?il)="tr") } }`);
const mahSorgu = (sinif) => sorgu(`SELECT ?ad ?ust ?coord WHERE { ?m wdt:P31 wd:${sinif}; wdt:P625 ?coord; rdfs:label ?ad. FILTER(lang(?ad)="tr")
  OPTIONAL { ?m wdt:P131 ?u. ?u rdfs:label ?ust. FILTER(lang(?ust)="tr") } }`);
// Köy sorgusu ağır olduğundan üst birim istenmez; eşleşme ilçe merkezine uzaklıkla yapılır.
const koySatir = await sorgu(`SELECT ?ad ?coord WHERE { ?m wdt:P31 wd:Q1529096; wdt:P625 ?coord; rdfs:label ?ad. FILTER(lang(?ad)="tr") }`);
const mahSatir = [...(await mahSorgu("Q17051044")), ...koySatir];
// İlçe sınıfı atanmamış kayıtlar için yedek: kasaba, şehir, belediye (yalnızca il içinde aranır).
const yedekSatir = await sorgu(`SELECT ?ad ?il ?coord WHERE { VALUES ?c { wd:Q3957 wd:Q515 wd:Q15284 wd:Q2460358 wd:Q1278352 } ?d wdt:P31 ?c; wdt:P17 wd:Q43; wdt:P625 ?coord; rdfs:label ?ad. FILTER(lang(?ad)="tr")
  OPTIONAL { ?d wdt:P131 ?p. ?p rdfs:label ?il. FILTER(lang(?il)="tr") } }`);
console.log("Wikidata:", ilceSatir.length, "ilçe,", mahSatir.length, "mahalle satırı");

const ilceSonuc = {};
const mahSonuc = {};
let ilceToplam = 0, ilceBulunan = 0, mahToplam = 0, mahBulunan = 0;

for (const il of iller) {
  const merkez = ilKoord[il.kod];
  const ilAd = sade(il.ad);
  // İl sınırları içinde kalabilecek adaylar (il merkezine 200 km).
  const adaylar = ilceSatir.map((s) => ({ ...s, k: nokta(s.coord), a: sade(s.ad), u: s.il ? sade(s.il) : "" })).filter((s) => s.k && km(s.k, merkez) < 200);
  const yedek = yedekSatir.map((s) => ({ ...s, k: nokta(s.coord), a: sade(s.ad), u: s.il ? sade(s.il) : "" })).filter((s) => s.k && km(s.k, merkez) < 200);
  ilceSonuc[il.kod] = {};
  for (const ilce of il.ilceler) {
    ilceToplam++;
    // Merkez ilçe il merkezinin kendisidir; Wikidata'daki "Merkez" adlı kayıtlar başka yerlere karışıyor.
    if (ilce === "Merkez") {
      ilceSonuc[il.kod][ilce] = merkez;
      ilceBulunan++;
      continue;
    }
    const hedef = [sade(ilce)];
    const uyan = adaylar.filter((s) => hedef.includes(s.a));
    let sec = uyan.find((s) => s.u === ilAd) ?? (uyan.length === 1 ? uyan[0] : uyan.sort((x, y) => km(x.k, merkez) - km(y.k, merkez))[0]);
    if (!sec) sec = yedek.filter((s) => hedef.includes(s.a) && (s.u === ilAd || s.u === hedef[0] || km(s.k, merkez) < 120)).sort((x, y) => (y.u === ilAd) - (x.u === ilAd) || km(x.k, merkez) - km(y.k, merkez))[0];
    if (sec) (ilceSonuc[il.kod][ilce] = sec.k), ilceBulunan++;
  }

  // Mahalleler: adı eşleşen ve ilçe merkezine 40 km'den yakın olan Wikidata kaydı.
  const ilMah = mahSatir.map((s) => ({ k: nokta(s.coord), a: sade(s.ad), u: s.ust ? sade(s.ust) : "" })).filter((s) => s.k && km(s.k, merkez) < 200);
  const adIndeks = new Map();
  for (const s of ilMah) (adIndeks.get(s.a) ?? adIndeks.set(s.a, []).get(s.a)).push(s);
  mahSonuc[il.kod] = {};
  for (const ilce of il.ilceler) {
    const ik = ilceSonuc[il.kod][ilce];
    const ilceAd = ilce === "Merkez" ? ilAd : sade(ilce);
    const liste = {};
    for (const mah of il.mahalleler[ilce] ?? []) {
      mahToplam++;
      const uyan = adIndeks.get(sade(mah)) ?? [];
      const sec = uyan.find((s) => s.u === ilceAd && (!ik || km(s.k, ik) < 40)) ?? (ik ? uyan.filter((s) => km(s.k, ik) < 25).sort((x, y) => km(x.k, ik) - km(y.k, ik))[0] : undefined);
      if (sec) (liste[mah] = sec.k), mahBulunan++;
    }
    if (Object.keys(liste).length) mahSonuc[il.kod][ilce] = liste;
  }
}

writeFileSync(yol("kaynak/ilce-koordinat.json"), JSON.stringify({ kaynak: "Wikidata (CC0)", tarih: new Date().toISOString().slice(0, 10), ilceler: ilceSonuc }));
writeFileSync(yol("kaynak/mahalle-koordinat.json"), JSON.stringify({ kaynak: "Wikidata (CC0)", tarih: new Date().toISOString().slice(0, 10), mahalleler: mahSonuc }));
console.log(`İlçe: ${ilceBulunan}/${ilceToplam}, mahalle: ${mahBulunan}/${mahToplam}`);
