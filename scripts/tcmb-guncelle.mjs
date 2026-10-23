// EVDS_API_KEY tanımlıysa TCMB EVDS'den konut birim fiyatlarının son değerlerini çekip
// data/kaynak/tcmb-konut.json'u günceller. Hata olursa mevcut veriyi korur.
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
  if (!r.ok) throw new Error(`${r.status} ${yol}`);
  return r.json();
};
const BOLGE = { TR: /türkiye|turkey/i, "34": /istanbul|İstanbul/i, "06": /ankara/i, "35": /izmir|İzmir/i };

try {
  // "Birim Fiyat" adını taşıyan konut serilerini kategori → veri grubu → seri sırasıyla bul.
  const kategoriler = await al("categories/type=json");
  let seriler = [];
  for (const k of kategoriler.filter((k) => /konut|housing/i.test(k.TOPIC_TITLE_TR + k.TOPIC_TITLE_ENG))) {
    const gruplar = await al(`datagroups/mode=2&code=${k.CATEGORY_ID}&type=json`);
    for (const g of gruplar.filter((g) => /birim fiyat/i.test(g.DATAGROUP_NAME))) {
      seriler.push(...(await al(`serieList/type=json&code=${g.DATAGROUP_CODE}`)));
    }
  }
  const tcmb = JSON.parse(readFileSync(DOSYA, "utf8"));
  const bitis = new Date();
  const baslangic = new Date(bitis.getFullYear() - 1, 0, 1);
  const tarih = (d) => `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  let guncellenen = 0;
  for (const [kod, re] of Object.entries(BOLGE)) {
    const s = seriler.find((s) => re.test(s.SERIE_NAME));
    if (!s) continue;
    const d = await al(`series=${s.SERIE_CODE}&startDate=${tarih(baslangic)}&endDate=${tarih(bitis)}&type=json`);
    const alan = s.SERIE_CODE.replaceAll(".", "_");
    const son = d.items.filter((x) => x[alan] != null).at(-1);
    if (!son) continue;
    tcmb.satisM2[kod] = Math.round(Number(son[alan]));
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
