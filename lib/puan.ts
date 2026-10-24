import { buyumeAnalizi, buyumeTavsiyeleri, type BolgeTavsiyesi, type TavsiyeGrubu } from "./buyume";
import { konutPiyasasi } from "./konut";
import { kamuMu, tahminiArsaM2, KAMU_EDINIM, type Arsa } from "./arsa";
import { ilMeta, turkiyeOrtalamaM2 } from "./iller-meta";

export interface Neden {
  metin: string;
  etki: number; // + / - puan
}

export interface Degerlendirme {
  puan: number; // 0-100
  etiket: "Yüksek potansiyel" | "Orta potansiyel" | "Düşük potansiyel";
  nedenler: Neden[];
  oneri: string;
}

const IMAR_PUANI: Record<Arsa["imar"], number> = {
  "Konut+Ticaret": 25,
  Ticaret: 23,
  Konut: 20,
  Turizm: 18,
  Sanayi: 15,
  "Tarla (imarsız)": 6,
  "Koruma alanı": 0,
};

// Şeffaf, kural tabanlı skor. Her kalem ayrı gerekçe olarak döner.
export function degerlendir(a: Arsa): Degerlendirme {
  const m = ilMeta(a.il);
  const n: Neden[] = [];

  n.push({ metin: `İmar: ${a.imar}`, etki: IMAR_PUANI[a.imar] });

  if (a.emsal > 0.05) {
    const e = Math.min(15, Math.round(a.emsal * 7));
    n.push({ metin: `Emsal ${a.emsal} — yapılaşma hakkı`, etki: e });
  }

  const b = Math.max(-10, Math.min(20, Math.round(m.buyume)));
  n.push({ metin: `Nüfus artışı (TÜİK, yıllık ort.) ‰${m.buyume}`, etki: b });

  const u = Math.max(0, Math.round(15 - a.merkezKm));
  if (u > 0) n.push({ metin: `İlçe merkezine ${a.merkezKm} km`, etki: u });

  if (a.projeler.length) {
    n.push({ metin: `Yakın projeler: ${a.projeler.join(", ")}`, etki: Math.min(15, a.projeler.length * 6) });
  }

  // Fiyat kıyası: ekspertiz değeri varsa ona, yoksa konum ve imara göre bölge tahminine göre.
  const beklenen = a.ekspertiz ? a.ekspertiz / a.alan : (a.tahminiM2 ?? tahminiArsaM2(a.il, a.imar, a.merkezKm, a.ilce, a.mahalle));
  const neye = a.ekspertiz ? "ekspertiz değerinin" : "bölge tahmininin";
  const oran = a.fiyatM2 / beklenen;
  if (oran < 0.85) n.push({ metin: `m² fiyatı ${neye} %${Math.round((1 - oran) * 100)} altında`, etki: Math.min(15, Math.round((1 - oran) * 30)) });
  else if (oran > 1.2) n.push({ metin: `m² fiyatı ${neye} %${Math.round((oran - 1) * 100)} üstünde`, etki: -Math.min(10, Math.round((oran - 1) * 15)) });

  if (a.tapu && kamuMu(a.tapu)) n.push({ metin: `${a.tapu} — doğrudan satın alınamaz, ihale gerekir`, etki: -5 });

  if (a.hisseli) n.push({ metin: "Hisseli tapu — satış/yapılaşma zorlaşabilir", etki: -10 });
  if (!a.yolCephesi) n.push({ metin: "Yola cephesi yok", etki: -6 });
  if (a.imar === "Koruma alanı") n.push({ metin: "Koruma alanı — yapılaşma kısıtlı", etki: -15 });

  const puan = Math.max(0, Math.min(100, n.reduce((t, x) => t + x.etki, 0)));
  const etiket = puan >= 65 ? "Yüksek potansiyel" : puan >= 40 ? "Orta potansiyel" : "Düşük potansiyel";

  let oneri: string;
  if (a.imar === "Koruma alanı") oneri = "Yapılaşma kısıtlı; yatırım amacıyla dikkatli olun, ilgili kurumdan kısıtları teyit edin.";
  else if (a.imar === "Tarla (imarsız)") oneri = a.projeler.length || m.buyume > 10
    ? "Uzun vadeli bekleme adayı: imar planı değişikliği beklentisi var ama kesin değil; belediyenin plan çalışmalarını takip edin."
    : "İmar beklentisi zayıf; tarımsal kullanım dışında kısa vadede değer artışı sınırlı olabilir.";
  else if (puan >= 65) oneri = "Göstergeler güçlü: resmi imar durum belgesi ve tapu kaydı (takyidat) kontrolünden sonra değerlendirilebilir.";
  else if (puan >= 40) oneri = "Orta: fiyat pazarlığı ve bölgedeki proje gelişmeleri belirleyici olur.";
  else oneri = "Zayıf göstergeler: benzer bütçeyle bölgedeki daha yüksek puanlı arsalara bakın.";
  if (a.tapu && kamuMu(a.tapu)) oneri = `${KAMU_EDINIM[a.tapu]} ${oneri}`;

  return { puan, etiket, nedenler: n, oneri };
}

