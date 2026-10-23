// Kaynak dosyalardan (TÜİK, TCMB, il/ilçe listesi) uygulamanın kullandığı data/veri.json'u üretir.
import { readFileSync, writeFileSync } from "node:fs";

const oku = (p) => readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8");
const csv = (p) => oku(p).trim().split(/\r?\n/).slice(1).map((l) => l.split(","));

const iller = JSON.parse(oku("iller.json"));
const koordinat = JSON.parse(oku("kaynak/koordinat.json"));
const tcmb = JSON.parse(oku("kaynak/tcmb-konut.json"));
const n2025 = Object.fromEntries(csv("kaynak/tuik-2025.csv").map(([il, n]) => [il.toLocaleLowerCase("tr"), +n]));
const n2021 = Object.fromEntries(csv("kaynak/tuik-2021.csv").map(([kod, n]) => [kod, +n]));

// TCMB'nin il bazında yayımlamadığı iller için Türkiye ortalamasına göre tahmini seviye çarpanı.
const SEVIYE_B = ["07", "48", "41", "16", "59", "77", "54", "09", "33"];
const SEVIYE_C = ["01", "10", "20", "21", "26", "27", "31", "38", "42", "44", "45", "46", "47", "55", "61", "63", "65", "17", "81", "22", "39", "11"];
const carpan = (kod) => (SEVIYE_B.includes(kod) ? 0.95 : SEVIYE_C.includes(kod) ? 0.7 : 0.55);
const KIRA_GETIRISI = 0.055; // yıllık brüt, tahmini

const sonuc = iller.map((il) => {
  const yeni = n2025[il.ad.toLocaleLowerCase("tr")];
  const eski = n2021[il.kod];
  if (!yeni || !eski) throw new Error("Nüfus verisi eksik: " + il.ad);
  const resmi = tcmb.satisM2[il.kod];
  const satisM2 = resmi ?? Math.round((tcmb.satisM2.TR * carpan(il.kod)) / 100) * 100;
  return {
    ...il,
    lat: koordinat[il.kod][0],
    lng: koordinat[il.kod][1],
    nufus: yeni,
    buyume: Math.round((Math.pow(yeni / eski, 1 / 4) - 1) * 10000) / 10, // binde, yıllık ortalama
    satisM2,
    satisKaynak: resmi ? "TCMB" : "tahmini",
    kiraM2: Math.round((satisM2 * KIRA_GETIRISI) / 12),
  };
});

const veri = {
  guncelleme: new Date().toISOString().slice(0, 10),
  kaynaklar: [
    "Nüfus: TÜİK ADNKS 2025 ve 2021 (yıllık ortalama artış 2021–2025)",
    `Konut m² fiyatı: ${tcmb.kaynak}, ${tcmb.donem} — İstanbul, Ankara, İzmir ve Türkiye geneli resmi; diğer iller tahmini`,
    "Kira: %5,5 brüt getiri varsayımıyla tahmini",
    "İl/ilçe listesi: PTT (turkey-neighbourhoods)",
  ],
  konutDonemi: tcmb.donem,
  nufusYili: 2025, // TÜİK ADNKS; yeni yıl yayımlanınca kaynak/tuik-2025.csv güncellenmeli
  iller: sonuc,
};
writeFileSync(new URL("../data/veri.json", import.meta.url), JSON.stringify(veri));
console.log("veri.json:", sonuc.length, "il");
