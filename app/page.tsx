"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { iller as ilListesi } from "../lib/iller-meta";
import { ornekArsalar, ilceKonumu, mahalleKonumu, mahalleler, kamuMu, IMAR_FONKSIYONLARI, PROJE_TURLERI, TAPU_DURUMLARI, type Arsa, type ImarFonksiyonu, type TapuDurumu } from "../lib/arsa";
import { degerlendir, fiyatBandi, bolgeTavsiyeleri, arsaKarari, butceOnerileri } from "../lib/puan";
import { konutPiyasasi } from "../lib/konut";
import MahalleEvFiyatlari from "../components/MahalleEvFiyatlari";

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
  const [mahalle, setMahalle] = useState("");
  const [tapuFiltre, setTapuFiltre] = useState<"" | "kamu" | "ozel">("");
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
    const ornek = mahalle
      ? ornekArsalar(ilKod, ilce, 9, mahalle)
      : ilce ? ornekArsalar(ilKod, ilce, 9) : il.ilceler.flatMap((x) => ornekArsalar(ilKod, x, 3));
    const kendi = manuel.filter((a) => a.il === ilKod && (!ilce || a.ilce === ilce) && (!mahalle || a.mahalle === mahalle));
    return [...kendi, ...ornek].filter((a) => {
      if (!tapuFiltre) return true;
      const kamu = !!a.tapu && kamuMu(a.tapu);
      return tapuFiltre === "kamu" ? kamu : !kamu;
    });
  }, [ilKod, ilce, mahalle, tapuFiltre, il, manuel]);

  const degerler = useMemo(() => Object.fromEntries(arsalar.map((a) => [a.id, degerlendir(a)])), [arsalar]);
  const puanlar = useMemo(() => Object.fromEntries(arsalar.map((a) => [a.id, degerler[a.id].puan])), [arsalar, degerler]);
  const sirali = useMemo(() => [...arsalar].sort((p, q) => puanlar[q.id] - puanlar[p.id]), [arsalar, puanlar]);
  const butceler = useMemo(() => butceOnerileri(ilKod, arsalar), [ilKod, arsalar]);
  const tavsiyeler = useMemo(() => bolgeTavsiyeleri(ilKod, arsalar), [ilKod, arsalar]);
  const konut = useMemo(() => konutPiyasasi(ilKod, ilce || undefined, mahalle || undefined), [ilKod, ilce, mahalle]);

  // Öneri başka bir ilçe/ilden geliyorsa önce oraya geçip arsayı seçer.
  const arsayaGit = (a: Arsa) => {
    if (!arsalar.some((x) => x.id === a.id)) {
      setIlKod(a.il);
      setIlce(a.ilce);
      setMahalle("");
      setTapuFiltre("");
    }
    setSeciliId(a.id);
    document.getElementById("detay")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const secili = arsalar.find((a) => a.id === seciliId);
  const seciliD = secili && degerler[secili.id];
  const karar = secili && arsaKarari(secili);
  const yer = [mahalle, ilce, il.ad].filter(Boolean).join(", ");
  const ortPuan = arsalar.length ? Math.round(arsalar.reduce((t, a) => t + puanlar[a.id], 0) / arsalar.length) : 0;

  return (
    <>
      <header>
        <h1>Arsa Analiz</h1>
        <p>İl, ilçe ve mahalle seçin: arsaların imar ve tapu durumu, tahmini değeri, değerlenme puanı ve konut fiyatları.</p>
      </header>
      <main>
        <div className="uyari">
          ⚠️ Nüfus verileri TÜİK, İstanbul/Ankara/İzmir konut fiyatları TCMB kaynaklıdır; <b>arsalar ve tapu durumları örnek (demo) veridir</b>, diğer fiyatlar tahminidir. Puanlama kural tabanlıdır ve <b>yatırım tavsiyesi değildir</b>. Alım
          öncesinde belediyeden resmi imar durum belgesi, tapu müdürlüğünden güncel tapu kaydı alın ve lisanslı bir uzmana danışın.
        </div>

        <section className="kart secim">
          <label>
            İl
            <select value={ilKod} onChange={(e) => { setIlKod(e.target.value); setIlce(""); setMahalle(""); setSeciliId(undefined); }}>
              {iller.map((i) => <option key={i.kod} value={i.kod}>{i.kod} - {i.ad}</option>)}
            </select>
          </label>
          <label>
            İlçe
            <select value={ilce} onChange={(e) => { setIlce(e.target.value); setMahalle(""); setSeciliId(undefined); }}>
              <option value="">Tüm ilçeler</option>
              {il.ilceler.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>
            Mahalle
            <select value={mahalle} disabled={!ilce} onChange={(e) => { setMahalle(e.target.value); setSeciliId(undefined); }}>
              <option value="">{ilce ? "Tüm mahalleler" : "Önce ilçe seçin"}</option>
              {ilce && mahalleler(ilKod, ilce).map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>
            Tapu durumu
            <select value={tapuFiltre} onChange={(e) => { setTapuFiltre(e.target.value as typeof tapuFiltre); setSeciliId(undefined); }}>
              <option value="">Tümü</option>
              <option value="kamu">Kamuya ait (Hazine/belediye/vakıf)</option>
              <option value="ozel">Özel mülk</option>
            </select>
          </label>
          <div className="soluk">
            {arsalar.length} arsa · ortalama puan <b>{ortPuan}</b>
          </div>
        </section>

        <section className="kart">
          <h2>💰 Bütçenize göre en iyi arsalar</h2>
          <p className="soluk" style={{ marginTop: 0 }}>Her bütçe için gelecek potansiyeli en yüksek arsalar. Seçili yerde uygun arsa yoksa ilin diğer ilçelerinden, orada da yoksa yakın illerden önerilir.</p>
          <div className="butceler">
            {butceler.map(({ butce, kapsam, oneriler }) => (
              <div key={butce.ad} className="butce">
                <h3>{butce.ad}</h3>
                {(kapsam === "yakin" || (kapsam === "il" && ilce)) && oneriler.length > 0 && (
                  <div className="soluk" style={{ fontSize: 12, marginBottom: 6 }}>
                    {kapsam === "il" ? `${yer} içinde yok — ${il.ad} genelinden` : `${il.ad} içinde yok — yakın illerden`}
                  </div>
                )}
                {oneriler.length === 0 && <div className="soluk">Bu bütçede uygun arsa bulunamadı.</div>}
                {oneriler.map(({ arsa, d, k }) => (
                  <div key={arsa.id} className="oneri" onClick={() => arsayaGit(arsa)}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <b>{TL(arsa.alan * arsa.fiyatM2)}</b>
                      <span className={`rozet ${puanSinifi(d.puan)}`}>{d.puan} puan</span>
                    </div>
                    <div style={{ fontSize: 13, margin: "2px 0" }}>
                      {[arsa.mahalle, arsa.ilce, arsa.il !== ilKod ? iller.find((i) => i.kod === arsa.il)?.ad : ""].filter(Boolean).join(", ")}
                    </div>
                    <div className="soluk" style={{ fontSize: 12 }}>
                      {arsa.imar} · {arsa.alan.toLocaleString("tr-TR")} m² · {arsa.tapu ?? "Özel mülk"}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      <span className={`rozet ${k.fiyatKarari === "Fiyatı uygun" ? "p-yuksek" : k.fiyatKarari === "Pahalı" ? "p-dusuk" : "p-orta"}`}>{k.fiyatKarari}</span>
                      <span className={`rozet ${k.gelecek === "Gelecek için alınır" ? "p-yuksek" : k.gelecek === "Gelecek için zayıf" ? "p-dusuk" : "p-orta"}`}>{k.gelecek}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="kart">
          <h2>🏠 Konut piyasası — {yer}</h2>
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

        <MahalleEvFiyatlari ilKod={ilKod} ilce={ilce} mahalle={mahalle} yer={yer} />

        <div className="izgara">
          <section className="kart">
            <Harita arsalar={arsalar} puanlar={puanlar} seciliId={seciliId} sec={setSeciliId} />
          </section>
          <section className="kart" id="detay">
            {secili && seciliD ? (
              <>
                <h2>{secili.mahalle ? `${secili.mahalle}, ` : ""}{secili.ilce} · Ada {secili.ada} / Parsel {secili.parsel} {secili.manuel && <span className="rozet f-Orta">Sizin kaydınız</span>}</h2>
                {karar && (
                  <div className="karar">
                    <div className="soluk">Bu arsa ne kadar eder?</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{TL(karar.tahmini)}</div>
                    <div className="soluk">Tahmini aralık {TL(karar.alt)} – {TL(karar.ust)}</div>
                    <div style={{ margin: "8px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className={`rozet ${karar.fiyatKarari === "Fiyatı uygun" ? "p-yuksek" : karar.fiyatKarari === "Pahalı" ? "p-dusuk" : "p-orta"}`}>
                        Bu fiyata: {karar.fiyatKarari} ({karar.fark > 0 ? "%" + Math.round(karar.fark * 100) + " pahalı" : "%" + Math.round(-karar.fark * 100) + " ucuz"})
                      </span>
                      <span className={`rozet ${karar.gelecek === "Gelecek için alınır" ? "p-yuksek" : karar.gelecek === "Gelecek için zayıf" ? "p-dusuk" : "p-orta"}`}>{karar.gelecek}</span>
                    </div>
                    <div style={{ fontSize: 14 }}><b>{karar.ozet}</b> {karar.fark > 0 && <>Pazarlık hedefi: <b>{TL(karar.hedefFiyat)}</b>.</>}</div>
                  </div>
                )}
                <span className={`rozet ${puanSinifi(seciliD.puan)}`}>{seciliD.puan}/100 · {seciliD.etiket}</span>{" "}
                <span className={`rozet f-${fiyatBandi(secili, arsalar)}`}>{fiyatBandi(secili, arsalar)} fiyat</span>
                <p className="soluk">
                  {secili.alan.toLocaleString("tr-TR")} m² · {secili.imar} · Emsal {secili.emsal} · {TL(secili.fiyatM2)}/m² · Toplam {TL(secili.alan * secili.fiyatM2)}
                  {secili.hisseli && " · Hisseli"}{!secili.yolCephesi && " · Yola cephesi yok"}
                </p>
                <div className="oneriler" style={{ marginBottom: 8 }}>
                  <div><div className="soluk">Tapu durumu</div><b>{secili.tapu ?? "Belirtilmedi"}</b></div>
                  <div><div className="soluk">{secili.tapu && kamuMu(secili.tapu) ? "Tahmini muhammen bedel" : "İstenen fiyat"}</div><b>{TL(secili.alan * secili.fiyatM2)}</b></div>
                  {secili.tahminiM2 && <div><div className="soluk">Tahmini piyasa değeri</div><b>{TL(secili.alan * secili.tahminiM2)}</b><div className="soluk">{TL(secili.tahminiM2)}/m²</div></div>}
                </div>
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
                    <thead><tr><th>{ilce ? "Mahalle" : "İlçe"}</th><th>Ada/Parsel</th><th>İmar</th><th>Tapu</th><th>m²</th><th>Fiyat</th><th>Puan</th></tr></thead>
                    <tbody>
                      {sirali.map((a) => (
                        <tr key={a.id} onClick={() => setSeciliId(a.id)}>
                          <td>{ilce ? a.mahalle ?? "—" : a.ilce}</td>
                          <td>{a.ada}/{a.parsel}</td>
                          <td>{a.imar}</td>
                          <td>{a.tapu && kamuMu(a.tapu) ? <span className="rozet r-Orta">{a.tapu.split(" ")[0]}</span> : a.tapu ?? "—"}</td>
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
          <h2>🔭 İlerisi için tavsiyeler — {yer}</h2>
          <ol className="tavsiye">{tavsiyeler.map((t, i) => <li key={i}>{t}</li>)}</ol>
        </section>

        <ArsaEkle ilKod={ilKod} ilceler={il.ilceler} varsayilanIlce={ilce} varsayilanMahalle={mahalle} ekle={(a) => { manuelKaydet([...manuel, a]); setSeciliId(a.id); }} />
      </main>
    </>
  );
}

function ArsaEkle({ ilKod, ilceler, varsayilanIlce, varsayilanMahalle, ekle }: { ilKod: string; ilceler: string[]; varsayilanIlce: string; varsayilanMahalle: string; ekle: (a: Arsa) => void }) {
  const bos = { ilce: "", mahalle: "", tapu: "Özel mülk" as TapuDurumu, ada: "", parsel: "", alan: "", imar: "Konut" as ImarFonksiyonu, emsal: "1", fiyatM2: "", merkezKm: "5", yolCephesi: true, hisseli: false, projeler: [] as string[] };
  const [f, setF] = useState(bos);
  const ilce = f.ilce || varsayilanIlce || ilceler[0];
  const mahListe = mahalleler(ilKod, ilce);
  const mahalle = f.mahalle || (mahListe.includes(varsayilanMahalle) ? varsayilanMahalle : "");

  const gonder = (e: React.FormEvent) => {
    e.preventDefault();
    const k = mahalle ? mahalleKonumu(ilKod, ilce, mahalle) : ilceKonumu(ilKod, ilce);
    ekle({
      id: `m-${Date.now()}`,
      il: ilKod,
      ilce,
      mahalle: mahalle || undefined,
      tapu: f.tapu,
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
      <h2>🔎 Bu arsa ne kadar eder? Kendi arsanızı girin</h2>
      <p className="soluk">Ada/parseli <a href="https://parselsorgu.tkgm.gov.tr" target="_blank" rel="noreferrer">TKGM Parsel Sorgu</a>'dan, imar ve emsal bilgisini belediyenin e-İmar sisteminden alabilirsiniz. Kayıtlar yalnızca bu tarayıcıda saklanır.</p>
      <form className="form" onSubmit={gonder}>
        <label>İlçe<select value={ilce} onChange={(e) => setF({ ...f, ilce: e.target.value, mahalle: "" })}>{ilceler.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Mahalle<select value={mahalle} onChange={(e) => setF({ ...f, mahalle: e.target.value })}><option value="">Belirtilmedi</option>{mahListe.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Tapu durumu<select value={f.tapu} onChange={(e) => setF({ ...f, tapu: e.target.value as TapuDurumu })}>{TAPU_DURUMLARI.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Ada<input required value={f.ada} onChange={(e) => setF({ ...f, ada: e.target.value })} /></label>
        <label>Parsel<input required value={f.parsel} onChange={(e) => setF({ ...f, parsel: e.target.value })} /></label>
        <label>Alan (m²)<input required type="number" min={1} value={f.alan} onChange={(e) => setF({ ...f, alan: e.target.value })} /></label>
        <label>İmar<select value={f.imar} onChange={(e) => setF({ ...f, imar: e.target.value as ImarFonksiyonu })}>{IMAR_FONKSIYONLARI.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Emsal (KAKS)<input required type="number" step="0.05" min={0} value={f.emsal} onChange={(e) => setF({ ...f, emsal: e.target.value })} /></label>
        <label>İstenen m² fiyatı (₺)<input required type="number" min={1} value={f.fiyatM2} onChange={(e) => setF({ ...f, fiyatM2: e.target.value })} /></label>
        <label>Merkeze uzaklık (km)<input required type="number" step="0.1" min={0} value={f.merkezKm} onChange={(e) => setF({ ...f, merkezKm: e.target.value })} /></label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.yolCephesi} onChange={(e) => setF({ ...f, yolCephesi: e.target.checked })} /> Yola cephe</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={f.hisseli} onChange={(e) => setF({ ...f, hisseli: e.target.checked })} /> Hisseli</label>
        <label>Yakın projeler<select multiple value={f.projeler} onChange={(e) => setF({ ...f, projeler: Array.from(e.target.selectedOptions, (o) => o.value) })} style={{ height: 80 }}>{PROJE_TURLERI.map((x) => <option key={x}>{x}</option>)}</select></label>
        <button type="submit">Değerle ve karar ver</button>
      </form>
    </section>
  );
}