// İl/ilçe düzeyinde ileriye dönük tavsiyeler, gruplara ayrılmış olarak.
export const TAVSIYE_GRUPLARI: TavsiyeGrubu[] = ["Bölge ve büyüme", "Ne tür arsa, nereden?", "İmar ve hukuki durum", "Alım maliyeti ve vergiler", "Vade ve risk"];

export function bolgeTavsiyeleri(ilKod: string, tumu: Arsa[], ilce?: string): BolgeTavsiyesi[] {
  const m = ilMeta(ilKod);
  const t: BolgeTavsiyesi[] = [];
  const ekle = (grup: TavsiyeGrubu, metin: string) => t.push({ grup, metin });
  const b = buyumeAnalizi(ilKod);
  const buyume = buyumeTavsiyeleri(ilKod, ilce);
  const grubu = (g: TavsiyeGrubu) => t.push(...buyume.filter((x) => x.grup === g));
  const yuzde = (n: number) => "%" + n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

  // Bölge ve büyüme
  if (m.buyume >= 10) ekle("Bölge ve büyüme", "Nüfusu hızlı artan bir il: konut ve konut+ticaret arsalarında talep artışı sürebilir.");
  else if (m.buyume >= 5) ekle("Bölge ve büyüme", "Orta hızda büyüyen bir il: merkeze yakın, imarlı arsalar daha güvenli seçenektir.");
  else ekle("Bölge ve büyüme", "Nüfus artışı düşük: değer artışı yavaş olabilir; spekülatif tarla alımlarında dikkatli olun, kira/kullanım geliri düşünün.");
  grubu("Bölge ve büyüme");
  const projeli = tumu.filter((a) => a.projeler.length).length;
  if (projeli) ekle("Bölge ve büyüme", `${projeli} kayıtlı arsanızın yakınında planlanan altyapı projesi var: projelerin ihale ve yapım durumunu takip edin; değer artışı genellikle proje başladığında hızlanır, bitince yavaşlar.`);

  // Ne tür arsa, nereden?
  grubu("Ne tür arsa, nereden?");
  const k = konutPiyasasi(ilKod, ilce);
  if (k.brutGetiri >= 6) ekle("Ne tür arsa, nereden?", `Konut kira getirisi yüksek (${yuzde(k.brutGetiri)}): konut imarlı arsa alıp kiralık daire yapmak veya kat karşılığı vermek, arsayı boş bekletmekten daha çok gelir sağlayabilir.`);
  else if (k.brutGetiri < 4.5) ekle("Ne tür arsa, nereden?", `Konut kira getirisi düşük (${yuzde(k.brutGetiri)}): getiri çoğunlukla değer artışından gelir; büyüme aksındaki imarlı arsalar ve imar beklentisi gerçekçi çeper araziler öne çıkar.`);
  const p = m.profil;
  if (p && p.tekKisilik >= 20) ekle("Ne tür arsa, nereden?", `Tek kişilik hane oranı ${yuzde(p.tekKisilik)}: küçük daireli (1+1, 2+1) projelere uygun, merkeze ve üniversite/sanayi bölgelerine yakın konut arsaları daha kolay değerlenir.`);
  else if (p && p.haneBuyuklugu >= 3.5) ekle("Ne tür arsa, nereden?", `Ortalama hane ${p.haneBuyuklugu.toLocaleString("tr-TR")} kişi: 3+1 ve üzeri daire talebi güçlü; okul ve park yakınındaki düşük yoğunluklu konut arsaları aranır.`);
  ekle("Ne tür arsa, nereden?", "Arsanın değeri en çok imar hakkına bağlıdır: emsali (KAKS) 2 olan bir parsel, aynı büyüklükte emsali 1 olan parselin iki katı inşaat alanı demektir. Fiyatları m² yanında inşaat alanı başına da karşılaştırın.");
  if (m.satisM2 > turkiyeOrtalamaM2() * 1.1) ekle("Ne tür arsa, nereden?", "Fiyat seviyesi yüksek bir il: aynı bütçeyle büyüyen çevre ilçelerde daha büyük ve getiri potansiyeli daha yüksek arsa bulunabilir.");
  const kamu = tumu.filter((a) => a.tapu && kamuMu(a.tapu)).length;
  if (kamu) ekle("Ne tür arsa, nereden?", `${kamu} kayıtlı arsanız kamuya ait (Hazine/belediye/vakıf): bunlar ihaleyle satılır. Milli Emlak ihalelerini milliemlak.gov.tr, belediye ve diğer kamu ihale ilanlarını ilan.gov.tr üzerinden takip edin.`);

  // İmar ve hukuki durum
  grubu("İmar ve hukuki durum");
  if (tumu.some((a) => a.imar === "Tarla (imarsız)")) {
    ekle("İmar ve hukuki durum", "İmarsız tarla: değer artışı imar planına girmesine bağlıdır; bu yıllar sürebilir ya da hiç olmayabilir. Çevre düzeni planındaki kullanım kararını (kentsel gelişme, tarım, orman) ve belediyenin plan çalışmalarını öğrenin.");
    ekle("İmar ve hukuki durum", "Tarım arazileri 5403 sayılı Toprak Koruma ve Arazi Kullanımı Kanunu gereği asgari büyüklüğün altına bölünemez ve hisseli satışları sınırlıdır; hisseli tarla alırken müstakil tapu çıkmayabileceğini bilin.");
  }
  if (tumu.some((a) => a.hisseli)) ekle("İmar ve hukuki durum", "Hisseli tapuda diğer paydaşların önalım (şufa) hakkı vardır: satışı öğrendikten sonra 3 ay içinde, satıştan itibaren en geç 2 yıl içinde aynı bedelle hisseyi alabilirler. Mümkünse müstakil parseli tercih edin veya paydaşlardan feragat alın.");
  if (tumu.some((a) => a.imar === "Koruma alanı")) ekle("İmar ve hukuki durum", "Koruma alanındaki (sit, orman, kıyı) parsellerde yapılaşma yasak veya çok kısıtlıdır; düşük fiyat çoğunlukla bu yüzdendir.");
  ekle("İmar ve hukuki durum", "Kat karşılığı inşaat düşünüyorsanız sözleşmeyi noterde düzenleyin; paylaşım oranını, teslim süresini ve gecikme cezasını açıkça yazın, müteahhidin bitmiş projelerini yerinde görün.");

  // Alım maliyeti ve vergiler
  ekle("Alım maliyeti ve vergiler", "Tapu harcı alıcı ve satıcı için ayrı ayrı %2'dir (gerçek satış bedeli üzerinden); döner sermaye ücretini ve varsa emlakçı komisyonunu da bütçeye ekleyin.");
  ekle("Alım maliyeti ve vergiler", "Arsa için her yıl emlak vergisi ödenir: arsalarda binde 3, büyükşehir belediyesi sınırlarında binde 6. Arsayı boş beklettiğiniz her yıl bu gideri hesaba katın.");
  ekle("Alım maliyeti ve vergiler", "Satın aldıktan sonra 5 yıl dolmadan satarsanız değer artışı kazancı gelir vergisine tabidir; kısa vadeli al-sat planlıyorsanız vergiyi kâr hesabına katın.");

  // Vade ve risk
  const artis = b?.ilArtis5 ?? 0;
  ekle(
    "Vade ve risk",
    artis >= 8
      ? "Hızlı büyüyen il: 3–5 yıllık vade makul; büyüme aksındaki arsalarda değer artışı daha erken başlar."
      : artis >= 2
        ? "Orta hızda büyüme: 5–7 yıllık vade düşünün; imarlı ve altyapısı hazır arsalar beklerken daha az risk taşır."
        : "Nüfus artışı zayıf: 7 yıl ve üzeri vade gerekebilir; kullanmayacağınız arsaya bağlanacak parayı başka yatırım getirileriyle karşılaştırın.",
  );
  ekle("Vade ve risk", "Deprem tehlikesini AFAD Türkiye Deprem Tehlike Haritası'ndan (tdth.afad.gov.tr) kontrol edin; yapı yapılacak arsada zemin etüdü yaptırın, dere yatağı, taşkın ve heyelan riskini belediyeye sorun.");
  ekle("Vade ve risk", "Her alımdan önce resmi imar durum belgesi, güncel tapu kaydı (ipotek/haciz/şerh) ve yerinde inceleme şarttır; parsel sınırlarını ve yolu aplikasyonla yerinde doğrulayın.");
  return t;
}

