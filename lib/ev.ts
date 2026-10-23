import { konutPiyasasi } from "./konut";
import { ilMeta } from "./iller-meta";

export interface EvBilgisi {
  il: string;
  ilce: string;
  mahalle?: string;
  netM2: number;
  odaSayisi: string;
  binaYasi: number;
  kat: "Bodrum" | "Zemin/bahçe" | "Ara kat" | "En üst kat" | "Çatı dubleks";
  toplamKat: number;
  durum: "Sıfır/yeni" | "Bakımlı" | "Orta" | "Tadilat gerekli";
  isinma: "Doğalgaz kombi" | "Merkezi" | "Yerden ısıtma" | "Soba/diğer";
  asansor: boolean;
  otopark: "Yok" | "Açık" | "Kapalı";
  site: boolean; // havuz, güvenlik vb.
  manzara: "Yok" | "Şehir/doğa" | "Deniz/göl";
  ulasimKm: number; // metro/merkez/toplu taşımaya uzaklık
  tapu: "Kat mülkiyeti" | "Kat irtifakı" | "Hisseli/arsa tapusu";
  krediyeUygun: boolean;
  istenenFiyat: number;
  // Ayrıntılı özellikler (verilmezse nötr kabul edilir)
  cephe?: "Güney" | "Doğu/Batı" | "Kuzey" | "Çift cephe ve üzeri";
  balkon?: boolean;
  banyo?: 1 | 2;
  iskan?: boolean; // yapı kullanma izni
  aidat?: number; // TL / ay
  anaCadde?: boolean; // gürültülü cadde üzerinde
  sosyal?: boolean; // okul, market, hastane yürüme mesafesinde
  kullanim?: "Boş" | "Kiracılı" | "Sahibi oturuyor";
  esyali?: boolean;
  amac?: "Oturmak" | "Yatırım (kira)";
  // Finansman
  pesinatOrani?: number; // %
  aylikFaiz?: number; // %
  vadeAy?: number;
}

export interface Etken {
  metin: string;
  oran: number; // fiyata yüzde etkisi
}

export interface Yontem {
  ad: string;
  deger: number;
  agirlik: number; // 0–1, ağırlıklı ortalamaya katkısı (0: yalnızca referans)
  aciklama: string;
  adimlar: { ad: string; deger: string }[]; // ayrıntılı hesap dökümü
  guclu: string; // yöntemin güçlü yanı
  zayif: string; // sınırlılığı
}

export interface Tavsiye {
  grup: "Fiyat ve pazarlık" | "Finansman" | "Hukuki ve teknik kontrol" | "Oturum / yatırım";
  tur: "olumlu" | "uyari" | "bilgi";
  metin: string;
}

export interface EvSonuc {
  tahmini: number;
  alt: number;
  ust: number;
  fark: number; // istenen / tahmini - 1
  karar: "Alınır — fiyatı uygun" | "Makul — pazarlıkla alınır" | "Pahalı — önerilmez";
  hedefFiyat: number; // pazarlıkta hedeflenecek fiyat
  acilisTeklifi: number;
  yontemler: Yontem[];
  aralikPayi: number; // ± oran (0,06–0,20)
  hesapOzeti: string[]; // "Tahmini adil değer nasıl hesaplandı?" maddeleri
  etkenler: Etken[];
  kiraTahmini: number;
  brutGetiri: number;
  amortismanYil: number;
  kredi?: { tutar: number; taksit: number; toplamOdeme: number; pesinat: number };
  tavsiyeler: Tavsiye[];
  notlar: string[]; // geriye dönük uyumluluk: tavsiye metinleri
}

export const YAPI_MALIYET_YILI = 2026;
// Çevre, Şehircilik ve İklim Değişikliği Bakanlığı 2026 yapı yaklaşık birim maliyetleri (RG 03.02.2026/33157), konut satırları.
// Bina yüksekliği kat sayısından yaklaşık hesaplanır (kat başına ~3 m).
function yapiBirimMaliyeti(toplamKat: number) {
  const yukseklik = toplamKat * 3;
  if (toplamKat <= 3) return { sinif: "III-A", tl: 19800 };
  if (yukseklik <= 21.5) return { sinif: "III-B", tl: 21050 };
  if (yukseklik <= 30.5) return { sinif: "III-C", tl: 23400 };
  if (yukseklik <= 51.5) return { sinif: "IV-A", tl: 26450 };
  return { sinif: "IV-B", tl: 33900 };
}
// Resmî birim maliyetler hizmet bedeli hesabı içindir; piyasa yapım maliyeti genelde daha yüksektir.
const PIYASA_MALIYET_CARPANI = 1.3;

