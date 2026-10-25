"use client";

import type { Veri } from "../lib/veri";
import { YAPI_MALIYET_YILI, DASK } from "../lib/ev";

// Uygulamanın kullandığı tüm veri kaynakları, türleri, dönemleri ve güncellik durumu.
// /kaynaklar sayfasında gösterilir; dönemler veri dosyasından ve koddaki sabitlerden okunur.

export type KaynakTuru = "Resmî" | "Mevzuat" | "Açık veri" | "Tahmin" | "Kullanıcı";

export interface Kaynak {
  ad: string;
  tur: KaynakTuru;
  kullanim: string; // uygulamada nerede kullanıldığı
  donem: string;
  nasil: string; // nasıl güncellenir
  eski: boolean;
  linkler?: { ad: string; url: string }[];
}

// "2026-Q3" veya "2026 Ç1" biçimindeki çeyreğin bittiği tarih
function ceyrekSonu(donem: string): Date | null {
  const m = donem.match(/(\d{4})\D*(?:Q|Ç)\s*(\d)/i);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) * 3, 0);
}

// Veri dosyasındaki kaynak açıklamalarından tarih (ör. "Wikidata (CC0), 2026-10-23").
const kaynakTarihi = (v: Veri, anahtar: RegExp) => v.kaynaklar.find((k) => anahtar.test(k))?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "—";

