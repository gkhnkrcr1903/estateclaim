import { ilMeta, ortalamaArsaM2 } from "./iller-meta";
import { bolgeCarpani } from "./konut";
import { mahalleListesi, mahalleKoordinati } from "./mahalle";

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
  konumYaklasik?: boolean; // gerçek mahalle koordinatı yoksa ilçe/il merkezi çevresi
  lng: number;
  manuel?: boolean;
  ekspertiz?: number; // SPK lisanslı değerleme raporundaki toplam değer (TL); varsa fiyat kararı buna göre verilir
  kontroller?: string[]; // tamamlanan resmi doğrulama adımlarının kimlikleri (lib/dogrulama.ts)
}

export function ilceKonumu(ilKod: string, ilce: string) {
  const m = ilMeta(ilKod);
  const k = m.ilceKonum?.[ilce];
  return k ? { lat: k[0], lng: k[1], yaklasik: false } : { lat: m.lat, lng: m.lng, yaklasik: true };
}

export function mahalleKonumu(ilKod: string, ilce: string, mahalle: string) {
  // Mahalle koordinatları il dosyasından gelir (lib/mahalle.ts); dosya inmemişse ilçe noktası kullanılır.
  const k = mahalleKoordinati(ilKod, ilce, mahalle);
  if (k) return { lat: k[0], lng: k[1], yaklasik: false };
  return { ...ilceKonumu(ilKod, ilce), yaklasik: true };
}

export function mahalleler(ilKod: string, ilce: string): string[] {
  return mahalleListesi(ilKod, ilce);
}

// Konum ve imara göre tahmini piyasa m² değeri (rastgele sapma içermez).
export function tahminiArsaM2(ilKod: string, imar: ImarFonksiyonu, merkezKm: number, ilce?: string, mahalle?: string) {
  const imarli = !["Tarla (imarsız)", "Koruma alanı"].includes(imar);
  // İmarsız arazinin değeri merkezden uzaklaştıkça imarlı arsaya göre çok daha hızlı düşer.
  const konum = imarli ? 1.3 - Math.min(merkezKm, 30) / 30 : Math.max(0.12, 1 - merkezKm / 20);
  const bolge = bolgeCarpani(ilKod, ilce, mahalle).satis;
  return Math.round((ortalamaArsaM2(ilKod) * bolge * (imarli ? 1 : 0.35) * konum) / 10) * 10;
}