const ARSA_PAYI_ORANI = 0.4;

const yuvarla = (n: number, b = 1000) => Math.round(n / b) * b;

// Bölge ortalama m² fiyatından başlayıp her özellik için yüzde düzeltme uygular;
// sonucu gelir ve maliyet yöntemleriyle karşılaştırarak ağırlıklı adil değer verir.
export function evDegerle(e: EvBilgisi): EvSonuc {
  const p = konutPiyasasi(e.il, e.ilce || undefined, e.mahalle || undefined);
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

  // Küçük dairelerin m² fiyatı daha yüksektir (talep fazla, toplam bütçe düşük).
  const odaPrimi: Record<string, number> = { "1+0": 15, "1+1": 10, "2+1": 4, "3+1": 0, "4+1": -4, "5+1 ve üzeri": -8 };
  ekle(`Oda tipi: ${e.odaSayisi}`, odaPrimi[e.odaSayisi] ?? 0);
  ekle(`Durum: ${e.durum}`, { "Sıfır/yeni": 8, Bakımlı: 3, Orta: -3, "Tadilat gerekli": -12 }[e.durum]);
  ekle(`Isınma: ${e.isinma}`, { "Doğalgaz kombi": 0, Merkezi: -2, "Yerden ısıtma": 4, "Soba/diğer": -10 }[e.isinma]);
  ekle(`Otopark: ${e.otopark}`, { Yok: 0, Açık: 2, Kapalı: 5 }[e.otopark]);
  if (e.site) ekle("Site içinde (güvenlik/sosyal alan)", 8);
  ekle(`Manzara: ${e.manzara}`, { Yok: 0, "Şehir/doğa": 4, "Deniz/göl": 15 }[e.manzara]);
  if (e.ulasimKm <= 1) ekle("Toplu taşıma/merkeze 1 km içinde", 7);
  else if (e.ulasimKm > 5) ekle(`Ulaşıma uzak (${e.ulasimKm} km)`, -8);
  ekle(`Tapu: ${e.tapu}`, { "Kat mülkiyeti": 0, "Kat irtifakı": -4, "Hisseli/arsa tapusu": -15 }[e.tapu]);
  if (!e.krediyeUygun) ekle("Krediye uygun değil — alıcı kitlesi daralır", -8);

  if (e.cephe) ekle(`Cephe: ${e.cephe}`, { Güney: 3, "Doğu/Batı": 0, Kuzey: -4, "Çift cephe ve üzeri": 4 }[e.cephe]);
  if (e.balkon === false) ekle("Balkon yok", -3);
  if (e.banyo === 2) ekle("İki banyo (ebeveyn banyosu)", e.netM2 >= 90 ? 3 : 1);
  if (e.iskan === false) ekle("İskân (yapı kullanma izni) yok", -10);
  if (e.anaCadde) ekle("Gürültülü ana cadde üzerinde", -4);
  if (e.sosyal === false) ekle("Okul/market/hastane yürüme mesafesinde değil", -4);
  if (e.kullanim === "Kiracılı") ekle("Kiracılı satılıyor (tahliye süreci gerekebilir)", -3);
  const normalAidat = p.kiraM2 * e.netM2 * 0.1;
  if (e.aidat && e.aidat > normalAidat * 1.5) ekle(`Yüksek aidat (${Math.round(e.aidat).toLocaleString("tr-TR")} ₺/ay)`, -4);

  // Olumsuz/olumlu özellikler üst üste binse de bölge ortalamasından aşırı sapmasın.
  const toplamOran = Math.max(-45, Math.min(60, et.reduce((t, x) => t + x.oran, 0)));
  const emsal = yuvarla(p.satisM2 * e.netM2 * (1 + toplamOran / 100));

  // Kira, özelliklerden fiyatın yarısı kadar etkilenir; küçük daireler ise m² başına belirgin şekilde daha yüksek kira getirir.
  const odaEtkisi = odaPrimi[e.odaSayisi] ?? 0;
  const kiraOdaPrimi: Record<string, number> = { "1+0": 30, "1+1": 20, "2+1": 8, "3+1": 0, "4+1": -6, "5+1 ve üzeri": -12 };
  const kiraTahmini = yuvarla(
    p.kiraM2 * e.netM2 * (1 + (toplamOran - odaEtkisi) / 200 + (kiraOdaPrimi[e.odaSayisi] ?? 0) / 100) * (e.esyali ? 1.1 : 1),
    100,
  );

  // Gelir yöntemi: yılda 1 ay boş kalma ve %5 bakım gideri düşülmüş net kira, bölgenin brüt getirisine (kapitalizasyon oranı) bölünür.
  const bolgeGetirisi = (p.kiraM2 * 12) / p.satisM2;
  const fazlaAidat = e.aidat ? Math.max(0, e.aidat - normalAidat) : 0; // kiracı yüksek aidatı kiradan pazarlık eder
  const netYillikKira = (kiraTahmini - fazlaAidat) * 11 * 0.95;
  const gelir = yuvarla(netYillikKira / (bolgeGetirisi * (11 / 12) * 0.95));

  // Maliyet yöntemi: arsa payı + bugünkü yapım maliyeti − yıpranma payı (yılda %1,5, en fazla %60).
  // Arsa payı, imar hakkının değeri olarak bölgedeki konut satış değerinin ~%40'ı kabul edilir (geliştirici kalıntı yaklaşımı).
  const brutM2 = e.netM2 * 1.25;
  const arsaPayi = p.satisM2 * e.netM2 * ARSA_PAYI_ORANI;
  const yapi = yapiBirimMaliyeti(e.toplamKat);
  const yipranma = Math.min(0.6, e.binaYasi * 0.015);
  const maliyet = yuvarla(arsaPayi + yapi.tl * PIYASA_MALIYET_CARPANI * brutM2 * (1 - yipranma));

  const il = ilMeta(e.il);
  const tcmbBaz = yuvarla(il.satisM2 * e.netM2);

  const T = (n: number) => Math.round(n).toLocaleString("tr-TR") + " ₺";
  const Y = (n: number) => "%" + n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
  const ham = p.satisM2 * e.netM2;
  const enOlumlu = [...et].sort((x, y) => y.oran - x.oran).filter((x) => x.oran > 0).slice(0, 3);
  const enOlumsuz = [...et].sort((x, y) => x.oran - y.oran).filter((x) => x.oran < 0).slice(0, 3);
  const hamToplam = et.reduce((t, x) => t + x.oran, 0);

  const yontemler: Yontem[] = [
    {
      ad: "Emsal (karşılaştırma) yöntemi", deger: emsal, agirlik: 0.6,
      aciklama: `Bölge m² fiyatı (${p.satisM2.toLocaleString("tr-TR")} ₺) × net m², evin özelliklerine göre %${toplamOran >= 0 ? "+" : ""}${toplamOran} düzeltme.`,
      adimlar: [
        { ad: "Bölge ortalama m² fiyatı", deger: `${T(p.satisM2)} (${p.kaynak})` },
        { ad: "Ham değer (m² fiyatı × net m²)", deger: `${T(p.satisM2)} × ${e.netM2} = ${T(ham)}` },
        { ad: `Özellik düzeltmeleri (${et.length} etken)`, deger: (hamToplam >= 0 ? "+" : "") + Y(hamToplam) + (hamToplam !== toplamOran ? ` → sınır nedeniyle ${toplamOran >= 0 ? "+" : ""}${Y(toplamOran)}` : "") },
        ...(enOlumlu.length ? [{ ad: "En çok artıranlar", deger: enOlumlu.map((x) => `${x.metin} (+${x.oran})`).join(", ") }] : []),
        ...(enOlumsuz.length ? [{ ad: "En çok düşürenler", deger: enOlumsuz.map((x) => `${x.metin} (${x.oran})`).join(", ") }] : []),
        { ad: "Sonuç", deger: `${T(ham)} × (1 ${toplamOran >= 0 ? "+" : "−"} ${Math.abs(toplamOran)}/100) = ${T(emsal)}` },
      ],
      guclu: "Alıcıların gerçekte ödediği bölge fiyatlarına dayanır; konut değerlemesinde en çok kullanılan yöntemdir.",
      zayif: "Bölge fiyatı il ortalamasından ilçe/mahalle farkıyla türetilir; aynı sokaktaki gerçek satışları bilmez.",
    },
    {
      ad: "Gelir (kira) yöntemi", deger: gelir, agirlik: 0.25,
      aciklama: `Tahmini kira ${kiraTahmini.toLocaleString("tr-TR")} ₺/ay; yılda 1 ay boşluk ve %5 gider düşülüp bölgenin %${(bolgeGetirisi * 100).toFixed(1).replace(".", ",")} brüt getirisiyle değerlendi.`,
      adimlar: [
        { ad: "Bölge kira m² fiyatı", deger: `${T(p.kiraM2)}/ay` },
        { ad: "Bu evin tahmini kirası", deger: `${T(kiraTahmini)}/ay (oda tipi${e.esyali ? ", eşya" : ""} ve özelliklerin yarısı kadar etki)` },
        ...(fazlaAidat ? [{ ad: "Normalin üstündeki aidat düşülür", deger: `−${T(fazlaAidat)}/ay` }] : []),
        { ad: "Yıllık net kira", deger: `(${T(kiraTahmini - fazlaAidat)}) × 11 ay × 0,95 = ${T(netYillikKira)}` },
        { ad: "Kapitalizasyon oranı (bölge brüt getirisi, aynı kesintilerle)", deger: ("%" + (bolgeGetirisi * (11 / 12) * 0.95 * 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })) },
        { ad: "Sonuç", deger: `${T(netYillikKira)} ÷ ${("%" + (bolgeGetirisi * (11 / 12) * 0.95 * 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))} = ${T(gelir)}` },
      ],
      guclu: "Evin ürettiği kira gelirine bakar; yatırım amaçlı alımda fiyatın kirayla uyumunu gösterir.",
      zayif: "Kira, varsayılan %5,5 bölge getirisinden tahmin edilir; ilan kiralarını bilmez.",
    },
    {
      ad: "Maliyet yöntemi", deger: maliyet, agirlik: 0.15,
      aciklama: `Arsa payı ≈ ${yuvarla(arsaPayi).toLocaleString("tr-TR")} ₺ + yapım (${yapi.sinif} sınıfı ${yapi.tl.toLocaleString("tr-TR")} ₺/m² × ${PIYASA_MALIYET_CARPANI.toLocaleString("tr-TR")} piyasa farkı, ${Math.round(brutM2)} m² brüt) − %${Math.round(yipranma * 100)} yıpranma.`,
      adimlar: [
        { ad: "Arsa payı (bölge satış değerinin %40'ı)", deger: `${T(ham)} × 0,40 = ${T(arsaPayi)}` },
        { ad: "Brüt alan (net × 1,25)", deger: `${Math.round(brutM2)} m²` },
        { ad: `Yapım maliyeti (${YAPI_MALIYET_YILI} Bakanlık ${yapi.sinif} sınıfı × ${PIYASA_MALIYET_CARPANI.toLocaleString("tr-TR")})`, deger: `${T(yapi.tl)} × ${PIYASA_MALIYET_CARPANI.toLocaleString("tr-TR")} × ${Math.round(brutM2)} = ${T(yapi.tl * PIYASA_MALIYET_CARPANI * brutM2)}` },
        { ad: `Yıpranma (${e.binaYasi} yaş × %1,5, en fazla %60)`, deger: `−${Y(Math.round(yipranma * 100))}` },
        { ad: "Sonuç", deger: `${T(arsaPayi)} + ${T(yapi.tl * PIYASA_MALIYET_CARPANI * brutM2 * (1 - yipranma))} = ${T(maliyet)}` },
      ],
      guclu: "Aynı evi bugün yeniden yapmanın bedelini verir; yeni binalarda ve az satış olan yerlerde iyi bir alt sınırdır.",
      zayif: "Konumun prestijini tam yansıtmaz; değerli semtlerde piyasa değerinin altında kalır.",
    },
    {
      ad: `${il.ad} ortalaması (${il.satisKaynak === "TCMB" ? "TCMB" : "tahmini"})`, deger: tcmbBaz, agirlik: 0,
      aciklama: "İl ortalama m² fiyatı × net m². İlçe, mahalle ve ev özellikleri hesaba katılmaz; yalnızca karşılaştırma içindir.",
      adimlar: [{ ad: "İl ortalama m² × net m²", deger: `${T(il.satisM2)} × ${e.netM2} = ${T(tcmbBaz)}` }],
      guclu: il.satisKaynak === "TCMB" ? "Resmî TCMB konut fiyat verisidir." : "İlin genel fiyat seviyesini gösterir.",
      zayif: "Evin konumunu ve özelliklerini hiç dikkate almaz.",
    },
  ];

  const tahmini = yuvarla(yontemler.reduce((t, y) => t + y.deger * y.agirlik, 0));
  // Aralık, yöntemler birbirinden ne kadar ayrışıyorsa o kadar geniş (±%6 ile ±%20 arası).
  const agirlikli = yontemler.filter((y) => y.agirlik > 0).map((y) => y.deger);
  const yayilim = (Math.max(...agirlikli) - Math.min(...agirlikli)) / tahmini;
  const pay = Math.max(0.06, Math.min(0.2, 0.06 + yayilim / 4));
  const alt = yuvarla(tahmini * (1 - pay));
  const ust = yuvarla(tahmini * (1 + pay));
  const fark = e.istenenFiyat / tahmini - 1;
  const agirlikliYontemler = yontemler.filter((y) => y.agirlik > 0);
  const hesapOzeti = [
    `Üç yöntemle ayrı ayrı değer bulundu: ${agirlikliYontemler.map((y) => `${y.ad.split(" ")[0].toLocaleLowerCase("tr")} ${T(y.deger)}`).join(", ")}.`,
    `Ağırlıklı ortalama: ${agirlikliYontemler.map((y) => `${T(y.deger)} × %${Math.round(y.agirlik * 100)}`).join(" + ")} = ${T(tahmini)}.`,
    `Yöntemler arasındaki fark tahmini değerin %${Math.round(yayilim * 100)}'i; bu yüzden aralık ±%${Math.round(pay * 100)} alındı (${T(alt)} – ${T(ust)}).`,
    `Bölge m² fiyatı ${p.kaynak} üzerinden hesaplandı; evin özellikleri toplamda %${toplamOran >= 0 ? "+" : ""}${toplamOran} etki yaptı.`,
  ];

  const karar: EvSonuc["karar"] = fark <= 0.03 ? "Alınır — fiyatı uygun" : fark <= 0.15 ? "Makul — pazarlıkla alınır" : "Pahalı — önerilmez";
  const hedefFiyat = Math.min(e.istenenFiyat, yuvarla(tahmini * 0.97));
  const acilisTeklifi = Math.min(e.istenenFiyat, yuvarla(Math.max(hedefFiyat * 0.93, alt)));

  const brutGetiri = Math.round(((kiraTahmini * 12) / e.istenenFiyat) * 1000) / 10;
  const amortismanYil = Math.round((e.istenenFiyat / (kiraTahmini * 12)) * 10) / 10;

  // Kredi: eşit taksitli, aylık faiz
  let kredi: EvSonuc["kredi"];
  const pesinatOrani = e.pesinatOrani ?? 30;
  if (e.aylikFaiz && e.vadeAy) {
    const pesinat = yuvarla(e.istenenFiyat * (pesinatOrani / 100));
    const tutar = e.istenenFiyat - pesinat;
    const r = e.aylikFaiz / 100;
    const taksit = Math.round((tutar * r) / (1 - Math.pow(1 + r, -e.vadeAy)));
    kredi = { tutar, taksit, toplamOdeme: taksit * e.vadeAy, pesinat };
  }

  const t: Tavsiye[] = [];
  const add = (grup: Tavsiye["grup"], tur: Tavsiye["tur"], metin: string) => t.push({ grup, tur, metin });
  const TL = (n: number) => n.toLocaleString("tr-TR") + " ₺";

  // Fiyat ve pazarlık
  if (fark <= -0.1) add("Fiyat ve pazarlık", "uyari", `İstenen fiyat tahmini değerin %${Math.round(-fark * 100)} altında. Fırsat olabilir ama piyasanın çok altındaki fiyat bir soruna işaret edebilir (hukuki şerh, hasar, acil satış). Kontrolleri eksiksiz yapın.`);
  else if (fark <= 0.03) add("Fiyat ve pazarlık", "olumlu", "Fiyat tahmini değerle uyumlu; yine de küçük bir pazarlık payı bırakın.");
  else add("Fiyat ve pazarlık", fark <= 0.15 ? "bilgi" : "uyari", `İstenen fiyat tahmini değerin %${Math.round(fark * 100)} üstünde. Açılış teklifi ${TL(acilisTeklifi)} olabilir; ${TL(hedefFiyat)} civarında anlaşmayı hedefleyin, ${TL(ust)} üzerine çıkmayın.`);
  const enDusukYontem = yontemler.filter((y) => y.agirlik > 0).reduce((a, b) => (b.deger < a.deger ? b : a));
  const enYuksekYontem = yontemler.filter((y) => y.agirlik > 0).reduce((a, b) => (b.deger > a.deger ? b : a));
  if (enYuksekYontem.deger / enDusukYontem.deger > 1.3) {
    add("Fiyat ve pazarlık", "bilgi", `Yöntemler arasında fark büyük (${enDusukYontem.ad.split(" ")[0]}: ${TL(enDusukYontem.deger)}, ${enYuksekYontem.ad.split(" ")[0]}: ${TL(enYuksekYontem.deger)}). Bölgedeki benzer ilanlarla mutlaka karşılaştırın.`);
  }
  if (maliyet > emsal * 1.15) add("Fiyat ve pazarlık", "bilgi", "Yeniden yapım maliyeti piyasa değerinin üstünde: bölgede yeni konut arzı sınırlı kalabilir, bu uzun vadede fiyatları destekler.");
  if (e.kullanim === "Kiracılı") add("Fiyat ve pazarlık", "uyari", "Kiracılı evde tahliye için kiracının rızası veya yasal süre (ihtiyaç nedeniyle tahliye, satın alma sonrası 6 ay içinde ihtar ve dava) gerekir. Bunu fiyata yansıtın.");

  // Finansman
  if (kredi) {
    add("Finansman", "bilgi", `%${pesinatOrani} peşinat (${TL(kredi.pesinat)}) ile ${TL(kredi.tutar)} kredi, aylık %${(e.aylikFaiz ?? 0).toLocaleString("tr-TR")} faiz ve ${e.vadeAy} ay vadede yaklaşık ${TL(kredi.taksit)} taksit demek. Toplam geri ödeme ${TL(kredi.toplamOdeme)}.`);
    if (kredi.taksit > kiraTahmini * 1.5) add("Finansman", "uyari", `Taksit, aynı evin tahmini kirasının (${TL(kiraTahmini)}) ${(kredi.taksit / kiraTahmini).toFixed(1).replace(".", ",")} katı. Oturmak için alıyorsanız kirada kalıp birikim yapmak şimdilik daha ekonomik olabilir.`);
    else add("Finansman", "olumlu", "Taksit, tahmini kiraya yakın: kira öder gibi ev sahibi olabilirsiniz.");
  }
  if (!e.krediyeUygun || e.iskan === false) add("Finansman", "uyari", "İskânı olmayan veya krediye uygun olmayan evler için banka kredisi çıkmaz; peşin almanız ve ileride peşin alıcıya satmanız gerekir.");
  add("Finansman", "bilgi", "Tapu harcı alıcı ve satıcı için ayrı ayrı %2'dir (beyan edilen değer üzerinden). Ekspertiz, DASK, döner sermaye ve emlakçı komisyonunu da bütçeye ekleyin.");

  // Hukuki ve teknik kontrol
  if (e.binaYasi > 20) add("Hukuki ve teknik kontrol", "uyari", "Bina 2000 öncesi yönetmelikle yapılmış olabilir: deprem dayanıklılık (karot) raporu isteyin, riskli yapı tespiti yapılıp yapılmadığını belediyeden öğrenin.");
  if (e.binaYasi > 25 && ["34", "06", "35"].includes(e.il)) add("Hukuki ve teknik kontrol", "bilgi", "Eski binalarda kentsel dönüşüm hem risk hem fırsattır: arsa payınız yüksekse dönüşümde yeni daire hakkı doğabilir. Arsa payını tapudan kontrol edin.");
  if (e.tapu !== "Kat mülkiyeti") add("Hukuki ve teknik kontrol", "uyari", "Kat mülkiyetine geçilmemiş: iskân alınıp alınmadığını ve kat irtifakının kat mülkiyetine çevrilip çevrilemeyeceğini öğrenin.");
  if (e.iskan === false) add("Hukuki ve teknik kontrol", "uyari", "İskânı yok: kaçak kat/eklenti riski, yıkım ve para cezası ihtimali var. Belediyeden yapı ruhsatı ve projeyi inceleyin.");
  if (e.aidat && e.aidat > normalAidat * 1.5) add("Hukuki ve teknik kontrol", "uyari", "Aidat bölge ortalamasının belirgin üstünde: yönetimden son 12 ayın gider dökümünü ve birikmiş aidat borcu olup olmadığını isteyin.");
  if (e.cephe === "Kuzey") add("Hukuki ve teknik kontrol", "bilgi", "Kuzey cephe az güneş alır: ısınma giderleri ve rutubet için kış aylarında evi görmeye çalışın.");
  if (e.kat === "Bodrum" || e.kat === "Zemin/bahçe") add("Hukuki ve teknik kontrol", "bilgi", "Alt katlarda nem, su basması ve güvenlik riskine bakın; DASK ve konut sigortasını genişletmeyi düşünün.");
  if (e.kat === "En üst kat" || e.kat === "Çatı dubleks") add("Hukuki ve teknik kontrol", "bilgi", "Üst katta çatı yalıtımı ve su sızıntısı izlerini kontrol edin; çatı onarımı tüm kat malikleriyle paylaşılır.");
  add("Hukuki ve teknik kontrol", "bilgi", "Tapu kaydında ipotek, haciz ve şerh olmadığını, enerji kimlik belgesini ve yapı denetim evraklarını kontrol edin.");

  // Oturum / yatırım
  if ((e.amac ?? "Oturmak") === "Yatırım (kira)") {
    if (brutGetiri >= 5.5) add("Oturum / yatırım", "olumlu", `Bu fiyattan brüt kira getirisi %${brutGetiri.toLocaleString("tr-TR")} (amortisman ${amortismanYil.toLocaleString("tr-TR")} yıl): bölge için iyi bir yatırım.`);
    else if (brutGetiri < 4) add("Oturum / yatırım", "uyari", `Brüt kira getirisi %${brutGetiri.toLocaleString("tr-TR")}: kira geliri düşük, yatırımın getirisi büyük ölçüde değer artışına bağlı.`);
    else add("Oturum / yatırım", "bilgi", `Brüt kira getirisi %${brutGetiri.toLocaleString("tr-TR")}: ortalama düzeyde.`);
    if (["1+0", "1+1"].includes(e.odaSayisi)) add("Oturum / yatırım", "olumlu", "Küçük daireler daha kolay ve hızlı kiralanır; üniversite veya iş merkezine yakınsa boş kalma riski düşüktür.");
    if (!e.esyali && ["1+0", "1+1"].includes(e.odaSayisi)) add("Oturum / yatırım", "bilgi", "Küçük daireyi eşyalı kiraya vermek kirayı yaklaşık %10 artırabilir.");
    if (e.kullanim === "Kiracılı") add("Oturum / yatırım", "olumlu", "Kiracılı alırsanız ilk günden kira geliri başlar; mevcut kira sözleşmesini ve kira artış dönemini öğrenin.");
  } else {
    if (e.kullanim === "Kiracılı") add("Oturum / yatırım", "uyari", "Kendiniz oturacaksanız kiracının tahliye tarihini yazılı olarak netleştirin.");
    if (!e.sosyal && e.sosyal !== undefined) add("Oturum / yatırım", "uyari", "Okul, market ve hastaneye uzaklık günlük yaşamı zorlaştırır; çocuklu aileler için önemlidir.");
    if (e.anaCadde) add("Oturum / yatırım", "bilgi", "Ana cadde üzerinde: evi akşam saatlerinde de görüp gürültüyü kontrol edin; ses yalıtımlı pencere maliyetini hesaplayın.");
    add("Oturum / yatırım", "bilgi", "Evi farklı saatlerde ziyaret edin, komşular ve bina yönetimiyle konuşun; su basıncı, doğalgaz ve internet altyapısını kontrol edin.");
  }

  return {
    tahmini, alt, ust, fark, karar, hedefFiyat, acilisTeklifi, yontemler, aralikPayi: pay, hesapOzeti, etkenler: et,
    kiraTahmini, brutGetiri, amortismanYil, kredi, tavsiyeler: t, notlar: t.map((x) => x.metin),
  };
}
