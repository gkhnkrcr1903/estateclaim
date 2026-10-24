"use client";

import { useMemo, useState } from "react";
import { iller as ilListesi } from "../../lib/iller-meta";
import { mahalleler } from "../../lib/arsa";
import { evDegerle, YAKINLIKLAR, type EvBilgisi, type Tavsiye } from "../../lib/ev";
import PdfKaydet from "../../components/PdfKaydet";
import Yetki from "../../components/Yetki";
import SayiKutusu from "../../components/SayiKutusu";
import YakinYerler from "../../components/YakinYerler";

const TL = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";

const KATLAR: EvBilgisi["kat"][] = ["Bodrum", "Zemin/bahçe", "Ara kat", "En üst kat", "Çatı dubleks"];
const DURUMLAR: EvBilgisi["durum"][] = ["Sıfır/yeni", "Bakımlı", "Orta", "Tadilat gerekli"];
const ISINMA: EvBilgisi["isinma"][] = ["Doğalgaz kombi", "Merkezi", "Yerden ısıtma", "Soba/diğer"];
const TAPU: EvBilgisi["tapu"][] = ["Kat mülkiyeti", "Kat irtifakı", "Hisseli/arsa tapusu"];
const OTOPARK: EvBilgisi["otopark"][] = ["Yok", "Açık", "Kapalı"];
const MANZARA: EvBilgisi["manzara"][] = ["Yok", "Şehir/doğa", "Deniz/göl"];
const CEPHE: NonNullable<EvBilgisi["cephe"]>[] = ["Güney", "Doğu/Batı", "Kuzey", "Çift cephe ve üzeri"];
const KULLANIM: NonNullable<EvBilgisi["kullanim"]>[] = ["Boş", "Kiracılı", "Sahibi oturuyor"];
const AMAC: NonNullable<EvBilgisi["amac"]>[] = ["Oturmak", "Yatırım (kira)"];
const GRUPLAR: Tavsiye["grup"][] = ["Fiyat ve pazarlık", "Kira mı, satın almak mı?", "Finansman", "Hukuki ve teknik kontrol", "Oturum / yatırım"];
const SIMGE: Record<Tavsiye["tur"], string> = { olumlu: "✅", uyari: "⚠️", bilgi: "💡" };

// Sayfa yalnızca "ev" yetkisi olan kullanıcıya açılır.
export default function Sayfa() {
  return (
    <Yetki gerekli="ev">
      <EvSayfasi />
    </Yetki>
  );
}

