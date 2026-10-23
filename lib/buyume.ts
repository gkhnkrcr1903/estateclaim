import { ilMeta } from "./iller-meta";
import { ilceKonumu } from "./arsa";
import { bolgeCarpani, ilceKademesiVar } from "./konut";

// İlçe nüfus artışından (TÜİK ADNKS 2020→2025) ve gerçek ilçe koordinatlarından ilin büyüme yönünü,
// büyüyen ilçeleri ve yatırım yönünü çıkarır. Mahalle bazında artış verisi olmadığından analiz ilçe düzeyindedir.

export interface IlceBuyumesi {
  ad: string;
  nufus: number;
  artis5: number; // 2020→2025, %
  artis1: number | null; // 2024→2025, %
  kazanc: number; // 5 yılda kişi
  yon: string | null; // il merkezine göre (yakınsa null)
  km: number;
}

export interface BuyumeAnalizi {
  ilArtis5: number;
  ilceler: IlceBuyumesi[]; // artış hızına göre
  yon: string | null; // nüfus kazancının ağırlıklı yönü
  yonGucu: number; // 0–1
  merkezPayi: number; // kazancın merkeze 10 km içindeki ilçelerdeki payı, %
  yatirim: IlceBuyumesi[]; // hızlı büyüyen ve görece uygun ilçeler
  fiyatBilgisi: boolean; // ilçe fiyat kademesi biliniyor mu
  donem: string;
}

const YONLER = ["doğu", "kuzeydoğu", "kuzey", "kuzeybatı", "batı", "güneybatı", "güney", "güneydoğu"];

function vektor(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const x = (b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180) * 111;
  const y = (b.lat - a.lat) * 111;
  return { x, y, km: Math.hypot(x, y) };
}
const yonAdi = (x: number, y: number) => YONLER[Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) / 45) % 8];
const yuzde = (a?: number, b?: number) => (a && b ? Math.round((b / a - 1) * 1000) / 10 : null);

export function buyumeAnalizi(ilKod: string): BuyumeAnalizi | null {
  const m = ilMeta(ilKod);
  const seri = m.ilceNufusSeri;
  if (!seri || !Object.keys(seri).length) return null;
  const merkez = m.ilceler.includes("Merkez") ? ilceKonumu(ilKod, "Merkez") : { lat: m.lat, lng: m.lng };

  const ilceler: IlceBuyumesi[] = [];
  for (const ad of m.ilceler) {
    const s = seri[ad];
    const n2020 = s?.[2020], n2025 = s?.[2025];
    const artis5 = yuzde(n2020, n2025);
    if (!s || !n2020 || !n2025 || artis5 === null) continue;
    const k = ilceKonumu(ilKod, ad);
    const v = vektor(merkez, k);
    ilceler.push({
      ad,
      nufus: n2025,
      artis5,
      artis1: yuzde(s[2024], s[2025]),
      kazanc: n2025 - n2020,
      yon: k.yaklasik || v.km < 10 ? null : yonAdi(v.x, v.y),
      km: Math.round(v.km),
    });
  }
  if (!ilceler.length) return null;

  // Nüfus kazancı ağırlıklı yön: kazanan ilçelerin merkeze göre konumlarının ortalaması.
  let sx = 0, sy = 0, top = 0, merkezde = 0;
  for (const i of ilceler) {
    if (i.kazanc <= 0) continue;
    top += i.kazanc;
    const k = ilceKonumu(ilKod, i.ad);
    const v = vektor(merkez, k);
    if (k.yaklasik || v.km < 10) { merkezde += i.kazanc; continue; }
    sx += (v.x / v.km) * i.kazanc;
    sy += (v.y / v.km) * i.kazanc;
  }
  const yonGucu = top ? Math.hypot(sx, sy) / top : 0;

  const t2020 = ilceler.reduce((t, i) => t + (seri[i.ad][2020] ?? 0), 0);
  const t2025 = ilceler.reduce((t, i) => t + i.nufus, 0);
  const ilArtis5 = Math.round((t2025 / t2020 - 1) * 1000) / 10;

  const sirali = [...ilceler].sort((a, b) => b.artis5 - a.artis5);
  const fiyatBilgisi = ilceKademesiVar(ilKod);
  // Yatırım yönü: il ortalamasından hızlı büyüyen, küçük olmayan (10 bin+) ve fiyatı il ortalamasını aşmayan ilçeler.
  const yatirim = sirali
    .filter((i) => i.artis5 > Math.max(ilArtis5, 0) + 2 && i.nufus >= 10000 && (!fiyatBilgisi || bolgeCarpani(ilKod, i.ad).satis <= 1.05))
    .slice(0, 3);

  return {
    ilArtis5,
    ilceler: sirali,
    yon: yonGucu >= 0.25 ? yonAdi(sx, sy) : null,
    yonGucu: Math.round(yonGucu * 100) / 100,
    merkezPayi: top ? Math.round((merkezde / top) * 100) : 0,
    yatirim,
    fiyatBilgisi,
    donem: "2020–2025",
  };
}

