"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { iller as ilListesi } from "../lib/iller-meta";
import { ornekArsalar, ilceKonumu, IMAR_FONKSIYONLARI, PROJE_TURLERI, type Arsa, type ImarFonksiyonu } from "../lib/arsa";
import { degerlendir, fiyatBandi, enIyiOneriler, bolgeTavsiyeleri } from "../lib/puan";
import { konutPiyasasi } from "../lib/konut";

const Harita = dynamic(() => import("../components/Harita"), { ssr: false, loading: () => <div className="harita" /> });

const TL = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
const SAKLAMA = "arsa-analiz:manuel";

function puanSinifi(p: number) {
  return p >= 65 ? "p-yuksek" : p >= 40 ? "p-orta" : "p-dusuk";
}

export default function Sayfa() {
  const iller = ilListesi();
  const [ilKod, setIlKod] = useState("34");
  const [ilce, setIlce] = useState("");
  const [manuel, setManuel] = useState<Arsa[]>([]);
  const [seciliId, setSeciliId] = useState<string>();

  useEffect(() => {
    try {
      setManuel(JSON.parse(localStorage.getItem(SAKLAMA) ?? "[]"));
    } catch {}
  }, []);
  const manuelKaydet = (liste: Arsa[]) => {
    setManuel(liste);
    try {
      localStorage.setItem(SAKLAMA, JSON.stringify(liste));
    } catch {}
  };

  const il = iller.find((i) => i.kod === ilKod)!;

  const arsalar = useMemo(() => {
    const ornek = ilce ? ornekArsalar(ilKod, ilce, 9) : il.ilceler.flatMap((x) => ornekArsalar(ilKod, x, 3));
    const kendi = manuel.filter((a) => a.il === ilKod && (!ilce || a.ilce === ilce));
    return [...kendi, ...ornek];
  }, [ilKod, ilce, il, manuel]);

  const degerler = useMemo(() => Object.fromEntries(arsalar.map((a) => [a.id, degerlendir(a)])), [arsalar]);
  const puanlar = useMemo(() => Object.fromEntries(arsalar.map((a) => [a.id, degerler[a.id].puan])), [arsalar, degerler]);
  const sirali = useMemo(() => [...arsalar].sort((p, q) => puanlar[q.id] - puanlar[p.id]), [arsalar, puanlar]);
  const oneriler = useMemo(() => enIyiOneriler(arsalar), [arsalar]);
  const tavsiyeler = useMemo(() => bolgeTavsiyeleri(ilKod, arsalar), [ilKod, arsalar]);
  const konut = useMemo(() => konutPiyasasi(ilKod, ilce || undefined), [ilKod, ilce]);

  const secili = arsalar.find((a) => a.id === seciliId);
  const seciliD = secili && degerler[secili.id];
  const ortPuan = arsalar.length ? Math.round(arsalar.reduce((t, a) => t + puanlar[a.id], 0) / arsalar.length) : 0;

  return (
    <>
      <header>
        <h1>Arsa Analiz</h1>
        <p>İl veya ilçe seçin: arsaların imar durumu, değerlenme puanı, fiyat bandı ve konut piyasası.</p>
      </header>
      <main>
        <div className="uyari">
          ⚠️ Nüfus verileri TÜİK, İstanbul/Ankara/İzmir konut fiyatları TCMB kaynaklıdır; <b>arsa ilanları örnek (demo) veridir</b>, diğer fiyatlar tahminidir. Puanlama kural tabanlıdır ve <b>yatırım tavsiyesi değildir</b>. Alım
          öncesinde belediyeden resmi imar durum belgesi, tapu müdürlüğünden güncel tapu kaydı alın ve lisanslı bir uzmana danışın.
        </div>

        <section className="kart secim">
          <label>
            İl
            <select value={ilKod} onChange={(e) => { setIlKod(e.target.value); setIlce(""); setSeciliId(undefined); }}>
              {iller.map((i) => <option key={i.kod} value={i.kod}>{i.kod} - {i.ad}</option>)}
            </select>
          </label>
          <label>
            İlçe
            <select value={ilce} onChange={(e) => { setIlce(e.target.value); setSeciliId(undefined); }}>
              <option value="">Tüm ilçeler</option>
              {il.ilceler.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <div className="soluk">
            {arsalar.length} arsa · ortalama puan <b>{ortPuan}</b>
          </div>
        </section>

        <section className="kart">
          <h2>🏆 Yatırıma en uygun arsalar (bütçeye göre)</h2>
          <div className="oneriler">
            {oneriler.map(({ bant, arsa, d }) => (
              <div key={bant} className="oneri" onClick={() => setSeciliId(arsa.id)}>
                <span className={`rozet f-${bant}`}>{bant} fiyat</span>{" "}
                <span className={`rozet ${puanSinifi(d.puan)}`}>{d.puan} puan</span>
                <h3 style={{ margin: "8px 0 4px", fontSize: 15 }}>{arsa.ilce} · Ada {arsa.ada}/{arsa.parsel}</h3>
                <div className="soluk">{arsa.imar} · {arsa.alan.toLocaleString("tr-TR")} m² · {TL(arsa.fiyatM2)}/m²</div>
                <div style={{ fontWeight: 600, margin: "4px 0" }}>Toplam ≈ {TL(arsa.alan * arsa.fiyatM2)}</div>
                <div style={{ fontSize: 13 }}>{d.oneri}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="kart">
          <h2>🏠 Konut piyasası — {ilce || il.ad}</h2>
          <div className="oneriler">
            <div><div className="soluk">Satılık konut</div><b>{TL(konut.satisM2)} / m²</b></div>
            <div><div className="soluk">Kira</div><b>{TL(konut.kiraM2)} / m² / ay</b></div>
            <div><div className="soluk">Brüt kira getirisi</div><b>%{konut.brutGetiri.toLocaleString("tr-TR")} / yıl</b></div>
            <div><div className="soluk">Amortisman</div><b>{konut.amortismanYil.toLocaleString("tr-TR")} yıl</b></div>
          </div>
          <p className="soluk" style={{ marginBottom: 4 }}>
            Örnek {konut.ornekDaire.m2} m² daire: satış ≈ {TL(konut.ornekDaire.fiyat)}, kira ≈ {TL(konut.ornekDaire.kira)}/ay
          </p>
          <p style={{ margin: 0, fontSize: 14 }}>{konut.yorum}</p>
          <p className="soluk" style={{ marginBottom: 0 }}>
            Kaynak: {konut.kaynak} · {il.ad} nüfusu {il.nufus.toLocaleString("tr-TR")} (TÜİK 2025), yıllık ort. artış ‰{il.buyume.toLocaleString("tr-TR")}
          </p>
        </section>

        <div className="izgara">
          <section className="kart">
            <Harita arsalar={arsalar} puanlar={puanlar} seciliId={seciliId} sec={setSeciliId} />
          </section>
          <section className="kart">
            {secili && seciliD ? (
              <>
                <h2>{secili.ilce} · Ada {secili.ada} / Parsel {secili.parsel} {secili.manuel && <span className="rozet f-Orta">Sizin kaydınız</span>}</h2>
                <span className={`rozet ${puanSinifi(seciliD.puan)}`}>{seciliD.puan}/100 · {seciliD.etiket}</span>{" "}
                <span className={`rozet f-${fiyatBandi(secili, arsalar)}`}>{fiyatBandi(secili, arsalar)} fiyat</span>
                <p className="soluk">
                  {secili.alan.toLocaleString("tr-TR")} m² · {secili.imar} · Emsal {secili.emsal} · {TL(secili.fiyatM2)}/m² · Toplam {TL(secili.alan * secili.fiyatM2)}
                  {secili.hisseli && " · Hisseli"}{!secili.yolCephesi && " · Yola cephesi yok"}
                </p>
                <ul className="nedenler">
                  {seciliD.nedenler.map((n, i) => (
                    <li key={i}><span>{n.metin}</span><span className={n.etki >= 0 ? "arti" : "eksi"}>{n.etki >= 0 ? "+" : ""}{n.etki}</span></li>
                  ))}
                </ul>
                <p style={{ fontSize: 14 }}><b>Öneri:</b> {seciliD.oneri}</p>
                {secili.manuel && (
                  <button className="ikincil" onClick={() => { manuelKaydet(manuel.filter((a) => a.id !== secili.id)); setSeciliId(undefined); }}>Kaydı sil</button>
                )}
                <p><button className="ikincil" onClick={() => setSeciliId(undefined)}>← Listeye dön</button></p>
              </>
            ) : (
              <>
                <h2>Arsalar (puana göre)</h2>
                <div className="tablo-kap">
                  <table>
                    <thead><tr><th>İlçe</th><th>Ada/Parsel</th><th>İmar</th><th>m²</th><th>Fiyat</th><th>Puan</th></tr></thead>
                    <tbody>
                      {sirali.map((a) => (
                        <tr key={a.id} onClick={() => setSeciliId(a.id)}>
                          <td>{a.ilce}</td>
                          <td>{a.ada}/{a.parsel}</td>
                          <td>{a.imar}</td>
                          <td>{a.alan.toLocaleString("tr-TR")}</td>
                          <td><span className={`rozet f-${fiyatBandi(a, arsalar)}`}>{fiyatBandi(a, arsalar)}</span></td>
                          <td><span className={`rozet ${puanSinifi(puanlar[a.id])}`}>{puanlar[a.id]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        <section className="kart">
          <h2>🔭 İlerisi için tavsiyeler — {ilce ? `${ilce}, ` : ""}{il.ad}</h2>
          <ol className="tavsiye">{tavsiyeler.map((t, i) => <li key={i}>{t}</li>)}</ol>
        </section>

        <ArsaEkle ilKod={ilKod} ilceler={il.ilceler} varsayilanIlce={ilce} ekle={(a) => { manuelKaydet([...manuel, a]); setSeciliId(a.id); }} />
      </main>
    </>
  );
}

function ArsaEkle({ ilKod, ilceler, varsayilanIlce, ekle }: { ilKod: string; ilceler: string[]; varsayilanIlce: string; ekle: (a: Arsa) => void }) {
  const bos = { ilce: "", ada: "", parsel: "", alan: "", imar: "Konut" as ImarFonksiyonu, emsal: "1", fiyatM2: "", merkezKm: "5", yolCephesi: true, hisseli: false, projeler: [] as string[] };
  const [f, setF] = useState(bos);
  const ilce = f.ilce || varsayilanIlce || ilceler[0];

  const gonder = (e: React.FormEvent) => {
    e.preventDefault();
    const k = ilceKonumu(ilKod, ilce);
    ekle({
      id: `m-${Date.now()}`,
      il: ilKod,
      ilce,
      ada: f.ada,
      parsel: f.parsel,
      alan: Number(f.alan),
      imar: f.imar,
      emsal: Number(f.emsal),
      fiyatM2: Number(f.fiyatM2),
      merkezKm: Number(f.merkezKm),
      yolCephesi: f.yolCephesi,
      hisseli: f.hisseli,
      projeler: f.projeler,
      lat: k.lat + (Math.random() - 0.5) * 0.05,
      lng: k.lng + (Math.random() - 0.5) * 0.05,
      manuel: true,
    });
    setF(bos);
  };

  return (
    <section className="kart">
      <h2>➕ Kendi arsanızı ekleyin</h2>
      <p className="soluk">Ada/parseli <a href="https://parselsorgu.tkgm.gov.tr" target="_blank" rel="noreferrer">TKGM Parsel Sorgu</a>'dan, imar ve emsal bilgisini belediyenin e-İmar sisteminden alabilirsiniz. Kayıtlar yalnızca bu tarayıcıda saklanır.</p>
      <form className="form" onSubmit={gonder}>
        <label>İlçe<select value={ilce} onChange={(e) => setF({ ...f, ilce: e.target.value })}>{ilceler.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Ada<input required value={f.ada} onChange={(e) => setF({ ...f, ada: e.target.value })} /></label>
        <label>Parsel<input required value={f.parsel} onChange={(e) => setF({ ...f, parsel: e.target.value })} /></label>
        <label>Alan (m²)<input required type="number" min={1} value={f.alan} onChange={(e) => setF({ ...f, alan: e.target.value })} /></label>
        <label>İmar<select value={f.imar} onChange={(e) => setF({ ...f, imar: e.target.value as ImarFonksiyonu })}>{IMAR_FONKSIYONLARI.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Emsal (KAKS)<input required type="number" step="0.05" min={0} value={f.emsal} onChange={(e) => setF({ ...f, emsal: e.target.value })} /></label>
        <label>m² fiyatı (₺)<input required type="number" min={1} value={f.fiyatM2} onChange={(e) => setF({ ...f, fiyatM2: e.target.value })} /></label>
        <label>Merkeze uzaklık (km)<input required type="number" step="0.1" min={0} value={f.merkezKm} onChange={(e) => setF({ ...f, merkezKm: e.target.value })} /></label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.yolCephesi} onChange={(e) => setF({ ...f, yolCephesi: e.target.checked })} /> Yola cephe</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.hisseli} onChange={(e) => setF({ ...f, hisseli: e.target.checked })} /> Hisseli</label>
        <label>Yakın projeler<select multiple value={f.projeler} onChange={(e) => setF({ ...f, projeler: Array.from(e.target.selectedOptions, (o) => o.value) })} style={{ height: 80 }}>{PROJE_TURLERI.map((x) => <option key={x}>{x}</option>)}</select></label>
        <button type="submit">Ekle ve puanla</button>
      </form>
    </section>
  );
}
