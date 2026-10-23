"use client";

import { useMemo } from "react";
import { evDegerle, type EvBilgisi } from "../lib/ev";

const TL = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
const M2 = 100;

// Ortalama bir daire; satırlar ve sütunlar yalnızca kat/asansör/site/yaş özelliklerini değiştirir.
const TEMEL: Omit<EvBilgisi, "il" | "ilce" | "mahalle"> = {
  netM2: M2, odaSayisi: "3+1", binaYasi: 10, kat: "Ara kat", toplamKat: 6, durum: "Bakımlı",
  isinma: "Doğalgaz kombi", asansor: true, otopark: false, site: false, manzara: false,
  ulasimKm: 2, tapu: "Kat mülkiyeti", krediyeUygun: true, istenenFiyat: 1,
};

const SATIRLAR: { ad: string; d: Partial<EvBilgisi> }[] = [
  { ad: "Bodrum kat", d: { kat: "Bodrum", asansor: false } },
  { ad: "Zemin / bahçe katı", d: { kat: "Zemin/bahçe" } },
  { ad: "Ara kat, asansörlü", d: { kat: "Ara kat", asansor: true } },
  { ad: "Ara kat, asansörsüz", d: { kat: "Ara kat", asansor: false } },
  { ad: "En üst kat", d: { kat: "En üst kat" } },
  { ad: "Yeni bina (0–2 yaş)", d: { binaYasi: 1, durum: "Sıfır/yeni" } },
  { ad: "Eski bina (25+ yaş)", d: { binaYasi: 28, durum: "Orta" } },
];

export default function MahalleEvFiyatlari({ ilKod, ilce, mahalle, yer }: { ilKod: string; ilce: string; mahalle: string; yer: string }) {
  const tablo = useMemo(
    () =>
      SATIRLAR.map((s) => {
        const hucre = (site: boolean) => {
          const r = evDegerle({ ...TEMEL, ...s.d, site, otopark: site, il: ilKod, ilce, mahalle: mahalle || undefined });
          return { fiyat: r.tahmini, kira: r.kiraTahmini, getiri: Math.round(((r.kiraTahmini * 12) / r.tahmini) * 1000) / 10 };
        };
        return { ad: s.ad, disi: hucre(false), ici: hucre(true) };
      }),
    [ilKod, ilce, mahalle],
  );

  const hepsi = tablo.flatMap((t) => [{ ad: `${t.ad}, site dışı`, ...t.disi }, { ad: `${t.ad}, site içi`, ...t.ici }]);
  const enUcuz = hepsi.reduce((a, b) => (b.fiyat < a.fiyat ? b : a));
  const enIyiGetiri = hepsi.reduce((a, b) => (b.getiri > a.getiri ? b : a));
  const ara = tablo.find((t) => t.ad === "Ara kat, asansörlü")!;
  const bodrum = tablo.find((t) => t.ad === "Bodrum kat")!;
  const asansorsuz = tablo.find((t) => t.ad === "Ara kat, asansörsüz")!;
  const siteFarki = Math.round((ara.ici.fiyat / ara.disi.fiyat - 1) * 100);
  const bodrumIndirim = Math.round((1 - bodrum.disi.fiyat / ara.disi.fiyat) * 100);
  const asansorFarki = Math.round((1 - asansorsuz.disi.fiyat / ara.disi.fiyat) * 100);

  return (
    <section className="kart">
      <h2>🏢 Ev fiyatları — {yer}</h2>
      <p className="soluk" style={{ marginTop: 0 }}>
        {M2} m² net, 3+1, 10 yaşında, bakımlı bir daire için özelliklere göre tahmini satış fiyatı ve kira. Site içi sütununa otopark dahildir.
      </p>
      <div className="tablo-kap" style={{ maxHeight: "none" }}>
        <table>
          <thead>
            <tr><th>Özellik</th><th>Site dışı</th><th>Site içi</th><th>Kira (site dışı / içi)</th></tr>
          </thead>
          <tbody>
            {tablo.map((t) => (
              <tr key={t.ad} style={{ cursor: "default" }}>
                <td>{t.ad}</td>
                <td><b>{TL(t.disi.fiyat)}</b></td>
                <td><b>{TL(t.ici.fiyat)}</b></td>
                <td className="soluk">{TL(t.disi.kira)} / {TL(t.ici.kira)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 style={{ fontSize: 14, marginBottom: 6 }}>💡 Öneriler</h3>
      <ol className="tavsiye">
        <li>Site içi bir daire, site dışındaki aynı daireden yaklaşık <b>%{siteFarki}</b> daha pahalı. Güvenlik ve otopark sizin için önemli değilse site dışı daha ekonomik.</li>
        <li>Bodrum katlar ara katlara göre yaklaşık <b>%{bodrumIndirim}</b> ucuz, ama yeniden satması zor ve nem riski var. Yatırım için önerilmez.</li>
        <li>4 ve üzeri katlı binada asansör olmaması değeri yaklaşık <b>%{asansorFarki}</b> düşürüyor. Pazarlıkta bunu kullanın.</li>
        <li>En uygun fiyatlı seçenek: <b>{enUcuz.ad}</b> ({TL(enUcuz.fiyat)}).</li>
        <li>Kira getirisi en yüksek seçenek: <b>{enIyiGetiri.ad}</b> (yıllık %{enIyiGetiri.getiri.toLocaleString("tr-TR")}). Yatırım amaçlı alım için bu seçeneğe bakın.</li>
        <li>Belirli bir evi değerlendirmek için <b>“Bu ev alınır mı?”</b> menüsünü kullanın.</li>
      </ol>
    </section>
  );
}