function EvSayfasi() {
  const iller = ilListesi();
  const [e, setE] = useState<EvBilgisi>({
    il: "34", ilce: "Kadıköy", netM2: 100, odaSayisi: "3+1", binaYasi: 12, kat: "Ara kat", toplamKat: 6,
    durum: "Bakımlı", isinma: "Doğalgaz kombi", asansor: true, otopark: "Yok", site: false, manzara: "Yok",
    ulasimKm: 1, tapu: "Kat mülkiyeti", krediyeUygun: true, istenenFiyat: 12_000_000,
    cephe: "Doğu/Batı", balkon: true, banyo: 1, iskan: true, aidat: 0, anaCadde: false,
    metro: "Yakın (araçla 5–10 dk)", otobus: "Yürüme mesafesinde", sosyalHayat: "Yürüme mesafesinde", market: "Yürüme mesafesinde",
    devletOkulu: "Yürüme mesafesinde", ozelOkul: "Yakın (araçla 5–10 dk)", hastane: "Yakın (araçla 5–10 dk)", park: "Yürüme mesafesinde", cocuklu: false,
    kullanim: "Boş", esyali: false, mevcutKira: 0, amac: "Oturmak", pesinatOrani: 30, aylikFaiz: 2.5, vadeAy: 120,
  });
  const g = <K extends keyof EvBilgisi>(k: K, v: EvBilgisi[K]) => setE({ ...e, [k]: v });
  const il = iller.find((i) => i.kod === e.il)!;
  const s = useMemo(() => (e.netM2 > 0 && e.istenenFiyat > 0 ? evDegerle(e) : null), [e]);
  const kararSinifi = s?.karar.startsWith("Alınır") ? "p-yuksek" : s?.karar.startsWith("Makul") ? "p-orta" : "p-dusuk";
  const enBuyuk = s ? Math.max(e.istenenFiyat, ...s.yontemler.map((y) => y.deger)) : 1;

  const sayi = (k: keyof EvBilgisi, ad: string, ek: Record<string, number | string> = {}) => (
    <label>{ad}<SayiKutusu min={0} {...ek} deger={(e[k] as number) ?? 0} degistir={(n) => g(k, n as never)} /></label>
  );
  const secim = <T extends string>(k: keyof EvBilgisi, ad: string, liste: readonly T[]) => (
    <label>{ad}<select value={(e[k] as string) ?? ""} onChange={(x) => g(k, x.target.value as never)}>{liste.map((v) => <option key={v}>{v}</option>)}</select></label>
  );
  const kutu = (k: keyof EvBilgisi, ad: string) => (
    <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!e[k]} onChange={(x) => g(k, x.target.checked as never)} /> {ad}</label>
  );

  return (
    <>
      <header className="baslik-satiri">
        <div>
          <h1>Ev Analiz</h1>
          <p>Evin özelliklerini girin: adil değer dört yöntemle hesaplanır, pazarlık, finansman ve kontrol tavsiyeleri verilir.</p>
        </div>
        <PdfKaydet dosyaAdi={`Ev Değerleme - ${[e.mahalle, e.ilce, il.ad].filter(Boolean).join(", ")}`} />
      </header>
      <main>
        <div className="uyari">⚠️ Tahminler TCMB/tahmini bölge fiyatları, Bakanlık 2026 yapı maliyetleri ve kural tabanlı düzeltmelerle hesaplanır, <b>ekspertiz veya yatırım tavsiyesi değildir</b>. Kesin değer için lisanslı gayrimenkul değerleme raporu alın.</div>

        <section className="kart">
          <h2>Konum ve fiyat</h2>
          <div className="form">
            <label>İl<select value={e.il} onChange={(x) => setE({ ...e, il: x.target.value, ilce: iller.find((i) => i.kod === x.target.value)!.ilceler[0], mahalle: "" })}>{iller.map((i) => <option key={i.kod} value={i.kod}>{i.ad}</option>)}</select></label>
            <label>İlçe<select value={e.ilce} onChange={(x) => setE({ ...e, ilce: x.target.value, mahalle: "" })}>{il.ilceler.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Mahalle<select value={e.mahalle ?? ""} onChange={(x) => g("mahalle", x.target.value)}><option value="">Belirtilmedi (ilçe ortalaması)</option>{mahalleler(e.il, e.ilce).map((x) => <option key={x}>{x}</option>)}</select></label>
            {sayi("istenenFiyat", "İstenen fiyat (₺)", { min: 1, step: 50000 })}
            {sayi("ulasimKm", "Şehir/iş merkezine (km)", { step: 0.1 })}
            {secim("amac", "Alma amacınız", AMAC)}
            {kutu("anaCadde", "Gürültülü ana cadde üzerinde")}
          </div>
        </section>

        <section className="kart">
          <h2>Çevre ve yakınlık</h2>
          <div className="form">
            {secim("metro", "Metro / raylı sistem", YAKINLIKLAR)}
            {secim("otobus", "Otobüs / minibüs", YAKINLIKLAR)}
            {secim("sosyalHayat", "Sosyal hayat (kafe, AVM)", YAKINLIKLAR)}
            {secim("market", "Market / çarşı", YAKINLIKLAR)}
            {secim("devletOkulu", "Devlet okulu", YAKINLIKLAR)}
            {secim("ozelOkul", "Özel okul", YAKINLIKLAR)}
            {secim("hastane", "Hastane", YAKINLIKLAR)}
            {secim("park", "Park / yeşil alan", YAKINLIKLAR)}
            {kutu("cocuklu", "Okul çağında çocuğum var")}
          </div>
          <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>Yürüme mesafesi yaklaşık 10 dakika (~800 m), "Uzak" araçla 20 dakikadan fazla kabul edilir. Yakınlıklar fiyatı kural tabanlı olarak etkiler ve aile için uygunluk puanını belirler.</p>
        </section>

        <section className="kart">
          <h2>Ev ve bina</h2>
          <div className="form">
            {sayi("netM2", "Net m²", { min: 1 })}
            {secim("odaSayisi", "Oda sayısı", ["1+0", "1+1", "2+1", "3+1", "4+1", "5+1 ve üzeri"] as const)}
            <label>Banyo<select value={e.banyo ?? 1} onChange={(x) => g("banyo", Number(x.target.value) as 1 | 2)}><option value={1}>1</option><option value={2}>2 ve üzeri</option></select></label>
            {secim("kat", "Bulunduğu kat", KATLAR)}
            {sayi("toplamKat", "Binanın kat sayısı", { min: 1 })}
            {sayi("binaYasi", "Bina yaşı")}
            {secim("durum", "Evin durumu", DURUMLAR)}
            {secim("isinma", "Isınma", ISINMA)}
            {secim("cephe", "Cephe", CEPHE)}
            {secim("manzara", "Manzara", MANZARA)}
            {secim("otopark", "Otopark", OTOPARK)}
            {sayi("aidat", "Aidat (₺/ay)", { step: 100 })}
            {kutu("asansor", "Asansör")}
            {kutu("site", "Site içinde")}
            {kutu("balkon", "Balkon")}
            {kutu("esyali", "Eşyalı")}
          </div>
        </section>

        <section className="kart">
          <h2>Tapu, kullanım ve finansman</h2>
          <div className="form">
            {secim("tapu", "Tapu durumu", TAPU)}
            {secim("kullanim", "Şu an", KULLANIM)}
            {sayi("mevcutKira", "Şu an ödediğim kira (₺/ay, yoksa 0)", { step: 500 })}
            {sayi("pesinatOrani", "Peşinat (%)", { max: 100 })}
            {sayi("aylikFaiz", "Aylık kredi faizi (%)", { step: 0.01 })}
            {sayi("vadeAy", "Vade (ay)", { min: 1, step: 12 })}
            {kutu("iskan", "İskânı var")}
            {kutu("krediyeUygun", "Krediye uygun")}
          </div>
          <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>Kredi faizi bankaya ve döneme göre değişir; bankanızın güncel konut kredisi faizini girin.</p>
        </section>

        {s && (
          <>
            <section className="kart">
              <h2>Sonuç</h2>
              <span className={`rozet ${kararSinifi}`} style={{ fontSize: 15 }}>{s.karar}</span>
              <div className="oneriler" style={{ marginTop: 14 }}>
                <div><div className="soluk">Tahmini adil değer</div><b style={{ fontSize: 20 }}>{TL(s.tahmini)}</b><div className="soluk">{TL(s.alt)} – {TL(s.ust)}</div></div>
                <div><div className="soluk">İstenen fiyat</div><b>{TL(e.istenenFiyat)}</b><div className={s.fark > 0 ? "eksi" : "arti"}>{s.fark > 0 ? "%" + Math.round(s.fark * 100) + " pahalı" : "%" + Math.round(-s.fark * 100) + " ucuz"}</div></div>
                <div><div className="soluk">Pazarlık</div><b>{TL(s.hedefFiyat)}</b><div className="soluk">Açılış teklifi {TL(s.acilisTeklifi)}</div></div>
                <div><div className="soluk">Tahmini kira</div><b>{TL(s.kiraTahmini)}/ay</b><div className="soluk">%{s.brutGetiri.toLocaleString("tr-TR")} getiri · {s.amortismanYil.toLocaleString("tr-TR")} yıl</div></div>
                <div><div className="soluk">DASK primi (yıllık, tahmini)</div><b>{TL(s.dask.min)} – {TL(s.dask.max)}</b><div className="soluk">Risk grubuna göre · <a href="https://www.dask.gov.tr/tr/police-prim-ve-bedeli-hesaplama" target="_blank" rel="noreferrer">kesin prim</a></div></div>
                <div><div className="soluk">Aile için uygunluk</div><b>{s.aile.puan}/100</b><div className="soluk">{s.aile.derece}</div></div>
                {s.kredi && <div><div className="soluk">Kredi taksiti</div><b>{TL(s.kredi.taksit)}/ay</b><div className="soluk">Peşinat {TL(s.kredi.pesinat)}</div></div>}
              </div>
              <div className="hesap-ozeti">
                <h3>Tahmini adil değer nasıl hesaplandı?</h3>
                <ol>{s.hesapOzeti.map((m, i) => <li key={i}>{m}</li>)}</ol>
              </div>
            </section>

            <section className="kart">
              <h2>Adil değer — yöntemlere göre</h2>
              <div className="yontemler">
                {s.yontemler.map((y) => (
                  <div key={y.ad} className="yontem">
                    <div className="yontem-ust">
                      <span><b>{y.ad}</b> {y.agirlik > 0 ? <span className="soluk">· ağırlık %{Math.round(y.agirlik * 100)}</span> : <span className="soluk">· yalnızca referans</span>}</span>
                      <b>{TL(y.deger)}</b>
                    </div>
                    <div className="cubuk"><div style={{ width: `${(y.deger / enBuyuk) * 100}%`, opacity: y.agirlik > 0 ? 1 : 0.45 }} /></div>
                    <div className="soluk" style={{ fontSize: 12 }}>{y.aciklama}</div>
                    {y.agirlik > 0 && <div className="soluk" style={{ fontSize: 12 }}>Adil değere katkısı: {TL(y.deger * y.agirlik)} · istenen fiyata göre {y.deger >= e.istenenFiyat ? "%" + Math.round((y.deger / e.istenenFiyat - 1) * 100) + " yüksek" : "%" + Math.round((1 - y.deger / e.istenenFiyat) * 100) + " düşük"}</div>}
                    <details className="ayrinti">
                      <summary>Hesap adımları</summary>
                      <table>
                        <tbody>{y.adimlar.map((a, i) => <tr key={i}><td>{a.ad}</td><td>{a.deger}</td></tr>)}</tbody>
                      </table>
                      <p><b>Güçlü yanı:</b> {y.guclu}</p>
                      <p><b>Sınırlılığı:</b> {y.zayif}</p>
                    </details>
                  </div>
                ))}
                <div className="yontem">
                  <div className="yontem-ust"><span><b>İstenen fiyat</b></span><b>{TL(e.istenenFiyat)}</b></div>
                  <div className="cubuk istenen"><div style={{ width: `${(e.istenenFiyat / enBuyuk) * 100}%` }} /></div>
                </div>
              </div>
              <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>Adil değer, emsal (%60), gelir (%25) ve maliyet (%15) yöntemlerinin ağırlıklı ortalamasıdır. Emsal en yüksek ağırlığı alır çünkü alıcıların ödediği fiyatı en doğrudan yansıtır; maliyet yöntemi değerli semtlerde piyasa değerinin altında kalır, bu normaldir. Her yöntemin ayrıntısı için "Hesap adımları"nı açın.</p>
            </section>

            <div className="izgara">
              <section className="kart">
                <h2>Tavsiyeler</h2>
                {GRUPLAR.map((grup) => {
                  const liste = s.tavsiyeler.filter((t) => t.grup === grup);
                  if (!liste.length) return null;
                  return (
                    <div key={grup} style={{ marginBottom: 12 }}>
                      <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>{grup}</h3>
                      <ul className="tavsiye-liste">
                        {liste.map((t, i) => <li key={i} className={`t-${t.tur}`}><span>{SIMGE[t.tur]}</span><span>{t.metin}</span></li>)}
                      </ul>
                    </div>
                  );
                })}
              </section>
              <section className="kart">
                <h2>Fiyata etki eden özellikler</h2>
                <ul className="nedenler">
                  {s.etkenler.map((x, i) => (
                    <li key={i}><span>{x.metin}</span><span className={x.oran >= 0 ? "arti" : "eksi"}>{x.oran >= 0 ? "+" : ""}{x.oran}%</span></li>
                  ))}
                </ul>
                <p className="soluk" style={{ fontSize: 12 }}>Özelliklerin toplam etkisi −%45 ile +%60 arasında sınırlandırılır.</p>
                <YakinYerler il={e.il} ilce={e.ilce} mahalle={e.mahalle || undefined} />
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}
