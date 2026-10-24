import { konutPiyasasi } from "./konut";
import { ilMeta } from "./iller-meta";
import { buyumeAnalizi } from "./buyume";

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
  ulasimKm: number; // şehir/iş merkezine uzaklık
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
  sosyal?: boolean; // eski alan: okul, market, hastane yürüme mesafesinde (yerine ayrıntılı yakınlıklar geldi)
  // Yakınlıklar (verilmezse nötr kabul edilir)
  metro?: Yakinlik; // metro, raylı sistem, metrobüs
  otobus?: Yakinlik;
  sosyalHayat?: Yakinlik; // kafe, restoran, AVM, kültür
  market?: Yakinlik;
  devletOkulu?: Yakinlik;
  ozelOkul?: Yakinlik;
  hastane?: Yakinlik;
  park?: Yakinlik; // park, yeşil alan, oyun alanı
  cocuklu?: boolean; // okul çağında çocuk var
  kullanim?: "Boş" | "Kiracılı" | "Sahibi oturuyor";
  esyali?: boolean;
  amac?: "Oturmak" | "Yatırım (kira)";
  // Finansman
  mevcutKira?: number; // şu an oturduğunuz evin aylık kirası (0: kirada değil)
  pesinatOrani?: number; // %
  aylikFaiz?: number; // %
  vadeAy?: number;
}

export type Yakinlik = "Yürüme mesafesinde" | "Yakın (araçla 5–10 dk)" | "Biraz uzak (araçla 10–20 dk)" | "Uzak";
export const YAKINLIKLAR: Yakinlik[] = ["Yürüme mesafesinde", "Yakın (araçla 5–10 dk)", "Biraz uzak (araçla 10–20 dk)", "Uzak"];
// "Biraz uzak" uzaklık etkisinin yarısını alır.
const BIRAZ_UZAK: Yakinlik = "Biraz uzak (araçla 10–20 dk)";

export interface AileUygunlugu {
  puan: number; // 0–100
  derece: "Çok uygun" | "Uygun" | "Orta" | "Zayıf";
  arti: string[];
  eksi: string[];
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
  grup: "Fiyat ve pazarlık" | "Kira mı, satın almak mı?" | "Finansman" | "Hukuki ve teknik kontrol" | "Oturum / yatırım";
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
  aile: AileUygunlugu;
  dask: { sigortaBedeli: number; min: number; max: number; birimMaliyet: number };
  notlar: string[]; // geriye dönük uyumluluk: tavsiye metinleri
}

// Aile için uygunluk: okul, park, hastane, güvenlik ve konut özelliklerinden kural tabanlı puan (50 nötr).
export function aileUygunlugu(e: EvBilgisi): AileUygunlugu {
  let p = 50;
  const arti: string[] = [];
  const eksi: string[] = [];
  const yakin = (v: Yakinlik | undefined, ad: string, a: number, u: number) => {
    if (v === "Yürüme mesafesinde") (p += a), arti.push(ad + " yürüme mesafesinde");
    else if (v === "Uzak") (p -= u), eksi.push(ad + " uzak");
    else if (v === BIRAZ_UZAK && u) (p -= Math.round(u / 2)), eksi.push(ad + " biraz uzak");
  };
  yakin(e.devletOkulu, "devlet okulu", 12, 10);
  yakin(e.ozelOkul, "özel okul", 5, 0);
  yakin(e.park, "park/oyun alanı", 8, 6);
  yakin(e.hastane, "hastane", 5, 6);
  yakin(e.market, "market", 4, 5);
  yakin(e.otobus, "otobüs", 3, 4);
  const oda = parseInt(e.odaSayisi, 10);
  if (oda >= 3) (p += 6), arti.push(`${e.odaSayisi} oda`);
  else if (oda <= 1) (p -= 10), eksi.push("çocuklu aile için küçük daire");
  if (e.site) (p += 6), arti.push("site içinde (güvenlik, oyun alanı)");
  if (e.anaCadde) (p -= 5), eksi.push("gürültülü ana cadde");
  if (e.kat === "Bodrum") (p -= 6), eksi.push("bodrum kat");
  if (!e.asansor && e.toplamKat >= 4) (p -= 5), eksi.push("asansörsüz yüksek bina (bebek arabası)");
  if (e.binaYasi > 25) (p -= 4), eksi.push("eski bina (deprem güvenliği)");
  const puan = Math.max(0, Math.min(100, Math.round(p)));
  const derece = puan >= 75 ? "Çok uygun" : puan >= 60 ? "Uygun" : puan >= 45 ? "Orta" : "Zayıf";
  return { puan, derece, arti, eksi };
}

