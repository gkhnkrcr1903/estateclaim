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

// Oda tipleri ve o tipteki tipik net alan
const TIPLER: { oda: string; m2: number }[] = [
  { oda: "1+0", m2: 35 },
  { oda: "1+1", m2: 55 },
  { oda: "2+1", m2: 85 },
  { oda: "3+1", m2: 110 },
  { oda: "4+1", m2: 150 },
];

// Aynı bölgede bir dairenin alabileceği en düşük ve en yüksek özellik kombinasyonları
const EN_UCUZ: Partial<EvBilgisi> = {
  kat: "Bodrum", asansor: false, binaYasi: 30, durum: "Tadilat gerekli", isinma: "Soba/diğer",
  site: false, otopark: false, manzara: false, ulasimKm: 6,
};
const EN_PAHALI: Partial<EvBilgisi> = {
  kat: "Ara kat", asansor: true, binaYasi: 1, durum: "Sıfır/yeni", isinma: "Yerden ısıtma",
  site: true, otopark: true, manzara: true, ulasimKm: 0.5,
};

function OdaTipleri({ ilKod, ilce, mahalle }: { ilKod: string; ilce: string; mahalle: string }) {
  const satirlar = useMemo(
    () =>
      TIPLER.map((t) => {
        const hesap = (d: Partial<EvBilgisi>) =>
          evDegerle({ ...TEMEL, ...d, odaSayisi: t.oda, netM2: t.m2, il: ilKod, ilce, mahalle: mahalle || undefined });
        const ort = hesap({});
        return {
          ...t,
          ucuz: hesap(EN_UCUZ).tahmini,
          ort: ort.tahmini,
          pahali: hesap(EN_PAHALI).tahmini,
          kira: ort.kiraTahmini,
          getiri: Math.round(((ort.kiraTahmini * 12) / ort.tahmini) * 1000) / 10,
        };
      }),
    [ilKod, ilce, mahalle],
  );

  const enUcuz = satirlar[0];
  const enPahali = satirlar[satirlar.length - 1];
  const enIyiGetiri = satirlar.reduce((a, b) => (b.getiri > a.getiri ? b : a));
  const ikiArti = satirlar.find((s) => s.oda === "2+1")!;

  return (
    <>
      <div className="oneriler" style={{ marginBottom: 12 }}>
        <div className="karar" style={{ marginBottom: 0 }}>
          <div className="soluk">💸 Bölgedeki en ucuz ev</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{TL(enUcuz.ucuz)}</div>
          <div className="soluk" style={{ fontSize: 12 }}>{enUcuz.oda}, {enUcuz.m2} m², bodrum kat, 30 yaşında, tadilat gerekli, sobalı, ulaşıma uzak</div>
        </div>
        <div className="karar" style={{ marginBottom: 0 }}>
          <div className="soluk">💎 Bölgedeki en pahalı ev</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{TL(enPahali.pahali)}</div>
          <div className="soluk" style={{ fontSize: 12 }}>{enPahali.oda}, {enPahali.m2} m², yeni bina, site içi, manzaralı, yerden ısıtma, metroya yakın</div>
        </div>
        <div className="karar" style={{ marginBottom: 0 }}>
          <div className="soluk">🏠 Ortalama bir 2+1</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{TL(ikiArti.ort)}</div>
          <div className="soluk" style={{ fontSize: 12 }}>{ikiArti.m2} m², 10 yaşında, bakımlı, ara kat · kira ≈ {TL(ikiArti.kira)}/ay</div>
        </div>
      </div>
      <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>Oda tipine göre fiyatlar</h3>
      <div className="tablo-kap" style={{ maxHeight: "none" }}>
        <table>
          <thead>
            <tr><th>Tip</th><th>Net m²</th><th>En ucuz</th><th>Ortalama</th><th>En pahalı</th><th>Kira (ort.)</th><th>Getiri</th></tr>
          </thead>
          <tbody>
            {satirlar.map((s) => (
              <tr key={s.oda} style={{ cursor: "default" }}>
                <td><b>{s.oda}</b></td>
                <td>{s.m2}</td>
                <td>{TL(s.ucuz)}</td>
                <td><b>{TL(s.ort)}</b></td>
                <td>{TL(s.pahali)}</td>
                <td>{TL(s.kira)}/ay</td>
                <td>%{s.getiri.toLocaleString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="soluk" style={{ fontSize: 12 }}>
        En ucuz: bodrum, eski, tadilat gerekli, sobalı ve ulaşıma uzak bir ev. Ortalama: 10 yaşında, bakımlı, ara katta bir ev. En pahalı: yeni, site içinde, manzaralı ve metroya yakın bir ev.
        Kira getirisi en yüksek tip: <b>{enIyiGetiri.oda}</b> (yıllık %{enIyiGetiri.getiri.toLocaleString("tr-TR")}). Küçük daireler genelde daha kolay kiraya verilir.
      </p>
      <h3 style={{ fontSize: 14, margin: "12px 0 6px" }}>3+1 dairede kat, asansör ve site etkisi</h3>
    </>
  );
}

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
      <OdaTipleri ilKod={ilKod} ilce={ilce} mahalle={mahalle} />
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
