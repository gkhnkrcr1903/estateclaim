import { ilMeta, iller, turkiyeOrtalamaM2 } from "./iller-meta";
import { konutPiyasasi, ilceKademesiVar } from "./konut";
import { tahminiArsaM2 } from "./arsa";

export interface SiraKalemi {
  ad: string;
  deger: number; // TL/m² (kira için aylık)
}

export interface SemtSiralamasi {
  satis: SiraKalemi[];
  kira: SiraKalemi[];
  arsa: SiraKalemi[];
}

const ilkN = (l: SiraKalemi[], n: number) => [...l].sort((a, b) => b.deger - a.deger).slice(0, n);

// İlin ilçelerini satış, kira ve arsa m² değerine göre sıralar. Arsa değeri, merkeze 5 km uzaklıktaki
// imarlı bir konut arsası için tahmindir. Mahalle fiyatları için açık kaynak olmadığından mahalle sıralaması
// yapılmaz; ilçe kademe bilgisi olmayan illerde de sıralama örnek sapmaya dayanacağı için null döner.
export function semtSiralamasi(ilKod: string, n = 3): SemtSiralamasi | null {
  if (!ilceKademesiVar(ilKod)) return null;
  const veriler = ilMeta(ilKod).ilceler.map((ilce) => {
    const k = konutPiyasasi(ilKod, ilce);
    return { ad: ilce, satis: k.satisM2, kira: k.kiraM2, arsa: tahminiArsaM2(ilKod, "Konut", 5, ilce) };
  });
  return {
    satis: ilkN(veriler.map((v) => ({ ad: v.ad, deger: v.satis })), n),
    kira: ilkN(veriler.map((v) => ({ ad: v.ad, deger: v.kira })), n),
    arsa: ilkN(veriler.map((v) => ({ ad: v.ad, deger: v.arsa })), n),
  };
}

export interface IlOzeti {
  ad: string;
  nufus: number;
  nufusSirasi: number; // 81 il içinde
  buyume: number; // binde
  buyumeSirasi: number;
  satisM2: number;
  satisKaynak: "TCMB" | "tahmini";
  turkiyeFarki: number; // Türkiye ortalamasına göre %
  kiraM2: number;
  brutGetiri: number;
  arsaM2: number;
  ilceSayisi: number;
  mahalleSayisi: number;
  enPahaliIlce: SiraKalemi;
  enUygunIlce: SiraKalemi;
}

export function ilOzeti(ilKod: string): IlOzeti {
  const il = ilMeta(ilKod);
  const tum = iller();
  const sira = (f: (x: typeof il) => number) => [...tum].sort((a, b) => f(b) - f(a)).findIndex((x) => x.kod === ilKod) + 1;
  const ilceFiyatlari = il.ilceler.map((x) => ({ ad: x, deger: konutPiyasasi(ilKod, x).satisM2 })).sort((a, b) => b.deger - a.deger);
  return {
    ad: il.ad,
    nufus: il.nufus,
    nufusSirasi: sira((x) => x.nufus),
    buyume: il.buyume,
    buyumeSirasi: sira((x) => x.buyume),
    satisM2: il.satisM2,
    satisKaynak: il.satisKaynak,
    turkiyeFarki: Math.round((il.satisM2 / turkiyeOrtalamaM2() - 1) * 100),
    kiraM2: il.kiraM2,
    brutGetiri: Math.round(((il.kiraM2 * 12) / il.satisM2) * 1000) / 10,
    arsaM2: tahminiArsaM2(ilKod, "Konut", 5),
    ilceSayisi: il.ilceler.length,
    mahalleSayisi: Object.values(il.mahalleler).reduce((t, m) => t + m.length, 0),
    enPahaliIlce: ilceFiyatlari[0],
    enUygunIlce: ilceFiyatlari[ilceFiyatlari.length - 1],
  };
}
