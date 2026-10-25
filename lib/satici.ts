import { evDegerle, type EvBilgisi, type EvSonuc } from "./ev";

// Satıcı için fiyatlandırma: adil değerden ilan, hedef ve hızlı satış fiyatı; satıcının beklentisinin piyasaya göre
// konumu; değeri artırabilecek iyileştirmeler. İyileştirme etkileri aynı değerleme modeli, ilgili özellik
// değiştirilerek yeniden çalıştırılıp hesaplanır (ayrı bir varsayım eklenmez).

export interface Iyilestirme {
  baslik: string;
  aciklama: string;
  artis: number; // adil değerdeki tahmini artış (₺)
}

export interface SaticiTavsiyesi {
  tur: "olumlu" | "uyari" | "bilgi";
  metin: string;
}

export interface SaticiRaporu {
  ilanFiyati: number; // pazarlık payı eklenmiş ilan fiyatı
  hedefFiyat: number; // beklenen kapanış
  hizliSatis: number; // kısa sürede satış için
  altSinir: number; // bunun altına inmeyin
  beklenti: number; // satıcının beklediği fiyat
  beklentiFarki: number; // beklenti / adil değer − 1
  konum: "Piyasanın altında" | "Piyasa ile uyumlu" | "Piyasanın biraz üstünde" | "Piyasanın belirgin üstünde";
  arttiranlar: { metin: string; oran: number }[];
  dusurenler: { metin: string; oran: number }[];
  iyilestirmeler: Iyilestirme[];
  hedefKitle: string[];
  tavsiyeler: SaticiTavsiyesi[];
}

const yuvarla = (n: number, b = 10_000) => Math.round(n / b) * b;
const TL = (n: number) => n.toLocaleString("tr-TR") + " ₺";
const PAZARLIK_PAYI = 0.05; // ilan fiyatına eklenen pazarlık payı

