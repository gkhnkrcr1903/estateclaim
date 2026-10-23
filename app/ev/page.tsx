"use client";

import { useMemo, useState } from "react";
import { iller as ilListesi } from "../../lib/iller-meta";
import { mahalleler } from "../../lib/arsa";
import { evDegerle, type EvBilgisi } from "../../lib/ev";

const TL = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";

const KATLAR: EvBilgisi["kat"][] = ["Bodrum", "Zemin/bahçe", "Ara kat", "En üst kat", "Çatı dubleks"];
const DURUMLAR: EvBilgisi["durum"][] = ["Sıfır/yeni", "Bakımlı", "Orta", "Tadilat gerekli"];
const ISINMA: EvBilgisi["isinma"][] = ["Doğalgaz kombi", "Merkezi", "Yerden ısıtma", "Soba/diğer"];
const TAPU: EvBilgisi["tapu"][] = ["Kat mülkiyeti", "Kat irtifakı", "Hisseli/arsa tapusu"];

export default function EvSayfasi() {
  const iller = ilListesi();
  const [e, setE] = useState<EvBilgisi>({
    il: "34", ilce: "Kadıköy", netM2: 100, odaSayisi: "3+1", binaYasi: 12, kat: "Ara kat", toplamKat: 6,
    durum: "Bakımlı", isinma: "Doğalgaz kombi", asansor: true, otopark: false, site: false, manzara: false,
    ulasimKm: 1, tapu: "Kat mülkiyeti", krediyeUygun: true, istenenFiyat: 7_500_000,
  });
  const g = <K extends keyof EvBilgisi>(k: K, v: EvBilgisi[K]) => setE({ ...e, [k]: v });
  const il = iller.find((i) => i.kod === e.il)!;
  const s = useMemo(() => (e.netM2 > 0 && e.istenenFiyat > 0 ? evDegerle(e) : null), [e]);
  const kararSinifi = s?.karar.startsWith("Alınır") ? "p-yuksek" : s?.karar.startsWith("Makul") ? "p-orta" : "p-dusuk";

  return (
    <>
      <header>
        <h1>Bu ev alınır mı?</h1>
        <p>Evin özelliklerini girin; bölge fiyatlarına göre adil değer, pazarlık hedefi ve kira getirisi hesaplansın.</p>
      </header>
      <main>
        <div className="uyari">⚠️ Tahminler <b>örnek bölge verisi</b> ve kural tabanlı düzeltmelerle hesaplanır, <b>ekspertiz veya yatırım tavsiyesi değildir</b>. Kesin değer için lisanslı gayrimenkul değerleme raporu alın.</div>

        <section className="kart">
          <h2>🏠 Evin özellikleri</h2>
          <div className="form">
            <label>İl<select value={e.il} onChange={(x) => setE({ ...e, il: x.target.value, ilce: iller.find((i) => i.kod === x.target.value)!.ilceler[0], mahalle: "" })}>{iller.map((i) => <option key={i.kod} value={i.kod}>{i.ad}</option>)}</select></label>
            <label>İlçe<select value={e.ilce} onChange={(x) => setE({ ...e, ilce: x.target.value, mahalle: "" })}>{il.ilceler.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Mahalle<select value={e.mahalle ?? ""} onChange={(x) => g("mahalle", x.target.value)}><option value="">Belirtilmedi (ilçe ortalaması)</option>{mahalleler(e.il, e.ilce).map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Net m²<input type="number" min={1} value={e.netM2} onChange={(x) => g("netM2", Number(x.target.value))} /></label>
            <label>Oda sayısı<select value={e.odaSayisi} onChange={(x) => g("odaSayisi", x.target.value)}>{["1+0", "1+1", "2+1", "3+1", "4+1", "5+1 ve üzeri"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Bina yaşı<input type="number" min={0} value={e.binaYasi} onChange={(x) => g("binaYasi", Number(x.target.value))} /></label>
            <label>Bulunduğu kat<select value={e.kat} onChange={(x) => g("kat", x.target.value as EvBilgisi["kat"])}>{KATLAR.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Binanın kat sayısı<input type="number" min={1} value={e.toplamKat} onChange={(x) => g("toplamKat", Number(x.target.value))} /></label>
            <label>Evin durumu<select value={e.durum} onChange={(x) => g("durum", x.target.value as EvBilgisi["durum"])}>{DURUMLAR.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Isınma<select value={e.isinma} onChange={(x) => g("isinma", x.target.value as EvBilgisi["isinma"])}>{ISINMA.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Ulaşıma/merkeze (km)<input type="number" step="0.1" min={0} value={e.ulasimKm} onChange={(x) => g("ulasimKm", Number(x.target.value))} /></label>
            <label>Tapu durumu<select value={e.tapu} onChange={(x) => g("tapu", x.target.value as EvBilgisi["tapu"])}>{TAPU.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>İstenen fiyat (₺)<input type="number" min={1} step={50000} value={e.istenenFiyat} onChange={(x) => g("istenenFiyat", Number(x.target.value))} /></label>
            {([["asansor", "Asansör"], ["otopark", "Otopark"], ["site", "Site içinde"], ["manzara", "Manzara"], ["krediyeUygun", "Krediye uygun"]] as const).map(([k, ad]) => (
              <label key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={e[k]} onChange={(x) => g(k, x.target.checked)} /> {ad}</label>
            ))}
          </div>
        </section>

        {s && (
          <div className="izgara">
            <section className="kart">
              <h2>Sonuç</h2>
              <span className={`rozet ${kararSinifi}`} style={{ fontSize: 15 }}>{s.karar}</span>
              <div className="oneriler" style={{ marginTop: 14 }}>
                <div><div className="soluk">Tahmini adil değer</div><b>{TL(s.tahmini)}</b><div className="soluk">{TL(s.alt)} – {TL(s.ust)}</div></div>
                <div><div className="soluk">İstenen fiyat</div><b>{TL(e.istenenFiyat)}</b><div className={s.fark > 0 ? "eksi" : "arti"}>{s.fark > 0 ? "%" + Math.round(s.fark * 100) + " pahalı" : "%" + Math.round(-s.fark * 100) + " ucuz"}</div></div>
                <div><div className="soluk">Pazarlık hedefi</div><b>{TL(s.hedefFiyat)}</b></div>
                <div><div className="soluk">Tahmini kira</div><b>{TL(s.kiraTahmini)}/ay</b><div className="soluk">%{s.brutGetiri.toLocaleString("tr-TR")} getiri · {s.amortismanYil.toLocaleString("tr-TR")} yıl amortisman</div></div>
              </div>
              <h3 style={{ fontSize: 14, marginTop: 16 }}>Kontrol listesi</h3>
              <ol className="tavsiye">{s.notlar.map((n, i) => <li key={i}>{n}</li>)}</ol>
            </section>
            <section className="kart">
              <h2>Fiyata etki eden özellikler</h2>
              <ul className="nedenler">
                {s.etkenler.map((x, i) => (
                  <li key={i}><span>{x.metin}</span><span className={x.oran >= 0 ? "arti" : "eksi"}>{x.oran >= 0 ? "+" : ""}{x.oran}%</span></li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
