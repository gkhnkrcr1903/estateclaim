// TÜİK ADNKS il profil verilerini (yaş, medeni durum, hane yapısı, ilçe nüfusları) nufusune.com'un
// il sayfalarından çekip data/kaynak/tuik-profil.json'a yazar. Site, TÜİK verisini il bazında derler.
// TÜİK yeni yılı yayımladığında (Şubat) yeniden çalıştırılır: node scripts/tuik-profil-cek.mjs
// Siteyi yormamak için istekler arasında 1 saniye beklenir.
import { readFileSync, writeFileSync } from "node:fs";

const iller = JSON.parse(readFileSync(new URL("../data/iller.json", import.meta.url), "utf8"));
const HEDEF = new URL("../data/kaynak/tuik-profil.json", import.meta.url);

const slug = (ad) =>
  ad.replaceAll("İ", "i").replaceAll("I", "ı").toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-");
// "20,9," gibi cümle noktalamasıyla biten yakalamalarda sondaki işaret atılır; sayıya çevrilemeyen değer null olur.
const sayi = (s) => {
  if (s == null) return null;
  const n = Number(s.replace(/[.,]+$/, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

function metin(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").replace(/&bull;/g, "•")
    .replace(/\s+/g, " ");
}

function ayristir(t, ilceAdlari) {
  const bul = (re) => sayi(t.match(re)?.[1]);
  const profil = {
    ortancaYas: bul(/ortanca yaşı \d{4} ADNKS verilerine göre ([\d,]+)/),
    yas0_14: bul(/0-14 yaş %([\d,]+)/),
    yas15_64: bul(/15-64 yaş %([\d,]+)/),
    yas65: bul(/65 yaş ve üzeri %([\d,]+)/),
    hicEvlenmemis: bul(/Hiç evlenmemiş %([\d,]+)/),
    evli: bul(/Evli %([\d,]+)/),
    bosanmis: bul(/Boşanmış %([\d,]+)/),
    esiOlmus: bul(/Eşi ölmüş %([\d,]+)/),
    haneBuyuklugu: bul(/hane halkı büyüklüğü ([\d,]+) kişidir/),
    haneSayisi: bul(/Hanehalkı tipleri \(([\d.]+) hanehalkı\)/),
    tekKisilik: bul(/Tek kişilik %([\d,]+)/),
    cekirdekAile: bul(/Çekirdek aile %([\d,]+)/),
    genisAile: bul(/Geniş aile %([\d,]+)/),
    cocukBagimlilik: bul(/çocuk bağımlılık oranı ([\d,]+)/),
    yasliBagimlilik: bul(/yaşlı bağımlılık oranı ([\d,]+)/),
    dogurganlik: bul(/toplam doğurganlık hızı ([\d,]+)/),
    // Ek ünlü uyumuna göre değişir: "%28,2'si", "%26,0'sı", "%30'u" …
    yerliOrani: bul(/yaşayanların %([\d,]+)'[a-zçğıöşü]* nüfusa buraya kayıtlı/),
    yogunluk: bul(/Nüfus Yoğunluğu ([\d.]+) kişi\/km²/),
    yabanci: bul(/Yabancı Nüfus ([\d.]+)/),
    ilceler: {},
  };
  // "İlçe Adı Toplam Erkek Kadın Yüzde" tablosu: <ad> <toplam> <erkek> <kadın> %<pay>
  const tablo = t.slice(t.indexOf("İlçe Adı Toplam Erkek Kadın Yüzde"));
  for (const ad of ilceAdlari) {
    const kacis = ad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = tablo.match(new RegExp(`(?:^|\\s)${kacis} ([\\d.]+) ([\\d.]+) ([\\d.]+) %([\\d,]+)`));
    if (m) profil.ilceler[ad] = { nufus: sayi(m[1]), erkek: sayi(m[2]), kadin: sayi(m[3]), pay: sayi(m[4]) };
  }
  return profil;
}

const sonuc = { kaynak: "TÜİK ADNKS 2025 (nufusune.com derlemesi)", cekilme: new Date().toISOString().slice(0, 10), iller: {} };
let eksik = 0;
for (const il of iller) {
  const url = `https://www.nufusune.com/${slug(il.ad)}-nufusu`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (arsa-analiz veri güncelleme)" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const t = metin(await r.text());
    const p = ayristir(t, il.ilceler);
    // Türkiye karşılaştırma değerleri her il sayfasında yazar; ilk bulunanı al.
    sonuc.turkiye ??= {
      ortancaYas: sayi(t.match(/Türkiye ortancası \(([\d,]+)\)/)?.[1]),
      haneBuyuklugu: sayi(t.match(/\(Türkiye: ([\d,]+)\)/)?.[1]),
      yas65: sayi(t.match(/Türkiye genelinde 65 yaş ve üzeri oranı %([\d,]+)/)?.[1]),
      dogurganlik: sayi(t.match(/doğurganlık hızı [\d,]+'?[a-zçğıöşü]* \(Türkiye: ([\d,]+)\)/)?.[1]),
    };
    const bos = Object.entries(p).filter(([k, v]) => k !== "ilceler" && v == null).map(([k]) => k);
    const ilceBulunan = Object.keys(p.ilceler).length;
    if (bos.length || ilceBulunan < il.ilceler.length) {
      eksik++;
      console.log(`UYARI ${il.ad}: boş alanlar [${bos.join(", ")}], ilçe ${ilceBulunan}/${il.ilceler.length}`);
    }
    sonuc.iller[il.kod] = p;
    process.stdout.write(`${il.kod} ${il.ad} ✓\n`);
  } catch (e) {
    eksik++;
    console.log(`HATA ${il.ad} (${url}): ${e.message}`);
  }
  await bekle(1000);
}

writeFileSync(HEDEF, JSON.stringify(sonuc, null, 1) + "\n");
console.log(`Bitti: ${Object.keys(sonuc.iller).length} il yazıldı, ${eksik} ilde uyarı/hata.`);
