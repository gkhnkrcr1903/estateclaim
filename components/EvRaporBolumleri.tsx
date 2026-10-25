"use client";

import type { EvBilgisi, EvSonuc, Tavsiye } from "../lib/ev";
import type { SaticiRaporu } from "../lib/satici";

// Ev Analiz sonuç bölümleri. Hem Ev Analiz sayfası hem paylaşılan rapor sayfası kullanır; yalnızca hesaplanmış
// sonuçla çalışır (veri dosyasına ihtiyaç duymaz).

const TL = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
const GRUPLAR: Tavsiye["grup"][] = ["Fiyat ve pazarlık", "Kira mı, satın almak mı?", "Finansman", "Hukuki ve teknik kontrol", "Oturum / yatırım"];
const kararSinifi = (k: string) => (k.startsWith("Alınır") ? "p-yuksek" : k.startsWith("Makul") ? "p-orta" : "p-dusuk");

export function EvOzeti({ e, ilAd }: { e: EvBilgisi; ilAd?: string }) {
  const satirlar = [
    ["Konum", [e.mahalle, e.ilce, ilAd].filter(Boolean).join(", ")],
    ["Ev", `${e.netM2} m² net · ${e.odaSayisi} · ${e.kat} · ${e.toplamKat} katlı bina · ${e.binaYasi} yaşında`],
    ["Durum", `${e.durum} · ${e.isinma}${e.asansor ? " · asansörlü" : ""}${e.site ? " · site içinde" : ""}${e.otopark !== "Yok" ? ` · ${e.otopark.toLocaleLowerCase("tr")} otopark` : ""}`],
    ["Tapu", `${e.tapu}${e.iskan === false ? " · iskânsız" : ""}${e.krediyeUygun ? " · krediye uygun" : " · krediye uygun değil"}`],
  ];
  return (
    <section className="kart">
      <h2>Değerlendirilen ev</h2>
      <table className="ozet-tablo">
        <tbody>{satirlar.map(([a, d]) => <tr key={a}><th>{a}</th><td>{d}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

export function AliciSonuc({ e, s }: { e: EvBilgisi; s: EvSonuc }) {
  return (
    <section className="kart">
      <h2>Sonuç</h2>
      <span className={`rozet ${kararSinifi(s.karar)}`} style={{ fontSize: 15 }}>{s.karar}</span>
      <div className="oneriler" style={{ marginTop: 14 }}>
        <div><div className="soluk">Tahmini adil değer</div><b style={{ fontSize: 20 }}>{TL(s.tahmini)}</b><div className="soluk">{TL(s.alt)} – {TL(s.ust)}</div></div>
        <div><div className="soluk">İstenen fiyat</div><b>{TL(e.istenenFiyat)}</b><div className={s.fark > 0 ? "eksi" : "arti"}>{s.fark > 0 ? "%" + Math.round(s.fark * 100) + " pahalı" : "%" + Math.round(-s.fark * 100) + " ucuz"}</div></div>
        <div><div className="soluk">Pazarlık</div><b>{TL(s.hedefFiyat)}</b><div className="soluk">Açılış teklifi {TL(s.acilisTeklifi)}</div></div>
        <div><div className="soluk">Tahmini kira</div><b>{TL(s.kiraTahmini)}/ay</b><div className="soluk">%{s.brutGetiri.toLocaleString("tr-TR")} getiri · {s.amortismanYil.toLocaleString("tr-TR")} yıl</div></div>
        <div><div className="soluk">DASK primi (yıllık, tahmini)</div><b>{TL(s.dask.min)} – {TL(s.dask.max)}</b><div className="soluk">Risk grubuna göre · <a href="https://www.dask.gov.tr/tr/police-prim-ve-bedeli-hesaplama" target="_blank" rel="noreferrer">kesin prim</a></div></div>
        <div><div className="soluk">Aile için uygunluk</div><b>{s.aile.puan}/100</b><div className="soluk">{s.aile.derece}</div></div>
        {s.kredi && <div><div className="soluk">Kredi taksiti</div><b>{TL(s.kredi.taksit)}/ay</b><div className="soluk">Peşinat {TL(s.kredi.pesinat)}</div></div>}
      </div>
      <HesapOzeti s={s} />
    </section>
  );
}

function HesapOzeti({ s }: { s: EvSonuc }) {
  return (
    <div className="hesap-ozeti">
      <h3>Tahmini adil değer nasıl hesaplandı?</h3>
      <ol>{s.hesapOzeti.map((m, i) => <li key={i}>{m}</li>)}</ol>
    </div>
  );
}

export function SaticiSonuc({ s, f }: { s: EvSonuc; f: SaticiRaporu }) {
  const konumSinifi = f.konum === "Piyasa ile uyumlu" ? "p-yuksek" : f.konum === "Piyasanın belirgin üstünde" ? "p-dusuk" : "p-orta";
  return (
    <>
      <section className="kart">
        <h2>Fiyatlandırma önerisi</h2>
        <div className="fiyat-merdiveni">
          <div className="basamak vurgulu"><div className="soluk">Önerilen ilan fiyatı</div><b>{TL(f.ilanFiyati)}</b><div className="soluk">Adil değer + %5 pazarlık payı</div></div>
          <div className="basamak"><div className="soluk">Hedef satış fiyatı</div><b>{TL(f.hedefFiyat)}</b><div className="soluk">Tahmini adil değer</div></div>
          <div className="basamak"><div className="soluk">Hızlı satış fiyatı</div><b>{TL(f.hizliSatis)}</b><div className="soluk">Kısa sürede satış için</div></div>
          <div className="basamak"><div className="soluk">Pazarlık alt sınırı</div><b>{TL(f.altSinir)}</b><div className="soluk">Bunun altına inmeyin</div></div>
        </div>
        <div className="oneriler" style={{ marginTop: 14 }}>
          <div>
            <div className="soluk">Satıcının beklediği fiyat</div><b>{TL(f.beklenti)}</b>
            <div><span className={`rozet ${konumSinifi}`}>{f.konum}</span> <span className="soluk">({f.beklentiFarki >= 0 ? "+" : "−"}%{Math.abs(Math.round(f.beklentiFarki * 100))})</span></div>
          </div>
          <div><div className="soluk">Tahmini aralık</div><b>{TL(s.alt)} – {TL(s.ust)}</b><div className="soluk">Yöntemler arası farka göre</div></div>
          <div><div className="soluk">Yatırımcıya kira değeri</div><b>{TL(s.kiraTahmini)}/ay</b><div className="soluk">Brüt getiri %{s.brutGetiri.toLocaleString("tr-TR")}</div></div>
        </div>
        <HesapOzeti s={s} />
      </section>

      <div className="izgara">
        <section className="kart">
          <h2>Değeri artıran ve düşüren özellikler</h2>
          <h3 style={{ margin: "0 0 6px" }}>İlanda öne çıkarın</h3>
          {f.arttiranlar.length ? (
            <ul className="nedenler">{f.arttiranlar.map((x, i) => <li key={i}><span>{x.metin}</span><span className="arti">+{x.oran}%</span></li>)}</ul>
          ) : <p className="soluk">Belirgin artı özellik yok.</p>}
          <h3 style={{ margin: "12px 0 6px" }}>Alıcının itiraz edebileceği noktalar</h3>
          {f.dusurenler.length ? (
            <ul className="nedenler">{f.dusurenler.map((x, i) => <li key={i}><span>{x.metin}</span><span className="eksi">{x.oran}%</span></li>)}</ul>
          ) : <p className="soluk">Belirgin eksi özellik yok.</p>}
        </section>
        <section className="kart">
          <h2>Değeri artırmak için</h2>
          {f.iyilestirmeler.length ? (
            <ul className="tavsiye-liste">
              {f.iyilestirmeler.map((x) => (
                <li key={x.baslik} className="t-olumlu"><span /><span><b>{x.baslik}</b> — tahmini değer artışı <b>{TL(x.artis)}</b>. <span className="soluk">{x.aciklama}</span></span></li>
              ))}
            </ul>
          ) : <p className="soluk" style={{ marginTop: 0 }}>Modelde değeri belirgin artıracak kolay bir iyileştirme görünmüyor.</p>}
          <p className="soluk" style={{ fontSize: 12 }}>Artışlar aynı değerleme modelinin ilgili özellik değiştirilerek yeniden çalıştırılmasıyla bulunur; iyileştirmenin maliyeti dahil değildir.</p>
          <h3 style={{ margin: "12px 0 6px" }}>Hedef alıcı kitlesi</h3>
          <ul className="tavsiye-liste">{f.hedefKitle.map((x, i) => <li key={i} className="t-bilgi"><span /><span>{x}</span></li>)}</ul>
        </section>
      </div>

      <section className="kart">
        <h2>Satış stratejisi</h2>
        <ul className="tavsiye-liste">{f.tavsiyeler.map((t, i) => <li key={i} className={`t-${t.tur}`}><span /><span>{t.metin}</span></li>)}</ul>
      </section>
    </>
  );
}

export function Yontemler({ e, s, satici }: { e: EvBilgisi; s: EvSonuc; satici?: boolean }) {
  const enBuyuk = Math.max(e.istenenFiyat, ...s.yontemler.map((y) => y.deger));
  const fiyatAdi = satici ? "Satıcının beklediği fiyat" : "İstenen fiyat";
  return (
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
            {y.agirlik > 0 && <div className="soluk" style={{ fontSize: 12 }}>Adil değere katkısı: {TL(y.deger * y.agirlik)} · {fiyatAdi.toLocaleLowerCase("tr")}a göre {y.deger >= e.istenenFiyat ? "%" + Math.round((y.deger / e.istenenFiyat - 1) * 100) + " yüksek" : "%" + Math.round((1 - y.deger / e.istenenFiyat) * 100) + " düşük"}</div>}
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
          <div className="yontem-ust"><span><b>{fiyatAdi}</b></span><b>{TL(e.istenenFiyat)}</b></div>
          <div className="cubuk istenen"><div style={{ width: `${(e.istenenFiyat / enBuyuk) * 100}%` }} /></div>
        </div>
      </div>
      <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>Adil değer, emsal (%60), gelir (%25) ve maliyet (%15) yöntemlerinin ağırlıklı ortalamasıdır. Emsal en yüksek ağırlığı alır çünkü alıcıların ödediği fiyatı en doğrudan yansıtır; maliyet yöntemi değerli semtlerde piyasa değerinin altında kalır, bu normaldir.</p>
    </section>
  );
}

export function AliciTavsiyeler({ s }: { s: EvSonuc }) {
  return (
    <section className="kart">
      <h2>Tavsiyeler</h2>
      {GRUPLAR.map((grup) => {
        const liste = s.tavsiyeler.filter((t) => t.grup === grup);
        if (!liste.length) return null;
        return (
          <div key={grup} style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>{grup}</h3>
            <ul className="tavsiye-liste">{liste.map((t, i) => <li key={i} className={`t-${t.tur}`}><span /><span>{t.metin}</span></li>)}</ul>
          </div>
        );
      })}
    </section>
  );
}

export function Etkenler({ s, children }: { s: EvSonuc; children?: React.ReactNode }) {
  return (
    <section className="kart">
      <h2>Fiyata etki eden özellikler</h2>
      <ul className="nedenler">
        {s.etkenler.map((x, i) => <li key={i}><span>{x.metin}</span><span className={x.oran >= 0 ? "arti" : "eksi"}>{x.oran >= 0 ? "+" : ""}{x.oran}%</span></li>)}
      </ul>
      <p className="soluk" style={{ fontSize: 12 }}>Özelliklerin toplam etkisi −%45 ile +%60 arasında sınırlandırılır.</p>
      {children}
    </section>
  );
}
