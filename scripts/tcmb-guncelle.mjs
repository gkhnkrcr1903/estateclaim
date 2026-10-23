// EVDS_API_KEY tanımlıysa TCMB EVDS'den konut birim fiyatlarının son değerlerini çekip
// data/kaynak/tcmb-konut.json'u günceller. Hata olursa mevcut veriyi korur.
// Seri kodları sabit yazılmaz: "konut" + "birim fiyat" içeren veri grupları aranır ve bulunan seriler günlüğe yazılır.
import { readFileSync, writeFileSync } from "node:fs";

const KEY = process.env.EVDS_API_KEY;
const DOSYA = new URL("../data/kaynak/tcmb-konut.json", import.meta.url);
if (!KEY) {
  console.log("EVDS_API_KEY yok, TCMB verisi güncellenmedi.");
  process.exit(0);
}

const API = "https://evds2.tcmb.gov.tr/service/evds/";
const al = async (yol) => {
  const r = await fetch(API + yol, { headers: { key: KEY } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} — ${yol}`);
  return r.json();
};
// EVDS alan adları büyük harfli (SERIE_CODE vb.); küçük farklılıklara karşı anahtarı desene göre bul.
const alan = (o, re) => o[Object.keys(o).find((k) => re.test(k))];
const metin = (o) => Object.values(o).filter((v) => typeof v === "string").join(" ");
const BOLGE = { TR: /türkiye|turkey/i, "34": /i̇stanbul|istanbul/i, "06": /ankara/i, "35": /i̇zmir|izmir/i };

async function veriGruplari() {
  const uygun = (g) => /konut|housing|residential/i.test(metin(g)) && /birim fiyat|unit price/i.test(metin(g));
  try {
    const kategoriler = await al("categories/type=json");
    const gruplar = [];
    for (const k of kategoriler.filter((k) => /konut|housing|residential/i.test(metin(k)))) {
      gruplar.push(...(await al(`datagroups/mode=2&code=${alan(k, /CATEGORY_ID/i)}&type=json`)));
    }
    if (gruplar.some(uygun)) return gruplar.filter(uygun);
  } catch (e) {
    console.warn("Kategori araması başarısız, tüm veri gruplarına bakılıyor:", e.message);
  }
  return (await al("datagroups/mode=0&type=json")).filter(uygun);
}

try {
  const gruplar = await veriGruplari();
  console.log("Bulunan veri grupları:", gruplar.map((g) => `${alan(g, /DATAGROUP_CODE/i)} (${alan(g, /DATAGROUP_NAME$|DATAGROUP_NAME_TR|DATAGROUP_NAME/i)})`).join("; ") || "yok");
  const seriler = [];
  for (const g of gruplar) seriler.push(...(await al(`serieList/type=json&code=${alan(g, /DATAGROUP_CODE/i)}`)));
  console.log(`${seriler.length} seri bulundu.`);

  const tcmb = JSON.parse(readFileSync(DOSYA, "utf8"));
  const bitis = new Date();
  const baslangic = new Date(bitis.getFullYear() - 1, 0, 1);
  const tarih = (d) => `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  let guncellenen = 0;
  for (const [kod, re] of Object.entries(BOLGE)) {
    const s = seriler.find((s) => re.test(String(alan(s, /SERIE_NAME/i) ?? "")));
    if (!s) {
      console.log(`${kod}: seri bulunamadı`);
      continue;
    }
    const seriKodu = alan(s, /SERIE_CODE/i);
    const d = await al(`series=${seriKodu}&startDate=${tarih(baslangic)}&endDate=${tarih(bitis)}&type=json`);
    const sutun = seriKodu.replaceAll(".", "_");
    const son = (d.items ?? []).filter((x) => x[sutun] != null && x[sutun] !== "").at(-1);
    if (!son) {
      console.log(`${kod}: ${seriKodu} için veri yok`);
      continue;
    }
    const deger = Math.round(Number(son[sutun]));
    console.log(`${kod}: ${seriKodu} = ${deger} TL/m² (${son.Tarih})`);
    // Saçma değerlere karşı koruma: TL/m² makul aralıkta değilse yazma.
    if (!(deger > 1000 && deger < 1_000_000)) continue;
    tcmb.satisM2[kod] = deger;
    tcmb.donem = son.Tarih;
    guncellenen++;
  }
  if (guncellenen) {
    tcmb.kaynak = "TCMB EVDS Konut Birim Fiyatları";
    writeFileSync(DOSYA, JSON.stringify(tcmb, null, 2) + "\n");
  }
  console.log(`TCMB: ${guncellenen} seri güncellendi.`);
} catch (e) {
  console.warn("TCMB güncellemesi başarısız, mevcut veri kullanılacak:", e.message);
}
