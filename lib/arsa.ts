import { ilMeta, ortalamaArsaM2 } from "./iller-meta";

export type ImarFonksiyonu = "Konut" | "Ticaret" | "Konut+Ticaret" | "Sanayi" | "Turizm" | "Tarla (imarsız)" | "Koruma alanı";

export const IMAR_FONKSIYONLARI: ImarFonksiyonu[] = [
  "Konut", "Ticaret", "Konut+Ticaret", "Sanayi", "Turizm", "Tarla (imarsız)", "Koruma alanı",
];

export const PROJE_TURLERI = ["Otoyol / çevre yolu", "Raylı sistem", "Havalimanı", "OSB", "Üniversite kampüsü", "Hastane", "Kentsel dönüşüm"];

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
  fiyatM2: number; // TL
  merkezKm: number; // ilçe merkezine uzaklık
  yolCephesi: boolean;
  hisseli: boolean;
  projeler: string[];
  lat: number;
  lng: number;
  manuel?: boolean;
}

// Deterministik rastgele: aynı il/ilçe hep aynı örnek arsaları üretir.
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

export function ornekArsalar(ilKod: string, ilce: string, adet = 8): Arsa[] {
  const r = tohum(ilKod + ilce);
  const merkez = ilceKonumu(ilKod, ilce);
  const ort = ortalamaArsaM2(ilKod);
  const sec = <T,>(a: T[]) => a[Math.floor(r() * a.length)];

  return Array.from({ length: adet }, (_, i) => {
    const imar = sec(IMAR_FONKSIYONLARI);
    const imarli = !["Tarla (imarsız)", "Koruma alanı"].includes(imar);
    const merkezKm = Math.round((0.5 + r() * 18) * 10) / 10;
    const carpan = (imarli ? 1 : 0.35) * (1.3 - merkezKm / 30) * (0.7 + r() * 0.6);
    const projeler = PROJE_TURLERI.filter(() => r() < 0.15);
    return {
      id: `${ilKod}-${ilce}-${i}`,
      il: ilKod,
      ilce,
      ada: String(100 + Math.floor(r() * 900)),
      parsel: String(1 + Math.floor(r() * 60)),
      alan: Math.round((imarli ? 300 + r() * 1500 : 2000 + r() * 15000) / 10) * 10,
      imar,
      emsal: imarli ? Math.round((0.3 + r() * 2.2) * 10) / 10 : imar === "Koruma alanı" ? 0 : 0.05,
      fiyatM2: Math.round((ort * carpan) / 50) * 50,
      merkezKm,
      yolCephesi: r() > 0.25,
      hisseli: r() < 0.3,
      projeler,
      lat: merkez.lat + (r() - 0.5) * 0.12,
      lng: merkez.lng + (r() - 0.5) * 0.16,
    };
  });
}