// Zorunlu Deprem Sigortası (DASK) tarifesi, 01.10.2026 ve sonrası başlayan poliçeler (dask.gov.tr, Tarife ve Primler).
// Risk grubu (I–VII) adrese göre DASK tarafından belirlenir ve açık liste olarak yayımlanmaz; bu yüzden aralık verilir.
// Prim = brüt m² × birim maliyet × oran (binde). Yapı tarzı betonarme kabul edilir.
export const DASK = {
  donem: "01.10.2026",
  birimMaliyet: 12039, // TL/m², betonarme
  oranlar: [2.82, 2.51, 2.13, 2.0, 1.5, 1.07, 0.73], // binde, I → VII
};

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
  if (e.ulasimKm <= 2) ekle(`Şehir/iş merkezine yakın (${e.ulasimKm} km)`, 4);
  else if (e.ulasimKm > 10) ekle(`Şehir/iş merkezine uzak (${e.ulasimKm} km)`, -6);

  // Yakınlıklar: yürüme mesafesi artı, uzak eksi. Raylı sistem fiyatı en çok etkileyen ulaşım türüdür.
  const YAKIN_ETKI: Record<string, [string, number, number]> = {
    metro: ["Metro/raylı sistem", 6, -3],
    otobus: ["Otobüs/minibüs durağı", 1, -4],
    sosyalHayat: ["Sosyal hayat (kafe, restoran, AVM)", 3, -3],
    market: ["Market/çarşı", 1, -3],
    devletOkulu: ["Devlet okulu", 2, -2],
    ozelOkul: ["Özel okul", 2, 0],
    hastane: ["Hastane", 1, -2],
    park: ["Park/yeşil alan", 2, -1],
  };
  for (const [k, [ad, yakin, uzak]] of Object.entries(YAKIN_ETKI)) {
    const v = e[k as keyof EvBilgisi] as Yakinlik | undefined;
    if (v === "Yürüme mesafesinde") ekle(`${ad} yürüme mesafesinde`, yakin);
    else if (v === "Uzak") ekle(`${ad} uzak`, uzak);
    else if (v === BIRAZ_UZAK) ekle(`${ad} biraz uzak (araçla 10–20 dk)`, Math.trunc(uzak / 2));
  }
  ekle(`Tapu: ${e.tapu}`, { "Kat mülkiyeti": 0, "Kat irtifakı": -4, "Hisseli/arsa tapusu": -15 }[e.tapu]);
  if (!e.krediyeUygun) ekle("Krediye uygun değil — alıcı kitlesi daralır", -8);

  if (e.cephe) ekle(`Cephe: ${e.cephe}`, { Güney: 3, "Doğu/Batı": 0, Kuzey: -4, "Çift cephe ve üzeri": 4 }[e.cephe]);
  if (e.balkon === false) ekle("Balkon yok", -3);
  if (e.banyo === 2) ekle("İki banyo (ebeveyn banyosu)", e.netM2 >= 90 ? 3 : 1);
  if (e.iskan === false) ekle("İskân (yapı kullanma izni) yok", -10);
  if (e.anaCadde) ekle("Gürültülü ana cadde üzerinde", -4);
  // Eski kayıtlarda ayrıntılı yakınlık yoksa tek onay kutusu kullanılır.
  if (e.sosyal === false && !e.market && !e.devletOkulu && !e.hastane) ekle("Okul/market/hastane yürüme mesafesinde değil", -4);
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
      aciklama: `Bölge m² fiyatı (${p.satisM2.toLocaleString("tr-TR")} ₺) × net m², evin özelliklerine göre ${toplamOran >= 0 ? "+" : "−"}%${Math.abs(toplamOran)} düzeltme.`,
      adimlar: [
        { ad: "Bölge ortalama m² fiyatı", deger: `${T(p.satisM2)} (${p.kaynak})` },
        { ad: "Ham değer (m² fiyatı × net m²)", deger: `${T(p.satisM2)} × ${e.netM2} = ${T(ham)}` },
        { ad: `Özellik düzeltmeleri (${et.length} etken)`, deger: (hamToplam >= 0 ? "+" : "") + Y(hamToplam) + (hamToplam !== toplamOran ? ` → sınır nedeniyle ${toplamOran >= 0 ? "+" : ""}${Y(toplamOran)}` : "") },
        ...(enOlumlu.length ? [{ ad: "En çok artıranlar", deger: enOlumlu.map((x) => `${x.metin} (+${x.oran})`).join(", ") }] : []),
        ...(enOlumsuz.length ? [{ ad: "En çok düşürenler", deger: enOlumsuz.map((x) => `${x.metin} (${x.oran})`).join(", ") }] : []),
        { ad: "Sonuç", deger: `${T(ham)} × (1 ${toplamOran >= 0 ? "+" : "−"} ${Math.abs(toplamOran)}/100) = ${T(emsal)}` },
      ],
      guclu: "Alıcıların gerçekte ödediği bölge fiyatlarına dayanır; konut değerlemesinde en çok kullanılan yöntemdir.",
      zayif: "Bölge fiyatı il ortalamasından ilçe kademesiyle türetilir; mahalle ve aynı sokaktaki gerçek satışları bilmez.",
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
    `En yüksek ve en düşük yöntem arasındaki fark tahmini değere oranla %${Math.round(yayilim * 100)}; bu yüzden aralık ±%${Math.round(pay * 100)} alındı (${T(alt)} – ${T(ust)}).`,
    `Bölge m² fiyatı ${p.kaynak} üzerinden hesaplandı; evin özellikleri toplamda ${toplamOran >= 0 ? "+" : "−"}%${Math.abs(toplamOran)} etki yaptı.`,
  ];

  const karar: EvSonuc["karar"] = fark <= 0.03 ? "Alınır — fiyatı uygun" : fark <= 0.15 ? "Makul — pazarlıkla alınır" : "Pahalı — önerilmez";
  const hedefFiyat = Math.min(e.istenenFiyat, yuvarla(tahmini * 0.97));
  const acilisTeklifi = Math.min(e.istenenFiyat, yuvarla(Math.max(hedefFiyat * 0.93, alt)));

  const brutGetiri = Math.round(((kiraTahmini * 12) / e.istenenFiyat) * 1000) / 10;

  const sigortaBedeli = Math.round(e.netM2 * 1.25 * DASK.birimMaliyet);
  const dask = {
    sigortaBedeli,
    birimMaliyet: DASK.birimMaliyet,
    min: Math.round((sigortaBedeli * Math.min(...DASK.oranlar)) / 1000),
    max: Math.round((sigortaBedeli * Math.max(...DASK.oranlar)) / 1000),
  };
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
  // Şu an kirada oturuluyorsa: ödenen kira, bu evin piyasa kirası ve taksitle karşılaştırılır.
  const mk = e.mevcutKira ?? 0;
  if (mk > 0) {
    const kiraFarki = kiraTahmini - mk;
    add(
      "Kira mı, satın almak mı?",
      "bilgi",
      `Şu an ${TL(mk)}/ay kira ödüyorsunuz; bu evin tahmini piyasa kirası ${TL(kiraTahmini)}/ay. ` +
        (kiraFarki > mk * 0.15
          ? `Bu ev, oturduğunuz evden aylık yaklaşık ${TL(kiraFarki)} daha değerli bir konut: aynı evi kiralamak da bütçenizi zorlar, alım kararını buna göre değerlendirin.`
          : kiraFarki < -mk * 0.15
            ? `Bu ev, oturduğunuz evden aylık yaklaşık ${TL(-kiraFarki)} daha uygun bir konut: daha küçük veya daha uygun bir bölgeye geçiyorsunuz.`
            : "Bu ev, oturduğunuz evle benzer kira seviyesinde."),
    );
    if (kredi) {
      const ek = kredi.taksit - mk;
      add(
        "Kira mı, satın almak mı?",
        ek > mk ? "uyari" : ek > 0 ? "bilgi" : "olumlu",
        ek > 0
          ? `Kira yerine ${TL(kredi.taksit)} taksit ödeyeceksiniz: aylık bütçenize ${TL(ek)} ek yük gelir (${e.vadeAy} ay boyunca toplam ${TL(ek * (e.vadeAy ?? 0))}). Peşinat (${TL(kredi.pesinat)}) da birikiminizden çıkar.`
          : `Taksit (${TL(kredi.taksit)}) şu anki kiranızdan ${TL(-ek)} düşük: kira öder gibi ev sahibi olursunuz.`,
      );
      if (ek > mk) add("Kira mı, satın almak mı?", "bilgi", "Taksit kiranızın iki katını aşıyor: daha uzun vade, daha yüksek peşinat veya daha uygun bir ev, aylık yükü kiranıza yaklaştırır. Kira artışlarını da hesaba katın; taksit sabit kalırken kira her yıl artar.");
    } else {
      const yillik = mk * 12;
      const yil = Math.round((e.istenenFiyat / yillik) * 10) / 10;
      add(
        "Kira mı, satın almak mı?",
        "bilgi",
        `Peşin alırsanız yılda ${TL(yillik)} kira ödemezsiniz; bu tasarruf, ev fiyatına oranla yıllık %${((yillik / e.istenenFiyat) * 100).toFixed(1).replace(".", ",")} getiri demek ve fiyatı yaklaşık ${yil.toLocaleString("tr-TR")} yılda karşılar. Bu oranı paranızın alternatif getirisiyle (mevduat vb.) karşılaştırın.`,
      );
    }
    add("Kira mı, satın almak mı?", "bilgi", "Kirada oturan biri için ev almanın ek maliyetleri: tapu harcı, komisyon, taşınma, aidat ve emlak vergisi. Bunlar ilk yıl kira tasarrufunun önemli bir kısmını götürebilir.");
  }
  if (!e.krediyeUygun || e.iskan === false) add("Finansman", "uyari", "İskânı olmayan veya krediye uygun olmayan evler için banka kredisi çıkmaz; peşin almanız ve ileride peşin alıcıya satmanız gerekir.");
  add("Finansman", "bilgi", "Tapu harcı alıcı ve satıcı için ayrı ayrı %2'dir (gerçek satış bedeli üzerinden). Ekspertiz, DASK, döner sermaye ve emlakçı komisyonunu da bütçeye ekleyin.");
  const ekMasraf = yuvarla(e.istenenFiyat * 0.02 + e.istenenFiyat * 0.02 * 1.2); // alıcı harcı + %2 komisyon ve %20 KDV
  add("Finansman", "bilgi", `Kabaca hesap: ${TL(e.istenenFiyat)} fiyatta alıcı tapu harcı ${TL(yuvarla(e.istenenFiyat * 0.02))}; emlakçı komisyonu (genelde %2 + KDV) ile birlikte ek masraf ${TL(ekMasraf)} civarında olabilir.`);
  add("Finansman", "bilgi", "Konutlarda her yıl emlak vergisi ödenir: binde 1, büyükşehir belediyesi sınırlarında binde 2.");
  add("Finansman", "bilgi", `Zorunlu deprem sigortası (DASK) yaptırılmadan tapu işlemi yapılmaz. Bu ev için yıllık DASK primi risk grubuna göre yaklaşık ${TL(dask.min)} – ${TL(dask.max)} (sigorta bedeli ${TL(dask.sigortaBedeli)}, betonarme). Kesin prim ve evin risk grubu için DASK prim hesaplama ekranını kullanın.`);
  if (kredi) add("Finansman", "bilgi", "Kredi kullanacaksanız banka ekspertizi istenen fiyatın altında çıkarsa kredi tutarı ekspertiz değerine göre belirlenir; aradaki farkı peşin ödemeniz gerekir.");

  // Hukuki ve teknik kontrol
  if (e.binaYasi > 20) add("Hukuki ve teknik kontrol", "uyari", "Bina 2000 öncesi yönetmelikle yapılmış olabilir: deprem dayanıklılık (karot) raporu isteyin, riskli yapı tespiti yapılıp yapılmadığını belediyeden öğrenin.");
  if (e.binaYasi > 25 && ["34", "06", "35"].includes(e.il)) add("Hukuki ve teknik kontrol", "bilgi", "Eski binalarda kentsel dönüşüm hem risk hem fırsattır: arsa payınız yüksekse dönüşümde yeni daire hakkı doğabilir. Arsa payını tapudan kontrol edin.");
  if (e.tapu !== "Kat mülkiyeti") add("Hukuki ve teknik kontrol", "uyari", "Kat mülkiyetine geçilmemiş: iskân alınıp alınmadığını ve kat irtifakının kat mülkiyetine çevrilip çevrilemeyeceğini öğrenin.");
  if (e.iskan === false) add("Hukuki ve teknik kontrol", "uyari", "İskânı yok: kaçak kat/eklenti riski, yıkım ve para cezası ihtimali var. Belediyeden yapı ruhsatı ve projeyi inceleyin.");
  if (e.aidat && e.aidat > normalAidat * 1.5) add("Hukuki ve teknik kontrol", "uyari", "Aidat bölge ortalamasının belirgin üstünde: yönetimden son 12 ayın gider dökümünü ve birikmiş aidat borcu olup olmadığını isteyin.");
  if (e.cephe === "Kuzey") add("Hukuki ve teknik kontrol", "bilgi", "Kuzey cephe az güneş alır: ısınma giderleri ve rutubet için kış aylarında evi görmeye çalışın.");
  if (e.kat === "Bodrum" || e.kat === "Zemin/bahçe") add("Hukuki ve teknik kontrol", "bilgi", "Alt katlarda nem, su basması ve güvenlik riskine bakın; DASK ve konut sigortasını genişletmeyi düşünün.");
  if (e.kat === "En üst kat" || e.kat === "Çatı dubleks") add("Hukuki ve teknik kontrol", "bilgi", "Üst katta çatı yalıtımı ve su sızıntısı izlerini kontrol edin; çatı onarımı tüm kat malikleriyle paylaşılır.");
  add("Hukuki ve teknik kontrol", "bilgi", "Deprem riski: evin bulunduğu noktanın yer hareketi değerini e-Devlet üzerinden AFAD Deprem Tehlike Haritası ile (turkiye.gov.tr/afad-deprem-tehlike-haritasi), yakındaki diri fayları MTA Yerbilimleri haritasında (yerbilimleri.mta.gov.tr) kontrol edin. Riskli yapı tespiti yapılıp yapılmadığını belediyeye sorun.");
  add("Hukuki ve teknik kontrol", "bilgi", "Tapu kaydında ipotek, haciz ve şerh olmadığını, enerji kimlik belgesini ve yapı denetim evraklarını kontrol edin.");
  add("Hukuki ve teknik kontrol", "bilgi", "Satıcıdan isteyin: güncel tapu fotokopisi, iskân belgesi, onaylı mimari proje, aidat ve emlak vergisi borcu olmadığını gösteren belgeler. Projede olmayan kapatılmış balkon, kat veya bölme değişikliği kaçak sayılabilir.");
  add("Hukuki ve teknik kontrol", "bilgi", "Ödemeyi tapu devriyle aynı anda yapın; kapora verirseniz yazılı sözleşmeyle ve satıcının tapudaki adına yapın. Vekaletle satışta vekaletnamenin güncelliğini noterden doğrulayın.");
  if (e.binaYasi <= 5) add("Hukuki ve teknik kontrol", "bilgi", "Yeni binada yapı denetim firmasını ve müteahhidi araştırın; gizli ayıplar için müteahhidin sorumluluğu sürer, teslim tutanağındaki eksikleri yazılı bildirin.");

  // Oturum / yatırım
  // İlçenin TÜİK nüfus artışı, değer artışı ve kira talebi için yön verir.
  const b = buyumeAnalizi(e.il);
  const ib = b?.ilceler.find((x) => x.ad === e.ilce);
  if (b && ib) {
    const fark = ib.artis5 - b.ilArtis5;
    const y = (n: number) => (n > 0 ? "+" : "") + n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
    add(
      "Oturum / yatırım",
      fark > 2 ? "olumlu" : "bilgi",
      `${e.ilce} nüfusu 2020–2025'te %${y(ib.artis5)} değişti (il geneli %${y(b.ilArtis5)}): ` +
        (fark > 2 ? "ilçe ilden hızlı büyüyor, konut talebi ve değer artışı beklentisi güçlü." : fark < -2 ? (ib.artis5 < 0 ? "nüfus azalıyor. Merkezi ve pahalı ilçelerde bu çoğunlukla yüksek fiyat, hane küçülmesi ve kentsel dönüşümden kaynaklanır; yine de yeni talep artışı sınırlıdır, fiyatı bölgedeki satılık ilanlarla dikkatle karşılaştırın." : "ilçe ilin gerisinde büyüyor; değer artışı il ortalamasından yavaş olabilir.") : "ilçe il ortalamasına yakın büyüyor."),
    );
  }
  if (["4+1", "5+1 ve üzeri"].includes(e.odaSayisi)) add("Oturum / yatırım", "bilgi", "Büyük dairelerin alıcı ve kiracı kitlesi dardır; satmak istediğinizde süre uzayabilir. Yeniden satış düşünüyorsanız 2+1 ve 3+1 daha likittir.");
  if (e.binaYasi > 30) add("Oturum / yatırım", "bilgi", "Bina 30 yaşın üzerinde: yakın gelecekte kentsel dönüşüm ihtimali yüksek. Dönüşümde kira yardımı ve geçici taşınma sürecini hesaba katın.");
  if ((e.amac ?? "Oturmak") === "Yatırım (kira)") {
    add("Oturum / yatırım", "bilgi", "Kira geliri her yıl mart ayında beyan edilir (konut kirasında yıllık istisna tutarı aşılırsa); kira sözleşmesini yazılı yapın ve depozitoyu sözleşmeye yazın.");
    if (brutGetiri >= 5.5) add("Oturum / yatırım", "olumlu", `Bu fiyattan brüt kira getirisi %${brutGetiri.toLocaleString("tr-TR")} (amortisman ${amortismanYil.toLocaleString("tr-TR")} yıl): bölge için iyi bir yatırım.`);
    else if (brutGetiri < 4) add("Oturum / yatırım", "uyari", `Brüt kira getirisi %${brutGetiri.toLocaleString("tr-TR")}: kira geliri düşük, yatırımın getirisi büyük ölçüde değer artışına bağlı.`);
    else add("Oturum / yatırım", "bilgi", `Brüt kira getirisi %${brutGetiri.toLocaleString("tr-TR")}: ortalama düzeyde.`);
    if (["1+0", "1+1"].includes(e.odaSayisi)) add("Oturum / yatırım", "olumlu", "Küçük daireler daha kolay ve hızlı kiralanır; üniversite veya iş merkezine yakınsa boş kalma riski düşüktür.");
    if (!e.esyali && ["1+0", "1+1"].includes(e.odaSayisi)) add("Oturum / yatırım", "bilgi", "Küçük daireyi eşyalı kiraya vermek kirayı yaklaşık %10 artırabilir.");
    if (e.kullanim === "Kiracılı") add("Oturum / yatırım", "olumlu", "Kiracılı alırsanız ilk günden kira geliri başlar; mevcut kira sözleşmesini ve kira artış dönemini öğrenin.");
  } else {
    if (e.kullanim === "Kiracılı") add("Oturum / yatırım", "uyari", "Kendiniz oturacaksanız kiracının tahliye tarihini yazılı olarak netleştirin.");
    if ((e.hastane === "Uzak" || e.hastane === BIRAZ_UZAK)) add("Oturum / yatırım", "uyari", "Hastaneye uzak: yaşlı veya kronik rahatsızlığı olan aile bireyleri için acil durumda ulaşım süresini hesaplayın.");
    if ((e.metro === "Uzak" || e.metro === BIRAZ_UZAK) && (e.otobus === "Uzak" || e.otobus === BIRAZ_UZAK)) add("Oturum / yatırım", "uyari", "Toplu taşımaya uzak: araçsız yaşam zor; ikinci araç, yakıt ve otopark masrafını bütçeye ekleyin.");
    if (e.sosyalHayat === "Uzak") add("Oturum / yatırım", "bilgi", "Sosyal hayata uzak: sakin bir çevre arayanlar için artı, gençler ve tek yaşayanlar için eksi; kiralama ve satışta alıcı kitlesi daralabilir.");
    if (e.anaCadde) add("Oturum / yatırım", "bilgi", "Ana cadde üzerinde: evi akşam saatlerinde de görüp gürültüyü kontrol edin; ses yalıtımlı pencere maliyetini hesaplayın.");
    add("Oturum / yatırım", "bilgi", "Evi farklı saatlerde ziyaret edin, komşular ve bina yönetimiyle konuşun; su basıncı, doğalgaz ve internet altyapısını kontrol edin.");
  }

  const aile = aileUygunlugu(e);
  if ((e.amac ?? "Oturmak") === "Oturmak" && (e.cocuklu || aile.puan < 50)) {
    add("Oturum / yatırım", aile.puan >= 70 ? "olumlu" : aile.puan >= 50 ? "bilgi" : "uyari", `Aile için uygunluk ${aile.puan}/100 (${aile.derece}).${aile.eksi.length ? " Eksikler: " + aile.eksi.join(", ") + "." : ""}`);
    if (e.cocuklu && e.devletOkulu !== "Yürüme mesafesinde") add("Oturum / yatırım", "bilgi", "Devlet okullarında kayıt adrese göre yapılır (e-Okul adres kaydı): evin bağlı olduğu ilkokul ve ortaokulu, okulun kalabalığını ve servis imkânını önceden öğrenin.");
    if (e.cocuklu && e.ozelOkul === "Yürüme mesafesinde") add("Oturum / yatırım", "olumlu", "Özel okula yürüme mesafesi servis ücretini ve yol süresini azaltır; okulun ücretini ve kontenjanını ayrıca sorun.");
  }
  if ((e.amac ?? "Oturmak") === "Yatırım (kira)" && e.metro === "Yürüme mesafesinde") add("Oturum / yatırım", "olumlu", "Raylı sisteme yürüme mesafesi kiracı bulmayı kolaylaştırır ve boş kalma süresini kısaltır.");

  return {
    aile,
    dask,
    tahmini, alt, ust, fark, karar, hedefFiyat, acilisTeklifi, yontemler, aralikPayi: pay, hesapOzeti, etkenler: et,
    kiraTahmini, brutGetiri, amortismanYil, kredi, tavsiyeler: t, notlar: t.map((x) => x.metin),
  };
}
