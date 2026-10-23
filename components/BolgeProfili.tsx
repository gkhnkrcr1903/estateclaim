"use client";

import { useMemo } from "react";
import { bolgeProfili } from "../lib/profil";

const S = (n: number, b = 1) => n.toLocaleString("tr-TR", { maximumFractionDigits: b });

// Türkiye ortalamasına göre fark etiketi
function Fark({ deger, tr, birim = "", ters = false, b = 1 }: { deger: number; tr?: number; birim?: string; ters?: boolean; b?: number }) {
  if (tr == null) return null;
  const f = deger - tr;
  if (Math.abs(f) < 0.05) return <span className="soluk">Türkiye ile aynı</span>;
  return <span className="soluk">Türkiye {S(tr, b)}{birim} · {f > 0 !== ters ? "üstünde" : "altında"}</span>;
}

// Yüzde dilimlerinden yatay yığılmış çubuk
function Dilimler({ dilimler }: { dilimler: { ad: string; deger: number; renk: string }[] }) {
  return (
    <div>
      <div className="dilim-cubuk">
        {dilimler.map((d) => <div key={d.ad} style={{ width: `${d.deger}%`, background: d.renk }} title={`${d.ad} %${S(d.deger)}`} />)}
      </div>
      <div className="dilim-etiket">
        {dilimler.map((d) => <span key={d.ad}><i style={{ background: d.renk }} />{d.ad} %{S(d.deger)}</span>)}
      </div>
    </div>
  );
}

export default function BolgeProfiliBolumu({ ilKod, ilce, ilAd }: { ilKod: string; ilce: string; ilAd: string }) {
  const b = useMemo(() => bolgeProfili(ilKod, ilce || undefined), [ilKod, ilce]);
  if (!b) return null;
  const { il: p, tr, ilce: ic } = b;

  return (
    <section className="kart">
      <h2>👥 Kimler yaşıyor? — {ilAd} nüfus profili</h2>

      {ic && (
        <div className="ilce-bant">
          <b>{ic.ad}</b>: {S(ic.nufus, 0)} kişi · il nüfusundaki payı %{S(ic.pay)} · {ic.ilceSayisi} ilçe içinde nüfusça {ic.sira}. · 100 kadına {ic.erkek100Kadina} erkek
        </div>
      )}

      <div className="bilgi-izgara">
        <div><div className="soluk">Ortanca yaş</div><b>{S(p.ortancaYas)}</b><div><Fark deger={p.ortancaYas} tr={tr?.ortancaYas} /></div></div>
        <div><div className="soluk">Ortalama hane büyüklüğü</div><b>{S(p.haneBuyuklugu, 2)} kişi</b><div><Fark deger={p.haneBuyuklugu} tr={tr?.haneBuyuklugu} b={2} /></div></div>
        <div><div className="soluk">Hane sayısı</div><b>{S(p.haneSayisi, 0)}</b></div>
        <div>
          <div className="soluk">Eğitim (25+ yaş, ort.)</div>
          {p.egitimYili != null ? (
            <><b>{S(p.egitimYili)} yıl</b><div><Fark deger={p.egitimYili} tr={tr?.ortalamaEgitimYili} birim=" yıl" /></div></>
          ) : (
            <><b>{tr ? `${S(tr.ortalamaEgitimYili)} yıl` : "—"}</b><div className="soluk">İl verisi yok · Türkiye ortalaması</div></>
          )}
        </div>
        <div><div className="soluk">Doğurganlık</div><b>{S(p.dogurganlik, 2)}</b><div><Fark deger={p.dogurganlik} tr={tr?.dogurganlik} b={2} /></div></div>
        <div><div className="soluk">Bu ile kayıtlı olanlar</div><b>%{S(p.yerliOrani)}</b><div className="soluk">{p.yerliOrani < 40 ? "Göç alan il" : p.yerliOrani > 80 ? "Göç az" : "Karma"}</div></div>
        <div><div className="soluk">Nüfus yoğunluğu</div><b>{S(p.yogunluk, 0)} kişi/km²</b></div>
        <div><div className="soluk">Yabancı nüfus</div><b>{S(p.yabanci, 0)}</b></div>
      </div>

      <div className="profil-cubuklar">
        <div>
          <h3>Yaş dağılımı</h3>
          <Dilimler dilimler={[
            { ad: "0–14", deger: p.yas0_14, renk: "#60a5fa" },
            { ad: "15–64", deger: p.yas15_64, renk: "#2f6fed" },
            { ad: "65+", deger: p.yas65, renk: "#f59e0b" },
          ]} />
        </div>
        <div>
          <h3>Hane tipleri</h3>
          <Dilimler dilimler={[
            { ad: "Tek kişilik", deger: p.tekKisilik, renk: "#f472b6" },
            { ad: "Çekirdek aile", deger: p.cekirdekAile, renk: "#2f6fed" },
            { ad: "Geniş aile", deger: p.genisAile, renk: "#16a34a" },
            { ad: "Diğer", deger: Math.max(0, Math.round((100 - p.tekKisilik - p.cekirdekAile - p.genisAile) * 10) / 10), renk: "#94a3b8" },
          ]} />
        </div>
        <div>
          <h3>Medeni durum (15+ yaş)</h3>
          <Dilimler dilimler={[
            { ad: "Hiç evlenmemiş", deger: p.hicEvlenmemis, renk: "#a78bfa" },
            { ad: "Evli", deger: p.evli, renk: "#2f6fed" },
            { ad: "Boşanmış", deger: p.bosanmis, renk: "#f59e0b" },
            { ad: "Eşi ölmüş", deger: p.esiOlmus, renk: "#94a3b8" },
          ]} />
        </div>
      </div>

      <h3 style={{ fontSize: 14, margin: "14px 0 6px" }}>🏘️ Konut talebi açısından ne anlama geliyor?</h3>
      <ul className="tavsiye-liste">
        {b.yorumlar.map((y, i) => <li key={i}><span>💡</span><span>{y}</span></li>)}
      </ul>

      <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>
        Kaynak: TÜİK ADNKS 2025 ve Ulusal Eğitim İstatistikleri 2025. Yaş, hane ve medeni durum il düzeyindedir; ilçe için yalnızca nüfus ve cinsiyet, mahalle için TÜİK profil verisi yayımlanmaz.
        {p.egitimYili == null && " Eğitim süresi TÜİK tarafından yalnızca en yüksek ve en düşük iller için açıklandı."}
      </p>
    </section>
  );
}
