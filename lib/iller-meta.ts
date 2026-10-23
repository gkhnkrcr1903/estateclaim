import { veri, type IlVerisi } from "./veri";

export function iller(): IlVerisi[] {
  return veri().iller;
}

export function ilMeta(kod: string): IlVerisi {
  const il = veri().iller.find((i) => i.kod === kod);
  if (!il) throw new Error("Bilinmeyen il kodu: " + kod);
  return il;
}

// Türkiye nüfus ağırlıklı ortalama konut m² fiyatı
export function turkiyeOrtalamaM2(): number {
  const l = veri().iller;
  const toplam = l.reduce((t, i) => t + i.nufus, 0);
  return l.reduce((t, i) => t + i.satisM2 * i.nufus, 0) / toplam;
}

// İmarlı arsa m² fiyatı, konut m² fiyatının yaklaşık %45'i kabul edilir (tahmini).
export function ortalamaArsaM2(kod: string): number {
  return ilMeta(kod).satisM2 * 0.45;
}
