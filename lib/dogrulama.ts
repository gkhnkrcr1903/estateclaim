import { kamuMu, type Arsa } from "./arsa";

// Arsa alımından önce resmi kaynaklardan yapılması gereken doğrulamalar. Uygulamadaki değerler tahmindir;
// bu adımlar tamamlanmadan alım kararı verilmemelidir. Bağlantılar yalnızca resmi kurumlara gider.
export interface Kontrol {
  id: string;
  baslik: string;
  aciklama: string;
  kaynak?: { ad: string; url?: string };
}

export function kontrolListesi(a: Arsa): Kontrol[] {
  const k: Kontrol[] = [
    {
      id: "parsel",
      baslik: "Parsel bilgisi resmi kayıtla aynı mı?",
      aciklama: `Ada ${a.ada || "?"} / Parsel ${a.parsel || "?"} için alanın (${a.alan.toLocaleString("tr-TR")} m²), niteliğin ve konumun TKGM kaydıyla eşleştiğini kontrol edin.`,
      kaynak: { ad: "TKGM Parsel Sorgu", url: "https://parselsorgu.tkgm.gov.tr/" },
    },
    {
      id: "tapu",
      baslik: "Tapu kaydı temiz mi?",
      aciklama: "Satıcıdan güncel tapu kaydı (TAKBİS çıktısı) isteyin: ipotek, haciz, şerh, beyan, hisse durumu ve malikin satıcıyla aynı kişi olduğu.",
      kaynak: { ad: "Tapu müdürlüğü" },
    },
    {
      id: "imar",
      baslik: "Resmi imar durum belgesi alındı mı?",
      aciklama: `Belediyeden imar durum belgesi alın: fonksiyon (girilen: ${a.imar}), emsal/KAKS (girilen: ${a.emsal.toLocaleString("tr-TR")}), TAKS, yükseklik, çekme mesafeleri, yol ve park için ayrılan kısımlar.`,
      kaynak: { ad: "İlgili belediye (e-İmar) ve e-Plan" },
    },
    {
      id: "uygulama",
      baslik: "İmar uygulaması ve kamulaştırma riski",
      aciklama: "Parselde imar uygulaması (parselasyon) yapılmış mı? Yapılmadıysa düzenleme ortaklık payı (%45'e kadar) alanınızı azaltabilir. Yol, park veya okul alanına denk gelen kısım var mı?",
      kaynak: { ad: "Belediye imar müdürlüğü" },
    },
    {
      id: "aplikasyon",
      baslik: "Sınırlar ve yol yerinde doğrulandı mı?",
      aciklama: "Lisanslı harita mühendisine (LİHKAB) aplikasyon yaptırarak sınırları yerinde işaretletin; parselin kadastral yoldan cephesi olup olmadığını teyit edin.",
      kaynak: { ad: "LİHKAB / lisanslı harita bürosu" },
    },
    {
      id: "afet",
      baslik: "Zemin ve afet riski",
      aciklama: "Deprem tehlikesi (AFAD), diri fay yakınlığı (MTA), dere yatağı, taşkın ve heyelan riskini kontrol edin; yapı yapılacaksa zemin etüdü yaptırın.",
      kaynak: { ad: "AFAD Deprem Tehlike Haritası (e-Devlet)", url: "https://www.turkiye.gov.tr/afad-deprem-tehlike-haritasi" },
    },
    {
      id: "ekspertiz",
      baslik: "Lisanslı ekspertiz raporu alındı mı?",
      aciklama: "SPK lisanslı bir değerleme uzmanından rapor alın ve rapordaki değeri aşağıdaki \"Ekspertiz değeri\" alanına girin; fiyat kararı bu değere göre yeniden hesaplanır.",
      kaynak: { ad: "SPK lisanslı değerleme kuruluşları" },
    },
  ];
  if (a.tapu && kamuMu(a.tapu))
    k.push({
      id: "kamu",
      baslik: "Kamu taşınmazı: ihale şartnamesi incelendi mi?",
      aciklama: "Kamuya ait taşınmazlar yalnızca ihaleyle satılır. İhale ilanını, şartnameyi, muhammen bedeli ve teminat koşullarını resmi kaynaktan doğrulayın.",
      kaynak: { ad: "Milli Emlak satış ilanları", url: "https://www.milliemlak.gov.tr/#/satis" },
    });
  if (a.imar === "Tarla (imarsız)")
    k.push({
      id: "tarim",
      baslik: "Tarım arazisi kısıtları",
      aciklama: "Tarım arazileri 5403 sayılı Kanun gereği asgari büyüklüğün altına bölünemez, hisseli satışı ve tarım dışı kullanımı izne bağlıdır. İl Tarım ve Orman Müdürlüğü'nden teyit edin.",
      kaynak: { ad: "İl Tarım ve Orman Müdürlüğü" },
    });
  if (a.hisseli)
    k.push({
      id: "hisse",
      baslik: "Hisseli tapu: önalım hakkı",
      aciklama: "Diğer paydaşların önalım (şufa) hakkı vardır. Paydaşlardan noter onaylı feragat alın veya müstakil parsel çıkıp çıkmayacağını öğrenin.",
      kaynak: { ad: "Noter / avukat" },
    });
  return k;
}
