import { ilMeta } from "./iller-meta";
import { veri, type IlProfili, type TurkiyeProfili } from "./veri";

export interface IlceProfili {
  ad: string;
  nufus: number;
  pay: number; // il nüfusu içindeki %
  sira: number; // il içinde nüfusa göre sıra
  ilceSayisi: number;
  erkek100Kadina: number; // 100 kadına düşen erkek
}

export interface BolgeProfili {
  il: IlProfili;
  tr: TurkiyeProfili | undefined;
  ilce?: IlceProfili;
  yorumlar: string[]; // gayrimenkul açısından çıkarımlar
}

export function bolgeProfili(ilKod: string, ilce?: string): BolgeProfili | null {
  const m = ilMeta(ilKod);
  const p = m.profil;
  if (!p) return null;
  const tr = veri().turkiyeProfil;

  let ilceP: IlceProfili | undefined;
  if (ilce && p.ilceNufus[ilce]) {
    const s = p.ilceNufus[ilce];
    const sirali = Object.entries(p.ilceNufus).sort((a, b) => b[1].nufus - a[1].nufus);
    ilceP = {
      ad: ilce,
      nufus: s.nufus,
      pay: s.pay,
      sira: sirali.findIndex(([ad]) => ad === ilce) + 1,
      ilceSayisi: sirali.length,
      erkek100Kadina: Math.round((s.erkek / s.kadin) * 100),
    };
  }

  // Profilden konut talebine dair kural tabanlı çıkarımlar. Sayılar Türkçe biçimlenir; ek gerektirmeyen cümle yapısı kullanılır.
  const y: string[] = [];
  const s = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  const trOrtanca = tr?.ortancaYas ?? 34.9;
  const trHane = tr?.haneBuyuklugu ?? 3.08;
  if (p.ortancaYas < trOrtanca - 5 && p.haneBuyuklugu > trHane + 0.5)
    y.push(`Genç ve kalabalık hanelerden oluşan bir nüfus (ortanca yaş ${s(p.ortancaYas)}, hane ${s(p.haneBuyuklugu)} kişi): 3+1 ve 4+1 dairelere talep güçlüdür.`);
  if (p.tekKisilik >= 20)
    y.push(`Tek kişilik hanelerin oranı %${s(p.tekKisilik)}: 1+0 ve 1+1 dairelere kira talebi yüksektir.`);
  if (p.yas65 > (tr?.yas65 ?? 11.1) + 3)
    y.push(`65 yaş üstü nüfusun oranı %${s(p.yas65)}: asansörlü, giriş katı erişilebilir ve sağlık kuruluşlarına yakın konutlar öne çıkar.`);
  if (p.yerliOrani < 40)
    y.push(`Bu ile kayıtlı olanların oranı yalnızca %${s(p.yerliOrani)}: il dışarıdan göç alıyor, kiralık konut talebi süreklidir.`);
  else if (p.yerliOrani > 80)
    y.push(`Bu ile kayıtlı olanların oranı %${s(p.yerliOrani)}: göç az, talep ağırlıkla yerel; kiralık talebi sınırlı olabilir.`);
  if (p.yabanci > 50_000)
    y.push(`${p.yabanci.toLocaleString("tr-TR")} yabancı nüfus yaşıyor: yabancılara kiralama ve satış potansiyeli var (yabancıya satışta bölgesel kısıtları kontrol edin).`);
  if (p.dogurganlik < 1.3 && p.ortancaYas > trOrtanca + 1.5)
    y.push(`Doğurganlık düşük (${s(p.dogurganlik)}) ve nüfus yaşlanıyor: uzun vadede büyük daire talebi zayıflayabilir, küçük ve orta daireler daha likittir.`);
  if (p.bosanmis >= 7)
    y.push(`Boşanmış nüfus oranı %${s(p.bosanmis)}: tek ebeveynli ve tek kişilik hanelerden 1+1/2+1 talebi gelir.`);
  if (p.egitimYili != null && tr && p.egitimYili >= tr.ortalamaEgitimYili + 0.4)
    y.push(`Eğitim seviyesi Türkiye ortalamasının üstünde (${s(p.egitimYili)} yıl): beyaz yaka talebi; site, otopark ve ulaşım olanakları değer katar.`);
  if (ilceP && ilceP.pay >= 15)
    y.push(`${ilceP.ad}, il nüfusunda %${s(ilceP.pay)} paya sahip: ilin ana konut piyasalarından biri, likidite yüksek.`);
  if (!y.length) y.push("Profil Türkiye ortalamasına yakın; belirgin bir talep eğilimi yok.");

  return { il: p, tr, ilce: ilceP, yorumlar: y };
}
