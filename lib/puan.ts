import type { Arsa } from "./arsa";
import { ilMeta, ortalamaArsaM2, turkiyeOrtalamaM2 } from "./iller-meta";

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

  // Bölge ortalamasına göre fiyat (imarsız arsalar daha düşük beklenir)
  const beklenen = ortalamaArsaM2(a.il) * (["Tarla (imarsız)", "Koruma alanı"].includes(a.imar) ? 0.35 : 1);
  const oran = a.fiyatM2 / beklenen;
  if (oran < 0.85) n.push({ metin: `m² fiyatı bölge ortalamasının %${Math.round((1 - oran) * 100)} altında`, etki: Math.min(15, Math.round((1 - oran) * 30)) });
  else if (oran > 1.2) n.push({ metin: `m² fiyatı bölge ortalamasının %${Math.round((oran - 1) * 100)} üstünde`, etki: -Math.min(10, Math.round((oran - 1) * 15)) });

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

  return { puan, etiket, nedenler: n, oneri };
}

export type FiyatBandi = "Düşük" | "Orta" | "Yüksek";

// Toplam bedeli o ilçedeki arsaların toplam bedeline göre üçe böler.
export function fiyatBandi(a: Arsa, tumu: Arsa[]): FiyatBandi {
  const bedeller = tumu.map((x) => x.alan * x.fiyatM2).sort((p, q) => p - q);
  const b = a.alan * a.fiyatM2;
  const alt = bedeller[Math.floor(bedeller.length / 3)];
  const ust = bedeller[Math.floor((bedeller.length * 2) / 3)];
  return b < alt ? "Düşük" : b < ust ? "Orta" : "Yüksek";
}

// Her fiyat bandından en yüksek puanlı arsa: bütçeye göre öneri.
export function enIyiOneriler(tumu: Arsa[]) {
  const bantlar: FiyatBandi[] = ["Düşük", "Orta", "Yüksek"];
  return bantlar
    .map((bant) => {
      const aday = tumu
        .filter((a) => fiyatBandi(a, tumu) === bant)
        .map((a) => ({ arsa: a, d: degerlendir(a) }))
        .sort((p, q) => q.d.puan - p.d.puan)[0];
      return aday ? { bant, ...aday } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// İl/ilçe düzeyinde ileriye dönük genel tavsiyeler.
export function bolgeTavsiyeleri(ilKod: string, tumu: Arsa[]): string[] {
  const m = ilMeta(ilKod);
  const t: string[] = [];
  if (m.buyume >= 10) t.push("Nüfusu hızlı artan bir il: konut ve konut+ticaret arsalarında talep artışı sürebilir; 3–5 yıllık vade mantıklı.");
  else if (m.buyume >= 5) t.push("Orta hızda büyüyen bir il: merkeze yakın, imarlı arsalar daha güvenli seçenektir.");
  else t.push("Nüfus artışı düşük: değer artışı yavaş olabilir; spekülatif tarla alımlarında dikkatli olun, kira/kullanım geliri düşünün.");

  const projeli = tumu.filter((a) => a.projeler.length).length;
  if (projeli) t.push(`${projeli} arsanın yakınında planlanan altyapı projesi var: projelerin ihale ve yapım durumunu takip edin, değer artışı genellikle proje başladığında hızlanır.`);
  const imarsiz = tumu.filter((a) => a.imar === "Tarla (imarsız)").length;
  if (imarsiz) t.push("İmarsız arsalar için belediyenin askıya çıkan imar planı değişikliklerini düzenli kontrol edin; plan değişikliği en büyük değer sıçramasını yaratır.");
  if (tumu.some((a) => a.hisseli)) t.push("Hisseli tapulardan mümkünse kaçının ya da müstakil parselasyon imkânını araştırın.");
  if (m.satisM2 > turkiyeOrtalamaM2() * 1.1) t.push("Fiyat seviyesi yüksek bir bölge: düşük fiyat bandındaki arsalar çevre ilçelerde daha fazla getiri potansiyeli taşıyabilir.");
  t.push("Her alımdan önce resmi imar durum belgesi, güncel tapu kaydı (ipotek/haciz/şerh) ve yerinde inceleme şarttır.");
  return t;
}