export function kaynaklar(v: Veri, bugun = new Date()): Kaynak[] {
  const gun = (d: Date) => (bugun.getTime() - d.getTime()) / 86_400_000;
  const tcmbSon = ceyrekSonu(v.konutDonemi);
  const nufusYili = v.nufusYili ?? 2025;
  const tarihEski = (t: string, gunSiniri: number) => (/\d{4}-\d{2}-\d{2}/.test(t) ? gun(new Date(t)) > gunSiniri : false);
  const koordinat = kaynakTarihi(v, /koordinat/i);
  const ilceNufus = kaynakTarihi(v, /İlçe nüfus serisi/i);
  return [
    {
      ad: "Konut m² satış fiyatları",
      tur: "Resmî",
      kullanim: "İl konut fiyatı; İstanbul, Ankara, İzmir ve Türkiye geneli resmî, diğer iller Türkiye ortalamasından tahmin",
      donem: v.konutDonemi,
      nasil: "Otomatik, her ayın 20'si (GitHub Actions)",
      // TCMB çeyrek verisini yaklaşık 2–3 ay sonra yayımlar; 7 aydan eskiyse güncelleme aksamış demektir.
      eski: tcmbSon ? gun(tcmbSon) > 210 : false,
      linkler: [
        { ad: "TCMB EVDS", url: "https://evds3.tcmb.gov.tr/" },
        { ad: "Konut Fiyat Endeksi", url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Reel+Sektor+Istatistikleri/Konut+Fiyat+Endeksi/" },
      ],
    },
    {
      ad: "Nüfus, yaş, hane ve medeni durum (ADNKS)",
      tur: "Resmî",
      kullanim: "İl bilgisi, nüfus profili, konut talebi yorumları",
      donem: String(nufusYili),
      nasil: "Yılda bir (Şubat), elle",
      // N yılının ADNKS verisi N+1 Şubat'ında yayımlanır; N+2 Mart'ından sonra yenisi çıkmış olmalıdır.
      eski: bugun > new Date(nufusYili + 2, 2, 1),
      linkler: [
        { ad: "TÜİK veri portalı", url: "https://data.tuik.gov.tr/" },
        { ad: "İl/ilçe derlemesi (nufusune.com)", url: "https://www.nufusune.com/" },
      ],
    },
    {
      ad: "İlçe nüfus serisi 2015–2025 (ADNKS)",
      tur: "Resmî",
      kullanim: "Büyüme yönü, büyüyen/azalan ilçeler, yatırım yönü tavsiyeleri",
      donem: `2025 · derleme ${ilceNufus}`,
      nasil: "Yılda bir (Şubat), elle",
      eski: bugun > new Date(nufusYili + 2, 2, 1),
      linkler: [{ ad: "TÜİK veri portalı", url: "https://data.tuik.gov.tr/" }],
    },
    {
      ad: "Eğitim süresi (Ulusal Eğitim İstatistikleri)",
      tur: "Resmî",
      kullanim: "Nüfus profili (yalnızca TÜİK'in açıkladığı 11 il)",
      donem: String(nufusYili),
      nasil: "Yılda bir (Haziran), elle",
      eski: bugun > new Date(nufusYili + 2, 6, 1),
      linkler: [{ ad: "TÜİK veri portalı", url: "https://data.tuik.gov.tr/" }],
    },
    {
      ad: "Yapı yaklaşık birim maliyetleri",
      tur: "Resmî",
      kullanim: "Ev değerlemesinde maliyet yöntemi",
      donem: String(YAPI_MALIYET_YILI),
      nasil: "Yılda bir (Ocak–Şubat), elle",
      eski: bugun > new Date(YAPI_MALIYET_YILI + 1, 2, 1),
      linkler: [{ ad: "Resmî Gazete", url: "https://www.resmigazete.gov.tr/" }],
    },
    {
      ad: "Zorunlu deprem sigortası (DASK) tarifesi",
      tur: "Resmî",
      kullanim: "Ev sayfasında yıllık DASK prim aralığı",
      donem: `${DASK.donem} dönemi`,
      nasil: "DASK yeni dönem açıklayınca, elle",
      eski: false,
      linkler: [{ ad: "DASK tarife ve primler", url: "https://www.dask.gov.tr/tr/tarife-ve-primler" }],
    },
    {
      ad: "İl / ilçe / mahalle listesi",
      tur: "Resmî",
      kullanim: "Konum seçimleri",
      donem: v.guncelleme,
      nasil: "Her yayında otomatik",
      eski: false,
      linkler: [{ ad: "PTT posta kodları", url: "https://postakodu.ptt.gov.tr/" }],
    },
    {
      ad: "İlçe ve mahalle koordinatları",
      tur: "Açık veri",
      kullanim: "Harita, büyüme yönü, yakın yer uzaklıkları (ilçe 968/973, mahalle ~33 bin)",
      donem: koordinat,
      nasil: "Nadiren, elle",
      eski: tarihEski(koordinat, 730),
      linkler: [{ ad: "Wikidata (CC0)", url: "https://www.wikidata.org/" }],
    },
    {
      ad: "Hastane, okul ve AVM konumları",
      tur: "Açık veri",
      kullanim: "Ev sayfasında mahalle çevresindeki yerler (54 il derlendi)",
      donem: "il dosyalarında tarih yazar",
      nasil: "Birkaç ayda bir, elle",
      eski: false,
      linkler: [{ ad: "OpenStreetMap (ODbL)", url: "https://www.openstreetmap.org/copyright" }],
    },
    // Tavsiyelerde ve doğrulama listesinde kullanılan mevzuat kuralları ve resmî sorgu ekranları
    {
      ad: "Tapu harcı",
      tur: "Mevzuat",
      kullanim: "Alım masrafı tavsiyeleri: alıcı ve satıcı için ayrı ayrı %2 (492 sayılı Harçlar Kanunu)",
      donem: "Yürürlükte",
      nasil: "Oran değişirse kodda (lib/ev.ts, lib/puan.ts)",
      eski: false,
      linkler: [{ ad: "Mevzuat Bilgi Sistemi", url: "https://www.mevzuat.gov.tr/" }, { ad: "GİB", url: "https://www.gib.gov.tr/" }],
    },
    {
      ad: "Emlak vergisi ve değer artış kazancı",
      tur: "Mevzuat",
      kullanim: "Konut binde 1 / büyükşehirde binde 2; arsa binde 3 / binde 6 (1319 s. Kanun); 5 yıl dolmadan satışta değer artış kazancı vergisi (GVK)",
      donem: "Yürürlükte",
      nasil: "Oran değişirse kodda",
      eski: false,
      linkler: [{ ad: "Mevzuat Bilgi Sistemi", url: "https://www.mevzuat.gov.tr/" }, { ad: "GİB", url: "https://www.gib.gov.tr/" }],
    },
    {
      ad: "Tarım arazisi ve hisseli tapu kuralları",
      tur: "Mevzuat",
      kullanim: "5403 sayılı Toprak Koruma ve Arazi Kullanımı Kanunu (bölünme, hisseli satış); Türk Medeni Kanunu önalım (şufa) hakkı süreleri",
      donem: "Yürürlükte",
      nasil: "Kodda (lib/puan.ts, lib/dogrulama.ts)",
      eski: false,
      linkler: [{ ad: "Mevzuat Bilgi Sistemi", url: "https://www.mevzuat.gov.tr/" }],
    },
    {
      ad: "Parsel, imar ve afet sorguları",
      tur: "Mevzuat",
      kullanim: "Arsa doğrulama listesi ve tavsiyelerdeki resmî sorgu ekranları (uygulama bu verileri çekmez, bağlantı verir)",
      donem: "—",
      nasil: "Kullanıcı resmî ekrandan sorgular",
      eski: false,
      linkler: [
        { ad: "TKGM Parsel Sorgu", url: "https://parselsorgu.tkgm.gov.tr/" },
        { ad: "AFAD Deprem Tehlike Haritası", url: "https://www.turkiye.gov.tr/afad-deprem-tehlike-haritasi" },
        { ad: "MTA Yerbilimleri (diri fay)", url: "https://yerbilimleri.mta.gov.tr/" },
      ],
    },
    {
      ad: "Kamu arsası ihaleleri ve ekspertiz kuruluşları",
      tur: "Mevzuat",
      kullanim: "Milli Emlak satış ilanları; SPK lisanslı gayrimenkul değerleme kuruluşları (ekspertiz yönlendirmesi)",
      donem: "—",
      nasil: "Bağlantı; liste kurumun sitesinde güncellenir",
      eski: false,
      linkler: [
        { ad: "Milli Emlak satış ilanları", url: "https://www.milliemlak.gov.tr/#/satis" },
        { ad: "SPK değerleme kuruluşları", url: "https://spk.gov.tr/kurumlar/gayrimenkul-degerleme-kuruluslari" },
        { ad: "DASK prim hesaplama", url: "https://www.dask.gov.tr/tr/police-prim-ve-bedeli-hesaplama" },
      ],
    },
    {
      ad: "İlçe fiyat kademeleri",
      tur: "Tahmin",
      kullanim: "İlçe fiyat farkı (yalnızca 6 büyükşehirde kademe; diğerlerinde merkez/kırsal ayrımı). Mahalle farkı uygulanmaz.",
      donem: "—",
      nasil: "Kodda sabit",
      eski: false,
    },
    {
      ad: "Kira ve arsa m² değeri",
      tur: "Tahmin",
      kullanim: "Kira: %5,5 brüt getiri varsayımı; imarlı arsa: konut m² fiyatının ~%45'i",
      donem: "—",
      nasil: "Kodda sabit",
      eski: false,
    },
    {
      ad: "Arsa bilgileri (ada/parsel, imar, fiyat, ekspertiz)",
      tur: "Kullanıcı",
      kullanim: "Arsalarım; resmî doğrulama listesiyle kontrol edilmelidir",
      donem: "—",
      nasil: "Kullanıcı girer",
      eski: false,
    },
    {
      ad: "Ev özellikleri, portföy ve müşteri kayıtları",
      tur: "Kullanıcı",
      kullanim: "Ev Analiz formu, portföy kayıtları, müşteri bilgileri, rapor kimliği ve ekspertiz firması; yalnızca danışmanın kendi hesabında",
      donem: "—",
      nasil: "Kullanıcı girer",
      eski: false,
    },
  ];
}