export function saticiFiyatlandirma(e: EvBilgisi, s: EvSonuc): SaticiRaporu {
  const adil = s.tahmini;
  const ilanFiyati = yuvarla(adil * (1 + PAZARLIK_PAYI));
  const hedefFiyat = yuvarla(adil);
  const hizliSatis = yuvarla(adil * 0.95);
  const altSinir = yuvarla(Math.max(s.alt, adil * 0.92));
  const beklenti = e.istenenFiyat;
  const beklentiFarki = beklenti / adil - 1;
  const konum =
    beklentiFarki < -0.03 ? "Piyasanın altında" : beklentiFarki <= 0.06 ? "Piyasa ile uyumlu" : beklentiFarki <= 0.15 ? "Piyasanın biraz üstünde" : "Piyasanın belirgin üstünde";

  const arttiranlar = s.etkenler.filter((x) => x.oran > 0).sort((a, b) => b.oran - a.oran);
  const dusurenler = s.etkenler.filter((x) => x.oran < 0).sort((a, b) => a.oran - b.oran);

  // İyileştirme senaryoları: yalnızca evde uygulanabilir olanlar; etkisi modelin yeniden çalıştırılmasıyla bulunur.
  const iyilestirmeler: Iyilestirme[] = [];
  const dene = (baslik: string, aciklama: string, degisim: Partial<EvBilgisi>) => {
    const yeni = evDegerle({ ...e, ...degisim }).tahmini;
    const artis = yuvarla(yeni - adil, 1000);
    if (artis > 0) iyilestirmeler.push({ baslik, aciklama, artis });
  };
  if (e.durum === "Tadilat gerekli") dene("Temel tadilat", "Boya, zemin, mutfak/banyo onarımıyla evi \"Orta\" duruma getirmek.", { durum: "Orta" });
  if (e.durum === "Tadilat gerekli") dene("Kapsamlı yenileme", "Tadilatın yanında boya, zemin ve ıslak hacim yenilemesiyle evi \"Bakımlı\" duruma getirmek.", { durum: "Bakımlı" });
  if (e.durum === "Orta") dene("Bakım ve boya", "Boya, küçük onarımlar ve derin temizlikle evi \"Bakımlı\" duruma getirmek.", { durum: "Bakımlı" });
  if (e.kullanim === "Kiracılı") dene("Boş teslim", "Kiracıyla anlaşıp evi boş teslim etmek alıcı kitlesini genişletir.", { kullanim: "Boş" });
  if (e.iskan === false) dene("İskân (yapı kullanma izni) almak", "Mümkünse iskân almak evi krediye uygun hale getirir ve alıcı kitlesini büyütür.", { iskan: true, krediyeUygun: true });
  else if (!e.krediyeUygun) dene("Krediye uygun hale getirmek", "Tapu ve iskân eksiklerini gidermek, kredili alıcılara da satış imkânı verir.", { krediyeUygun: true });
  if (e.isinma === "Soba/diğer") dene("Doğalgaz kombiye geçiş", "Doğalgaz altyapısı varsa kombi dönüşümü.", { isinma: "Doğalgaz kombi" });
  iyilestirmeler.sort((a, b) => b.artis - a.artis);

  // Hedef alıcı kitlesi: aile uygunluğu, kira getirisi ve oda tipine göre.
  const hedefKitle: string[] = [];
  if (s.aile.puan >= 65) hedefKitle.push(`Çocuklu aileler (aile uygunluğu ${s.aile.puan}/100): okul, park ve güvenlik vurgulanmalı.`);
  if (s.brutGetiri >= 5.5) hedefKitle.push(`Yatırımcılar (brüt kira getirisi %${s.brutGetiri.toLocaleString("tr-TR")}): tahmini kira ${TL(s.kiraTahmini)}/ay ilanda belirtilmeli.`);
  if (["1+0", "1+1", "2+1"].includes(e.odaSayisi)) hedefKitle.push("Öğrenciler, genç çalışanlar ve tek yaşayanlar: ulaşım ve sosyal hayata yakınlık öne çıkarılmalı.");
  if (e.metro === "Yürüme mesafesinde") hedefKitle.push("Toplu taşımayla işe gidenler: raylı sisteme yürüme mesafesi ilanın ilk satırında olmalı.");
  if (!hedefKitle.length) hedefKitle.push("Bölgede oturmak isteyen genel alıcı kitlesi: fiyatı piyasa ile uyumlu tutmak satış süresini kısaltır.");

  const t: SaticiTavsiyesi[] = [];
  if (konum === "Piyasanın belirgin üstünde")
    t.push({ tur: "uyari", metin: `Beklenen fiyat (${TL(beklenti)}) adil değerin %${Math.round(beklentiFarki * 100)} üstünde. Bu fiyatla ilan uzun süre beklenebilir; ilan fiyatını ${TL(ilanFiyati)} civarında tutmak önerilir.` });
  else if (konum === "Piyasanın biraz üstünde")
    t.push({ tur: "bilgi", metin: `Beklenen fiyat adil değerin %${Math.round(beklentiFarki * 100)} üstünde; pazarlık payı olarak kabul edilebilir, ancak alıcılar emsallerle karşılaştıracaktır.` });
  else if (konum === "Piyasanın altında")
    t.push({ tur: "uyari", metin: `Beklenen fiyat adil değerin %${Math.round(-beklentiFarki * 100)} altında. Acil satış yoksa ilan fiyatı ${TL(ilanFiyati)} seviyesine çıkarılabilir.` });
  else t.push({ tur: "olumlu", metin: "Beklenen fiyat piyasa ile uyumlu; makul bir pazarlık payıyla hızlı sonuç alınabilir." });
  t.push({ tur: "bilgi", metin: `Pazarlıkta ${TL(altSinir)} altına inmemeniz önerilir; bu, tahmini aralığın alt bandıdır.` });
  if (dusurenler.length) t.push({ tur: "bilgi", metin: `Alıcıların itiraz edebileceği noktalar: ${dusurenler.slice(0, 3).map((x) => x.metin).join("; ")}. Bunlara hazırlıklı olun ve fiyatlamada hesaba katın.` });
  t.push({ tur: "bilgi", metin: "İlan için gün ışığında, toplanmış odalarla geniş açılı fotoğraflar çekin; tapu, iskân ve aidat bilgisini ilanda açıkça belirtin." });
  t.push({ tur: "bilgi", metin: "Satıştan önce tapu kaydını (ipotek, haciz, şerh) ve aidat/emlak vergisi borcunu kontrol edin; eksiksiz evrak, kapanışı hızlandırır." });

  return { ilanFiyati, hedefFiyat, hizliSatis, altSinir, beklenti, beklentiFarki, konum, arttiranlar, dusurenler, iyilestirmeler, hedefKitle, tavsiyeler: t };
}
