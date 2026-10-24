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

// Büyük şehirlerde ilçelerin genel piyasa konumu (A: en pahalı … D: en uygun). Kesin fiyat değil,
// yaygın bilinen göreli sıralamaya dayanan tahmindir. Listede olmayan ilçeler "varsayilan" kademeyi alır.
// Kademe içindeki sıra da anlamlıdır: listede önce gelen ilçe daha pahalı kabul edilir.
type Kademe = "A" | "B" | "C" | "D";
const KADEME_CARPANI: Record<Kademe, number> = { A: 1.45, B: 1.15, C: 0.95, D: 0.75 };
const ILCE_KADEMELERI: Record<string, { varsayilan: Kademe } & Partial<Record<Kademe, string[]>>> = {
  "34": {
    varsayilan: "C",
    A: ["Beşiktaş", "Sarıyer", "Kadıköy", "Bakırköy", "Şişli", "Üsküdar", "Adalar"],
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

// İlçe sıralaması yalnızca kademe bilgisi olan illerde anlamlıdır; diğerlerinde farklar örnek sapmadır.
export function ilceKademesiVar(ilKod: string) {
  return ilKod in ILCE_KADEMELERI;
}

function ilceCarpani(ilKod: string, ilce: string): number {
  // Rastgele/örnek sapma kullanılmaz: yalnızca bilinen kademe ve merkez/kırsal ayrımı uygulanır.
  const t = ILCE_KADEMELERI[ilKod];
  if (t) {
    const kademe = (["A", "B", "C", "D"] as Kademe[]).find((k) => t[k]?.includes(ilce));
    if (!kademe) return KADEME_CARPANI[t.varsayilan];
    // Listedeki sıraya göre +%6 … −%6; rastgele sapma kademe içi sırayı bozmasın.
    const liste = t[kademe]!;
    const sira = liste.length > 1 ? liste.indexOf(ilce) / (liste.length - 1) : 0.5;
    return KADEME_CARPANI[kademe] * (1.06 - sira * 0.12);
  }
  // Diğer illerde merkez ilçe daha değerli, kırsal ilçeler daha uygun.
  if (ilMeta(ilKod).ilceler.includes("Merkez")) return ilce === "Merkez" ? KADEME_CARPANI.B : KADEME_CARPANI.D;
  return 1; // büyükşehir, ilçe kademe bilgisi yok: il ortalaması
}

// İl ortalamasına göre ilçe/mahalle fiyat çarpanı (tahmini). Konut ve arsa değerlemesi aynı çarpanı kullanır.
export function bolgeCarpani(ilKod: string, ilce?: string, mahalle?: string) {
  // Mahalle bazında açık fiyat verisi yok: mahalle, ilçe değerini alır (uydurma fark eklenmez).
  void mahalle;
  const mh = 1;
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
  const kaynak = mahalle ? `${ilKaynak}; ilçe farkı ve kira tahmini (mahalle verisi yok, ilçe değeri)` : ilce ? `${ilKaynak}; ilçe farkı ve kira tahmini` : `${ilKaynak}; kira tahmini`;

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
