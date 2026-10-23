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
  const s = useMemo(() => semtSiralamasi(ilKod), [ilKod]);
  return (
    <section className="kart">
      <h2>📍 En değerli ilçeler — {ilAd}</h2>
      {s ? (
        <div className="oneriler">
          <Liste baslik="🏠 Satılık konut (m²)" kalemler={s.satis} birim="" />
          <Liste baslik="🔑 Kiralık konut (m²/ay)" kalemler={s.kira} birim="" />
          <Liste baslik="🌳 Arsa (imarlı, m²)" kalemler={s.arsa} birim="" />
        </div>
      ) : (
        <p style={{ marginTop: 0 }}>
          {ilAd} için ilçe bazında güvenilir fiyat kademesi bilgisi yok; sıralama gösterilmiyor. İl ortalaması ve merkez/kırsal ayrımı
          konut piyasası bölümünde yer alır.
        </p>
      )}
      <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>
        ⚠️ İlçe sıralaması tahminidir: ilçelerin yaygın bilinen genel piyasa konumuna (kademe) dayanır, aynı kademedeki ilçelerin sırası kesin değildir.
        Mahalle bazında açık fiyat verisi olmadığından semt (mahalle) sıralaması yapılmıyor{ilce ? `; ${ilce} içindeki mahalle farkları örnek veridir` : ""}.
      </p>
    </section>
  );
}
