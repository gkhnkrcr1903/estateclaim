"use client";

import { useMemo } from "react";
import { ilOzeti, semtSiralamasi, type SiraKalemi } from "../lib/bolge";

const TL = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
const SAYI = (n: number) => n.toLocaleString("tr-TR");
const MADALYA = ["🥇", "🥈", "🥉"];

function Liste({ baslik, kalemler, birim }: { baslik: string; kalemler: SiraKalemi[]; birim: string }) {
  return (
    <div>
      <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>{baslik}</h3>
      <ol className="sira">
        {kalemler.map((k, i) => (
          <li key={k.ad}>
            <span>{MADALYA[i] ?? `${i + 1}.`} {k.ad}</span>
            <b>{TL(k.deger)}{birim}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function IlGenelBilgi({ ilKod }: { ilKod: string }) {
  const o = useMemo(() => ilOzeti(ilKod), [ilKod]);
  return (
    <section className="kart">
      <h2>ℹ️ {o.ad} hakkında genel bilgi</h2>
      <div className="bilgi-izgara">
        <div><div className="soluk">Nüfus (TÜİK 2025)</div><b>{SAYI(o.nufus)}</b><div className="soluk">81 il içinde {o.nufusSirasi}.</div></div>
        <div>
          <div className="soluk">Yıllık nüfus artışı</div>
          <b className={o.buyume >= 0 ? "arti" : "eksi"}>‰{SAYI(o.buyume)}</b>
          <div className="soluk">En hızlı büyüyen {o.buyumeSirasi}. il</div>
        </div>
        <div>
          <div className="soluk">Konut m² fiyatı</div>
          <b>{TL(o.satisM2)}</b>
          <div className="soluk">{o.satisKaynak === "TCMB" ? "TCMB" : "Tahmini"} · Türkiye ort. {o.turkiyeFarki >= 0 ? "+" : ""}%{o.turkiyeFarki}</div>
        </div>
        <div><div className="soluk">Kira m² / ay</div><b>{TL(o.kiraM2)}</b><div className="soluk">Brüt getiri %{SAYI(o.brutGetiri)}</div></div>
        <div><div className="soluk">İmarlı arsa m² (tahmini)</div><b>{TL(o.arsaM2)}</b><div className="soluk">Merkeze ~5 km, konut imarlı</div></div>
        <div><div className="soluk">İlçe / mahalle</div><b>{o.ilceSayisi} / {SAYI(o.mahalleSayisi)}</b></div>
        <div><div className="soluk">En pahalı ilçe</div><b>{o.enPahaliIlce.ad}</b><div className="soluk">{TL(o.enPahaliIlce.deger)}/m²</div></div>
        <div><div className="soluk">En uygun ilçe</div><b>{o.enUygunIlce.ad}</b><div className="soluk">{TL(o.enUygunIlce.deger)}/m²</div></div>
      </div>
    </section>
  );
}

export function EnDegerliSemtler({ ilKod, ilce, ilAd }: { ilKod: string; ilce: string; ilAd: string }) {
  const s = useMemo(() => semtSiralamasi(ilKod, ilce || undefined), [ilKod, ilce]);
  const birim = s.birim === "mahalle" ? "semtler" : "ilçeler";
  return (
    <section className="kart">
      <h2>📍 En değerli {birim} — {ilce ? `${ilce}, ` : ""}{ilAd}</h2>
      <div className="oneriler">
        <Liste baslik="🏠 Satılık konut (m²)" kalemler={s.satis} birim="" />
        <Liste baslik="🔑 Kiralık konut (m²/ay)" kalemler={s.kira} birim="" />
        <Liste baslik="🌳 Arsa (imarlı, m²)" kalemler={s.arsa} birim="" />
      </div>
      <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>
        {s.birim === "mahalle"
          ? "⚠️ Mahalle farkları örnek veridir, gerçek semt sıralaması değildir; ilçe ve il düzeyi tahmini/TCMB veriye dayanır."
          : "⚠️ İlçe farkları tahminidir: büyük şehirlerde ilçelerin genel piyasa konumuna, diğer illerde merkez/kırsal ayrımına dayanır. Semtleri görmek için bir ilçe seçin."}
      </p>
    </section>
  );
}