export interface ArsaKarari {
  kaynak: "ekspertiz" | "bolge"; // değer neye dayanıyor
  tahmini: number; // toplam değer (ekspertiz veya bölge tahmini)
  bolgeTahmini: number; // her durumda bölge tahmini (karşılaştırma için)
  alt: number;
  ust: number;
  fark: number; // fiyat / tahmini - 1
  fiyatKarari: "Fiyatı uygun" | "Pazarlıkla alınır" | "Pahalı";
  hedefFiyat: number;
  gelecek: "Gelecek için alınır" | "Orta vadede makul" | "Gelecek için zayıf";
  ozet: string;
}

// "Bu arsa ne kadar eder, bu fiyata ve gelecek için alınır mı?" sorusunun cevabı.
export function arsaKarari(a: Arsa): ArsaKarari {
  const d = degerlendir(a);
  const m2 = a.tahminiM2 ?? tahminiArsaM2(a.il, a.imar, a.merkezKm, a.ilce, a.mahalle);
  const bolgeTahmini = Math.round((m2 * a.alan) / 1000) * 1000;
  // Ekspertiz raporu varsa kesin değer odur; yoksa bölge tahmini kullanılır ve aralık geniş tutulur (±%25).
  const kaynak = a.ekspertiz ? "ekspertiz" : "bolge";
  const tahmini = a.ekspertiz ? Math.round(a.ekspertiz) : bolgeTahmini;
  const pay = a.ekspertiz ? 0.05 : 0.25;
  const fiyat = a.fiyatM2 * a.alan;
  const fark = fiyat / tahmini - 1;
  const fiyatKarari = fark <= 0.03 ? "Fiyatı uygun" : fark <= 0.15 ? "Pazarlıkla alınır" : "Pahalı";
  const gelecek = d.puan >= 60 ? "Gelecek için alınır" : d.puan >= 40 ? "Orta vadede makul" : "Gelecek için zayıf";

  let ozet: string;
  if (fiyatKarari === "Pahalı" && gelecek !== "Gelecek için alınır") ozet = "Önerilmez: hem fiyatı yüksek hem de değer artışı beklentisi sınırlı.";
  else if (fiyatKarari === "Pahalı") ozet = "Potansiyeli iyi ama fiyatı yüksek: pazarlık hedefine inmezse beklemek daha mantıklı.";
  // "Pazarlıkla alınır" durumunda fiyat uygun denmez; pazarlık payı vurgulanır.
  else if (gelecek === "Gelecek için alınır") ozet = fiyatKarari === "Fiyatı uygun" ? "Alınabilir: fiyatı makul ve değer artışı göstergeleri güçlü." : "Alınabilir, ancak pazarlıkla: değer artışı göstergeleri güçlü, fiyat biraz yüksek.";
  else if (gelecek === "Orta vadede makul") ozet = fiyatKarari === "Fiyatı uygun" ? "Makul: fiyat uygun, ancak değer artışı orta düzeyde; uzun vadeli düşünün." : "Pazarlık şart: fiyat biraz yüksek ve değer artışı orta düzeyde; uzun vadeli düşünün.";
  else ozet = "Ucuz olsa da gelecek beklentisi zayıf; yalnızca kullanım amaçlıysa değerlendirin.";
  if (a.tapu && kamuMu(a.tapu)) ozet = `Kamuya ait: ihaleyle satılır. ${ozet}`;

  if (!a.ekspertiz) ozet += " Değer, bölge ortalamasından türetilmiş bir tahmindir; karar için lisanslı ekspertiz raporu alın.";

  return {
    kaynak,
    tahmini,
    bolgeTahmini,
    alt: Math.round((tahmini * (1 - pay)) / 1000) * 1000,
    ust: Math.round((tahmini * (1 + pay)) / 1000) * 1000,
    fark,
    fiyatKarari,
    hedefFiyat: Math.min(fiyat, Math.round((tahmini * 0.95) / 1000) * 1000),
    gelecek,
    ozet,
  };
}
