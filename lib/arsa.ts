import { ilMeta, ortalamaArsaM2 } from "./iller-meta";

export type ImarFonksiyonu = "Konut" | "Ticaret" | "Konut+Ticaret" | "Sanayi" | "Turizm" | "Tarla (imarsız)" | "Koruma alanı";

export const IMAR_FONKSIYONLARI: ImarFonksiyonu[] = [
  "Konut", "Ticaret", "Konut+Ticaret", "Sanayi", "Turizm", "Tarla (imarsız)", "Koruma alanı",
];

export const PROJE_TURLERI = ["Otoyol / çevre yolu", "Raylı sistem", "Havalimanı", "OSB", "Üniversite kampüsü", "Hastane", "Kentsel dönüşüm"];

// Malik adı KVKK gereği hiçbir zaman tutulmaz; yalnızca malik türü.
export type TapuDurumu = "Özel mülk" | "Hazine (Milli Emlak)" | "Belediye" | "Vakıf";
export const TAPU_DURUMLARI: TapuDurumu[] = ["Özel mülk", "Hazine (Milli Emlak)", "Belediye", "Vakıf"];
export const kamuMu = (t: TapuDurumu) => t !== "Özel mülk";

export const KAMU_EDINIM: Record<Exclude<TapuDurumu, "Özel mülk">, string> = {
  "Hazine (Milli Emlak)": "Doğrudan satın alınamaz; Milli Emlak ihale ilanlarını (milliemlak.gov.tr) takip edin. Satışa çıkarsa muhammen bedel üzerinden ihaleye girilir.",
  Belediye: "Belediye encümen kararıyla ihaleyle satılabilir; belediyenin ihale ilanlarını takip edin.",
  Vakıf: "Vakıflar Genel Müdürlüğü kiralama/satış ihaleleriyle değerlendirir; vgm.gov.tr ilanlarını takip edin.",
};

export interface Arsa {
  id: string;
  il: string; // il kodu
  ilce: string;
  mahalle?: string;
  ada: string;
  parsel: string;
  alan: number; // m²
  imar: ImarFonksiyonu;
  emsal: number; // KAKS
  tapu?: TapuDurumu;
  fiyatM2: number; // TL — özel mülkte istenen fiyat, kamuda tahmini muhammen bedel
  tahminiM2?: number; // TL — bölge, imar ve konuma göre tahmini piyasa değeri
  merkezKm: number; // ilçe merkezine uzaklık
  yolCephesi: boolean;
  hisseli: boolean;
  projeler: string[];
  lat: number;
  lng: number;
  manuel?: boolean;
}

// Deterministik rastgele: aynı il/ilçe/mahalle hep aynı örnek arsaları üretir.
function tohum(s: string) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function ilceKonumu(ilKod: string, ilce: string) {
  const m = ilMeta(ilKod);
  const r = tohum(ilKod + ilce + "konum");
  // Gerçek ilçe koordinatları olmadığından il merkezi çevresinde yaklaşık konum.
  return { lat: m.lat + (r() - 0.5) * 0.6, lng: m.lng + (r() - 0.5) * 0.8 };
}

export function mahalleKonumu(ilKod: string, ilce: string, mahalle: string) {
  const k = ilceKonumu(ilKod, ilce);
  const r = tohum(ilKod + ilce + mahalle + "konum");
  return { lat: k.lat + (r() - 0.5) * 0.1, lng: k.lng + (r() - 0.5) * 0.13 };
}

export function mahalleler(ilKod: string, ilce: string): string[] {
  return ilMeta(ilKod).mahalleler[ilce] ?? [];
}

// Konum ve imara göre tahmini piyasa m² değeri (rastgele sapma içermez).
export function tahminiArsaM2(ilKod: string, imar: ImarFonksiyonu, merkezKm: number) {
  const imarli = !["Tarla (imarsız)", "Koruma alanı"].includes(imar);
  return Math.round((ortalamaArsaM2(ilKod) * (imarli ? 1 : 0.35) * (1.3 - Math.min(merkezKm, 30) / 30)) / 50) * 50;
}

export function ornekArsalar(ilKod: string, ilce: string, adet = 8, mahalle?: string): Arsa[] {
  const r = tohum(ilKod + ilce + (mahalle ?? ""));
  const liste = mahalleler(ilKod, ilce);
  const sec = <T,>(a: T[]) => a[Math.floor(r() * a.length)];

  return Array.from({ length: adet }, (_, i) => {
    const mah = mahalle ?? (liste.length ? sec(liste) : undefined);
    const merkez = mah ? mahalleKonumu(ilKod, ilce, mah) : ilceKonumu(ilKod, ilce);
    const imar = sec(IMAR_FONKSIYONLARI);
    const imarli = !["Tarla (imarsız)", "Koruma alanı"].includes(imar);
    const merkezKm = Math.round((0.5 + r() * 18) * 10) / 10;
    const t = r();
    const tapu: TapuDurumu = t < 0.7 ? "Özel mülk" : t < 0.85 ? "Hazine (Milli Emlak)" : t < 0.95 ? "Belediye" : "Vakıf";
    const tahminiM2 = tahminiArsaM2(ilKod, imar, merkezKm);
    // Özel mülkte satıcının istediği fiyat piyasadan sapabilir; kamuda muhammen bedel genelde biraz altındadır.
    const fiyatM2 = Math.round((tahminiM2 * (kamuMu(tapu) ? 0.85 + r() * 0.1 : 0.7 + r() * 0.6)) / 50) * 50;
    const projeler = PROJE_TURLERI.filter(() => r() < 0.15);
    return {
      id: `${ilKod}-${ilce}-${mahalle ?? ""}-${i}`,
      il: ilKod,
      ilce,
      mahalle: mah,
      ada: String(100 + Math.floor(r() * 900)),
      parsel: String(1 + Math.floor(r() * 60)),
      alan: Math.round((imarli ? 300 + r() * 1500 : 2000 + r() * 15000) / 10) * 10,
      imar,
      emsal: imarli ? Math.round((0.3 + r() * 2.2) * 10) / 10 : imar === "Koruma alanı" ? 0 : 0.05,
      tapu,
      fiyatM2,
      tahminiM2,
      merkezKm,
      yolCephesi: r() > 0.25,
      hisseli: tapu === "Özel mülk" && r() < 0.3,
      projeler,
      lat: merkez.lat + (r() - 0.5) * (mahalle ? 0.02 : 0.12),
      lng: merkez.lng + (r() - 0.5) * (mahalle ? 0.026 : 0.16),
    };
  });
}