const f = (n: number) => (n > 0 ? "+" : "") + n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

// "İleriye dönük tavsiyeler" bölümüne eklenen büyüme yönü, imar ve yatırım yönü maddeleri.
export function buyumeTavsiyeleri(ilKod: string, ilce?: string): string[] {
  const b = buyumeAnalizi(ilKod);
  const m = ilMeta(ilKod);
  const t: string[] = [];
  if (b) {
    const hizli = b.ilceler.filter((i) => i.nufus >= 10000).slice(0, 3);
    const azalan = b.ilceler.filter((i) => i.artis5 < 0).map((i) => i.ad);
    t.push(
      `Büyüme yönü (TÜİK ${b.donem}): ${m.ad} nüfusu 5 yılda %${f(b.ilArtis5)} değişti. ` +
        (b.yon
          ? `Nüfus kazancı ağırlıkla ilin ${b.yon} tarafındaki ilçelerde toplanıyor; şehir bu yöne doğru büyüyor.`
          : b.merkezPayi >= 50
            ? `Nüfus kazancının %${b.merkezPayi}'i merkez ve çevresindeki ilçelerde; şehir belirgin bir yöne değil, merkez çevresinde büyüyor.`
            : "Nüfus kazancı farklı yönlere dağılmış; belirgin tek bir büyüme yönü yok.") +
        (hizli.length ? ` En hızlı büyüyenler: ${hizli.map((i) => `${i.ad} (%${f(i.artis5)}${i.yon ? `, ${i.yon}` : ""})`).join(", ")}.` : ""),
    );
    if (azalan.length) t.push(`Nüfusu azalan ilçeler: ${azalan.slice(0, 6).join(", ")}${azalan.length > 6 ? ` ve ${azalan.length - 6} ilçe daha` : ""}. Bu ilçelerde yeni konut talebi zayıf, arsa değer artışı sınırlı kalabilir.`);

    if (b.yatirim.length)
      t.push(
        `Yatırım yönü: ${b.yatirim.map((i) => i.ad).join(", ")} hem il ortalamasından hızlı büyüyor ${b.fiyatBilgisi ? "hem de fiyat seviyesi il ortalamasını aşmıyor" : "(ilçe fiyat farkları bu il için bilinmiyor)"}. ` +
          "Büyüyen ilçelerde değer artışı çoğunlukla yeni imara açılan çeper bölgelerde, ana yol ve toplu taşıma akslarında olur.",
      );
    else t.push("Yatırım yönü: il ortalamasından belirgin hızlı büyüyen ve görece uygun fiyatlı bir ilçe yok; merkeze yakın, imarlı ve altyapısı tamam arsalar daha güvenli.");

    const s = ilce ? b.ilceler.find((i) => i.ad === ilce) : undefined;
    if (s) {
      const fark = s.artis5 - b.ilArtis5;
      t.push(
        `${ilce}: 5 yılda %${f(s.artis5)}${s.artis1 !== null ? `, son yılda %${f(s.artis1)}` : ""} nüfus değişimi; ` +
          (fark > 2 ? "il ortalamasından hızlı büyüyor, konut talebi artıyor." : fark < -2 ? "il ortalamasının gerisinde; talep artışı sınırlı." : "il ortalamasına yakın büyüyor.") +
          (s.yon ? ` İl merkezinin ${s.km} km ${s.yon}sinde${b.yon === s.yon ? ", büyüme yönünün üzerinde." : "."}` : ""),
      );
    }
  }

  // İmar: ülke geneli açık imar planı verisi olmadığından genel kurallar ve resmi sorgu yolları verilir.
  t.push(
    "İmar durumu: imar planları belediyelerde ve Bakanlığın e-Plan sisteminde; ada/parsel ile sorgulanır, resmi imar durum belgesi belediyeden alınır. " +
      "Parselin yerini ve tapu bilgisini TKGM Parsel Sorgu'dan (parselsorgu.tkgm.gov.tr) kontrol edin. " +
      "Büyüyen ilçelerde belediyelerin askıya çıkardığı nazım/uygulama imar planı değişikliklerini (30 gün askı) takip edin; tarla vasfındaki arazinin konut imarına geçmesi en büyük değer artışıdır, ancak düzenleme ortaklık payı (DOP, %45'e kadar) alanınızı azaltır.",
  );
  return t;
}
