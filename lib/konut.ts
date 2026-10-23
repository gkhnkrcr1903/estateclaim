import { ilMeta } from "./iller-meta";
import { veri } from "./veri";

// İl düzeyi m² fiyatı veri dosyasından (TCMB veya tahmini) gelir; ilçe farkı tahmini bir sapmadır.

export interface KonutPiyasasi {
  satisM2: number;
  kiraM2: number; // aylık
  brutGetiri: number; // yıllık %
  amortismanYil: number;
  ornekDaire: { m2: number; fiyat: number; kira: number };
  kaynak: string;
  yorum: string;
}

function sapma(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 0.75 + (h % 1000) / 2000; // 0.75–1.25
}

// Büyük şehirlerde ilçelerin genel piyasa konumu (A: en pahalı … D: en uygun). Kesin fiyat değil,
// yaygın bilinen göreli sıralamaya dayanan tahmindir. Listede olmayan ilçeler "varsayilan" kademeyi alır.
type Kademe = "A" | "B" | "C" | "D";
const KADEME_CARPANI: Record<Kademe, number> = { A: 1.45, B: 1.15, C: 0.95, D: 0.75 };
const ILCE_KADEMELERI: Record<string, { varsayilan: Kademe } & Partial<Record<Kademe, string[]>>> = {
  "34": {
    varsayilan: "C",
    A: ["Beşiktaş", "Sarıyer", "Kadıköy", "Bakırköy", "Adalar", "Şişli", "Üsküdar"],
    B: ["Beykoz", "Ataşehir", "Beyoğlu", "Fatih", "Maltepe", "Eyüpsultan", "Kartal", "Zeytinburnu", "Çekmeköy", "Ümraniye", "Kağıthane", "Başakşehir", "Büyükçekmece"],
    D: ["Esenyurt", "Sultanbeyli", "Arnavutköy", "Esenler", "Sultangazi", "Bağcılar"],
  },
  "06": {
    varsayilan: "D",
    A: ["Çankaya"],
    B: ["Yenimahalle", "Etimesgut", "Gölbaşı"],
    C: ["Keçiören", "Sincan", "Pursaklar", "Kahramankazan", "Altındağ", "Mamak"],
  },
  "35": {
    varsayilan: "D",
    A: ["Çeşme", "Urla", "Karşıyaka", "Narlıdere", "Balçova", "Güzelbahçe"],
    B: ["Bornova", "Konak", "Bayraklı", "Seferihisar", "Foça", "Gaziemir", "Çiğli"],
    C: ["Buca", "Karabağlar", "Menderes", "Torbalı", "Dikili", "Selçuk"],
  },
  "07": {
    varsayilan: "D",
    A: ["Konyaaltı", "Muratpaşa", "Kaş", "Kemer"],
    B: ["Alanya", "Döşemealtı", "Manavgat"],
    C: ["Kepez", "Aksu", "Serik", "Finike", "Demre", "Kumluca", "Gazipaşa"],
  },
  "16": {
    varsayilan: "D",
    A: ["Nilüfer", "Mudanya"],
    B: ["Osmangazi", "Gemlik"],
    C: ["Yıldırım", "İnegöl", "Gürsu", "Kestel", "İznik", "Orhangazi"],
  },
  "48": {
    varsayilan: "D",
    A: ["Bodrum"],
    B: ["Fethiye", "Marmaris", "Datça"],
    C: ["Menteşe", "Dalaman", "Ortaca", "Köyceğiz", "Milas", "Ula"],
  },
};

function ilceCarpani(ilKod: string, ilce: string): number {
  const ince = 0.94 + (sapma(ilKod + ilce) - 0.75) * 0.24; // aynı kademe içinde ±%6 fark
  const t = ILCE_KADEMELERI[ilKod];
  if (t) {
    const kademe = (["A", "B", "C", "D"] as Kademe[]).find((k) => t[k]?.includes(ilce)) ?? t.varsayilan;
    return KADEME_CARPANI[kademe] * ince;
  }
  // Diğer illerde merkez ilçe daha değerli, kırsal ilçeler daha uygun.
  if (ilMeta(ilKod).ilceler.includes("Merkez")) return (ilce === "Merkez" ? KADEME_CARPANI.B : KADEME_CARPANI.D) * ince;
  return 0.9 * ince * (0.85 + (sapma(ilce + ilKod) - 0.75) * 0.5); // büyükşehir, kademe bilgisi yok
}

// İl ortalamasına göre ilçe/mahalle fiyat çarpanı (tahmini). Konut ve arsa değerlemesi aynı çarpanı kullanır.
export function bolgeCarpani(ilKod: string, ilce?: string, mahalle?: string) {
  // Mahalle farkı ilçe farkının üstüne daha dar bir sapma (±%15) olarak eklenir.
  const mh = ilce && mahalle ? 0.85 + (sapma(ilce + mahalle) - 0.75) * 0.6 : 1;
  const ic = ilce ? ilceCarpani(ilKod, ilce) : 1;
  return {
    satis: ic * mh,
    // Kira farkları satış farklarından daha dar olur (pahalı semtte getiri daha düşük).
    kira: Math.pow(ic, 0.75) * mh,
  };
}

export function konutPiyasasi(ilKod: string, ilce?: string, mahalle?: string): KonutPiyasasi {
  const m = ilMeta(ilKod);
  const { satis: s, kira: k } = bolgeCarpani(ilKod, ilce, mahalle);
  const satisM2 = Math.round((m.satisM2 * s) / 100) * 100;
  const kiraM2 = Math.round(m.kiraM2 * k);
  const brutGetiri = Math.round(((kiraM2 * 12) / satisM2) * 1000) / 10;
  const amortismanYil = Math.round((satisM2 / (kiraM2 * 12)) * 10) / 10;
  const daireM2 = 110;

  const ilKaynak = m.satisKaynak === "TCMB" ? `TCMB ${veri().konutDonemi} il ortalaması` : "il ortalaması tahmini";
  const kaynak = mahalle ? `${ilKaynak}; ilçe/mahalle farkı ve kira tahmini` : ilce ? `${ilKaynak}; ilçe farkı ve kira tahmini` : `${ilKaynak}; kira tahmini`;

  let yorum: string;
  if (brutGetiri >= 6) yorum = "Kira getirisi yüksek: kiralamak amacıyla konut almak cazip; arsa yerine hazır konut değerlendirilebilir.";
  else if (brutGetiri >= 4.5) yorum = "Kira getirisi ortalama: konut alımı hem kira hem değer artışı için dengeli bir seçenek.";
  else yorum = "Kira getirisi düşük: konut fiyatları kiraya göre pahalı; değer artışı beklentisi yoksa kiracı olmak veya arsaya yönelmek daha mantıklı olabilir.";

  return {
    satisM2,
    kiraM2,
    brutGetiri,
    amortismanYil,
    ornekDaire: { m2: daireM2, fiyat: satisM2 * daireM2, kira: kiraM2 * daireM2 },
    kaynak,
    yorum,
  };
}
