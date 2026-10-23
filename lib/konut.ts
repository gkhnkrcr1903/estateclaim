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

export function konutPiyasasi(ilKod: string, ilce?: string, mahalle?: string): KonutPiyasasi {
  const m = ilMeta(ilKod);
  // Mahalle farkı ilçe farkının üstüne daha dar bir sapma (±%15) olarak eklenir.
  const mh = ilce && mahalle ? 0.85 + (sapma(ilce + mahalle) - 0.75) * 0.6 : 1;
  const s = (ilce ? sapma(ilKod + ilce) : 1) * mh;
  const k = (ilce ? sapma(ilce + ilKod + "kira") : 1) * mh;
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
