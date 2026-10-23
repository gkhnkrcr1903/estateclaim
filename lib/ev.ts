import { konutPiyasasi } from "./konut";

export interface EvBilgisi {
  il: string;
  ilce: string;
  netM2: number;
  odaSayisi: string;
  binaYasi: number;
  kat: "Bodrum" | "Zemin/bahçe" | "Ara kat" | "En üst kat" | "Çatı dubleks";
  toplamKat: number;
  durum: "Sıfır/yeni" | "Bakımlı" | "Orta" | "Tadilat gerekli";
  isinma: "Doğalgaz kombi" | "Merkezi" | "Yerden ısıtma" | "Soba/diğer";
  asansor: boolean;
  otopark: boolean;
  site: boolean; // havuz, güvenlik vb.
  manzara: boolean;
  ulasimKm: number; // metro/merkez/toplu taşımaya uzaklık
  tapu: "Kat mülkiyeti" | "Kat irtifakı" | "Hisseli/arsa tapusu";
  krediyeUygun: boolean;
  istenenFiyat: number;
}

export interface Etken {
  metin: string;
  oran: number; // fiyata yüzde etkisi
}

export interface EvSonuc {
  tahmini: number;
  alt: number;
  ust: number;
  fark: number; // istenen / tahmini - 1
  karar: "Alınır — fiyatı uygun" | "Makul — pazarlıkla alınır" | "Pahalı — önerilmez";
  hedefFiyat: number; // pazarlıkta hedeflenecek fiyat
  etkenler: Etken[];
  kiraTahmini: number;
  brutGetiri: number;
  amortismanYil: number;
  notlar: string[];
}

// Bölge ortalama m² fiyatından başlayıp her özellik için yüzde düzeltme uygular.
export function evDegerle(e: EvBilgisi): EvSonuc {
  const p = konutPiyasasi(e.il, e.ilce || undefined);
  const et: Etken[] = [];
  const ekle = (metin: string, oran: number) => oran !== 0 && et.push({ metin, oran });

  if (e.binaYasi <= 2) ekle("Yeni bina (0–2 yaş)", 12);
  else if (e.binaYasi <= 10) ekle(`Genç bina (${e.binaYasi} yaş)`, 5);
  else if (e.binaYasi <= 20) ekle(`Orta yaşlı bina (${e.binaYasi} yaş)`, -5);
  else ekle(`Eski bina (${e.binaYasi} yaş) — 2000 öncesi deprem yönetmeliği riski`, e.binaYasi > 25 ? -20 : -12);

  const katEtki = { Bodrum: -18, "Zemin/bahçe": -5, "Ara kat": 3, "En üst kat": -4, "Çatı dubleks": 2 }[e.kat];
  ekle(`Kat: ${e.kat}`, katEtki);
  if (!e.asansor && e.toplamKat >= 4 && e.kat !== "Bodrum" && e.kat !== "Zemin/bahçe") ekle("4+ katlı binada asansör yok", -7);
  else if (e.asansor) ekle("Asansör", 2);

  ekle(`Durum: ${e.durum}`, { "Sıfır/yeni": 8, Bakımlı: 3, Orta: -3, "Tadilat gerekli": -12 }[e.durum]);
  ekle(`Isınma: ${e.isinma}`, { "Doğalgaz kombi": 0, Merkezi: -2, "Yerden ısıtma": 4, "Soba/diğer": -10 }[e.isinma]);
  if (e.otopark) ekle("Otopark", 4);
  if (e.site) ekle("Site içinde (güvenlik/sosyal alan)", 8);
  if (e.manzara) ekle("Manzara", 6);
  if (e.ulasimKm <= 1) ekle("Toplu taşıma/merkeze 1 km içinde", 7);
  else if (e.ulasimKm > 5) ekle(`Ulaşıma uzak (${e.ulasimKm} km)`, -8);
  ekle(`Tapu: ${e.tapu}`, { "Kat mülkiyeti": 0, "Kat irtifakı": -4, "Hisseli/arsa tapusu": -15 }[e.tapu]);
  if (!e.krediyeUygun) ekle("Krediye uygun değil — alıcı kitlesi daralır", -8);

  const toplamOran = et.reduce((t, x) => t + x.oran, 0);
  const tahmini = Math.round((p.satisM2 * e.netM2 * (1 + toplamOran / 100)) / 1000) * 1000;
  const alt = Math.round(tahmini * 0.92 / 1000) * 1000;
  const ust = Math.round(tahmini * 1.08 / 1000) * 1000;
  const fark = e.istenenFiyat / tahmini - 1;

  const karar: EvSonuc["karar"] = fark <= 0.03 ? "Alınır — fiyatı uygun" : fark <= 0.15 ? "Makul — pazarlıkla alınır" : "Pahalı — önerilmez";
  const hedefFiyat = Math.min(e.istenenFiyat, Math.round((tahmini * 0.97) / 1000) * 1000);

  const kiraTahmini = Math.round((p.kiraM2 * e.netM2 * (1 + toplamOran / 200)) / 100) * 100;
  const brutGetiri = Math.round(((kiraTahmini * 12) / e.istenenFiyat) * 1000) / 10;
  const amortismanYil = Math.round((e.istenenFiyat / (kiraTahmini * 12)) * 10) / 10;

  const notlar: string[] = [];
  if (e.binaYasi > 20) notlar.push("Bina 2000 öncesi olabilir: deprem dayanıklılık raporu / karot testi isteyin, kentsel dönüşüm durumunu belediyeden sorun.");
  if (e.tapu !== "Kat mülkiyeti") notlar.push("Kat mülkiyetine geçilmemiş: iskân durumunu ve kat irtifakının kat mülkiyetine çevrilip çevrilemeyeceğini kontrol edin.");
  if (!e.krediyeUygun) notlar.push("Krediye uygun olmayan ev ileride satarken yalnızca peşin alıcıya satılabilir.");
  if (brutGetiri >= 5.5) notlar.push("Bu fiyattan kira getirisi bölge için iyi; yatırım amaçlı da mantıklı.");
  else if (brutGetiri < 4) notlar.push("Bu fiyattan kira getirisi düşük; yatırım amaçlıysa değer artışı beklentisine güvenmeniz gerekir.");
  notlar.push("Tapu kaydında ipotek/haciz/şerh olmadığını, aidat borcunu ve yapı denetim belgelerini mutlaka kontrol edin.");

  return { tahmini, alt, ust, fark, karar, hedefFiyat, etkenler: et, kiraTahmini, brutGetiri, amortismanYil, notlar };
}
