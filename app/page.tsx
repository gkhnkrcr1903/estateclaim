"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { iller as ilListesi } from "../lib/iller-meta";
import { ilceKonumu, mahalleKonumu, mahalleler, kamuMu, KAMU_EDINIM, IMAR_FONKSIYONLARI, PROJE_TURLERI, TAPU_DURUMLARI, type Arsa, type ImarFonksiyonu, type TapuDurumu } from "../lib/arsa";
import { degerlendir, bolgeTavsiyeleri, arsaKarari, TAVSIYE_GRUPLARI } from "../lib/puan";
import { kontrolListesi } from "../lib/dogrulama";
import { useProfil } from "../lib/oturum";
import SayiKutusu from "../components/SayiKutusu";
import { konutPiyasasi } from "../lib/konut";
import MahalleEvFiyatlari from "../components/MahalleEvFiyatlari";
import { IlGenelBilgi, EnDegerliSemtler } from "../components/BolgeOzeti";
import PdfKaydet from "../components/PdfKaydet";
import Yetki from "../components/Yetki";
import BolgeProfiliBolumu from "../components/BolgeProfili";

const Harita = dynamic(() => import("../components/Harita"), { ssr: false, loading: () => <div className="harita" /> });

const TL = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
const SAKLAMA = "arsa-analiz:arsalarim";

function puanSinifi(p: number) {
  return p >= 65 ? "p-yuksek" : p >= 40 ? "p-orta" : "p-dusuk";
}

// Sayfa yalnızca "arsa" yetkisi olan kullanıcıya açılır.
export default function Sayfa() {
  return (
    <Yetki gerekli="arsa">
      <ArsaSayfasi />
    </Yetki>
  );
}

function ArsaSayfasi() {
  const iller = ilListesi();
  const [ilKod, setIlKod] = useState("34");
  const [ilce, setIlce] = useState("");
  const [mahalle, setMahalle] = useState("");
  const [manuel, setManuel] = useState<Arsa[]>([]);
  const [seciliId, setSeciliId] = useState<string>();
  const profil = useProfil();
  const anahtar = `${SAKLAMA}:${profil?.id ?? "anonim"}`;

  useEffect(() => {
    try {
      setManuel(JSON.parse(localStorage.getItem(anahtar) ?? "[]"));
    } catch {}
  }, [anahtar]);
  const manuelKaydet = (liste: Arsa[]) => {
    setManuel(liste);
    try {
      localStorage.setItem(anahtar, JSON.stringify(liste));
    } catch {}
  };
  const arsaGuncelle = (id: string, degisim: Partial<Arsa>) => manuelKaydet(manuel.map((a) => (a.id === id ? { ...a, ...degisim } : a)));

  const il = iller.find((i) => i.kod === ilKod)!;

  // Yalnızca kullanıcının kendi girdiği arsalar listelenir (örnek/uydurma ilan gösterilmez).
  const arsalar = useMemo(
    () => manuel.filter((a) => a.il === ilKod && (!ilce || a.ilce === ilce) && (!mahalle || a.mahalle === mahalle)),
    [ilKod, ilce, mahalle, manuel],
  );

  const degerler = useMemo(() => Object.fromEntries(arsalar.map((a) => [a.id, degerlendir(a)])), [arsalar]);
  const puanlar = useMemo(() => Object.fromEntries(arsalar.map((a) => [a.id, degerler[a.id].puan])), [arsalar, degerler]);
  const sirali = useMemo(() => [...arsalar].sort((p, q) => puanlar[q.id] - puanlar[p.id]), [arsalar, puanlar]);
  const tavsiyeler = useMemo(() => bolgeTavsiyeleri(ilKod, arsalar, ilce || undefined), [ilKod, arsalar, ilce]);
  const konut = useMemo(() => konutPiyasasi(ilKod, ilce || undefined, mahalle || undefined), [ilKod, ilce, mahalle]);

  const secili = arsalar.find((a) => a.id === seciliId);
  const seciliD = secili && degerler[secili.id];
  const karar = secili && arsaKarari(secili);
  const yer = [mahalle, ilce, il.ad].filter(Boolean).join(", ");
  const harita = mahalle ? mahalleKonumu(ilKod, ilce, mahalle) : ilce ? ilceKonumu(ilKod, ilce) : { lat: il.lat, lng: il.lng };

  return (
    <>
      <header className="baslik-satiri">
        <div>
          <h1>Arsa Analizi — {yer}</h1>
          <p>Bölgeyi seçin, değerlendirmek istediğiniz arsanın bilgilerini girin; bölge verileri, tahmini değer ve resmi doğrulama adımları birlikte gösterilir.</p>
        </div>
        <PdfKaydet dosyaAdi={`Arsa Analizi - ${yer}`} />
      </header>
      <main>
        <div className="uyari">
          ⚠️ <b>Arsa değerleri tahmindir, satın alma kararı için yeterli değildir.</b> Nüfus (TÜİK) ve İstanbul/Ankara/İzmir konut fiyatları (TCMB) resmîdir;
          arsa m² değeri bu verilerden türetilir. Kesin değer için lisanslı ekspertiz raporu, belediyeden imar durum belgesi ve güncel tapu kaydı gerekir;
          her arsada aşağıdaki doğrulama listesini tamamlayın. Puanlama kural tabanlıdır ve yatırım tavsiyesi değildir.
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
        </section>

        <nav className="bolum-gecis" aria-label="Sayfa bölümleri">
          <a href="#bolge">Bölge</a>
          <a href="#ev-fiyatlari">Ev fiyatları</a>
          <a href="#arsalarim">Arsalarım{manuel.length ? ` (${manuel.length})` : ""}</a>
          <a href="#arsa-ekle">Arsa ekle</a>
          <a href="#tavsiyeler">Tavsiyeler</a>
        </nav>

        <div id="bolge" className="capa" />
        <IlGenelBilgi ilKod={ilKod} />
        <BolgeProfiliBolumu ilKod={ilKod} ilce={ilce} ilAd={il.ad} />
        <EnDegerliSemtler ilKod={ilKod} ilce={ilce} ilAd={il.ad} />

        <section className="kart">
          <h2>Kamu arsaları (Milli Emlak ihaleleri)</h2>
          <p style={{ marginTop: 0 }}>
            Hazine'ye ait arsa ve araziler yalnızca ihaleyle satılır; ilanlar il, ilçe, mahalle, imar durumu, yüzölçümü ve tahmini bedelle Milli Emlak'ın resmi
            sitesinde yayımlanır. {il.ad} için güncel ilanları orada il seçerek görebilirsiniz.
          </p>
          <a className="dugme-baglanti" href="https://www.milliemlak.gov.tr/#/satis" target="_blank" rel="noreferrer">Milli Emlak satış ilanlarını aç ↗</a>
          <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>İlgilendiğiniz ilanın ada/parsel, alan ve muhammen bedelini aşağıdan "Tapu durumu: Hazine" seçerek ekleyip değerlendirebilirsiniz.</p>
        </section>

        <section className="kart">
          <h2>Konut piyasası — {yer}</h2>
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

        <div id="ev-fiyatlari" className="capa" />
        <MahalleEvFiyatlari ilKod={ilKod} ilce={ilce} mahalle={mahalle} yer={yer} />

        <div id="arsalarim" className="capa" />
        <div className="izgara">
          <section className="kart">
            <Harita arsalar={arsalar} puanlar={puanlar} seciliId={seciliId} sec={setSeciliId} merkez={harita} />
          </section>
          <section className="kart" id="detay">
            {secili && seciliD ? (
              <>
                <h2>{secili.mahalle ? `${secili.mahalle}, ` : ""}{secili.ilce} · Ada {secili.ada} / Parsel {secili.parsel} </h2>
                {karar && (
                  <div className="karar">
                    <div className="soluk">{karar.kaynak === "ekspertiz" ? "Ekspertiz değeri" : "Bölge tahmini (kesin değer değildir)"}</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{TL(karar.tahmini)}</div>
                    <div className="soluk">
                      Aralık {TL(karar.alt)} – {TL(karar.ust)}
                      {karar.kaynak === "ekspertiz" && <> · Bölge tahmini {TL(karar.bolgeTahmini)}</>}
                    </div>
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
                <p className="soluk">
                  {secili.alan.toLocaleString("tr-TR")} m² · {secili.imar} · Emsal {secili.emsal.toLocaleString("tr-TR")} · {TL(secili.fiyatM2)}/m² · Toplam {TL(secili.alan * secili.fiyatM2)}
                  {secili.hisseli && " · Hisseli"}{!secili.yolCephesi && " · Yola cephesi yok"}
                </p>
                <div className="oneriler" style={{ marginBottom: 8 }}>
                  <div><div className="soluk">Tapu durumu</div><b>{secili.tapu ?? "Belirtilmedi"}</b></div>
                  <div><div className="soluk">{secili.tapu && kamuMu(secili.tapu) ? "Tahmini muhammen bedel" : "İstenen fiyat"}</div><b>{TL(secili.alan * secili.fiyatM2)}</b></div>
                </div>
                {secili.tapu && kamuMu(secili.tapu) && <p className="soluk" style={{ fontSize: 13 }}>🏛️ {KAMU_EDINIM[secili.tapu as Exclude<TapuDurumu, "Özel mülk">]}</p>}
                <label style={{ maxWidth: 320, marginBottom: 12 }}>
                  Ekspertiz değeri (toplam ₺, rapordan)
                  <SayiKutusu min={0} step={10000} deger={secili.ekspertiz ?? 0} degistir={(n) => arsaGuncelle(secili.id, { ekspertiz: n > 0 ? n : undefined })} />
                </label>
                <Dogrulama a={secili} degistir={(kontroller) => arsaGuncelle(secili.id, { kontroller })} />
                <h3 style={{ margin: "14px 0 4px" }}>Potansiyel puanının nedenleri</h3>
                <ul className="nedenler">
                  {seciliD.nedenler.map((n, i) => (
                    <li key={i}><span>{n.metin}</span><span className={n.etki >= 0 ? "arti" : "eksi"}>{n.etki >= 0 ? "+" : ""}{n.etki}</span></li>
                  ))}
                </ul>
                <p style={{ fontSize: 14 }}><b>Öneri:</b> {seciliD.oneri}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="ikincil" onClick={() => setSeciliId(undefined)}>← Listeye dön</button>
                  <button className="ikincil" onClick={() => { if (confirm("Bu arsa kaydı silinsin mi?")) { manuelKaydet(manuel.filter((a) => a.id !== secili.id)); setSeciliId(undefined); } }}>Kaydı sil</button>
                </div>
              </>
            ) : (
              <>
                <h2>Arsalarım — {yer}</h2>
                {arsalar.length === 0 ? (
                  <div className="bos-durum">
                    <p><b>{yer} için kayıtlı arsanız yok.</b></p>
                    <p className="soluk">Değerlendirmek istediğiniz arsanın ada/parsel, alan, imar ve fiyat bilgisini aşağıdaki formdan girin. Kayıtlar yalnızca bu tarayıcıda, sizin hesabınıza özel saklanır.</p>
                    <a className="dugme-baglanti" href="#arsa-ekle">Arsa ekle ↓</a>
                  </div>
                ) : (
                <div className="tablo-kap">
                  <table>
                    <thead><tr><th>{ilce ? "Mahalle" : "İlçe"}</th><th>Ada/Parsel</th><th>İmar</th><th>m²</th><th>Toplam fiyat</th><th>Doğrulama</th><th>Puan</th></tr></thead>
                    <tbody>
                      {sirali.map((a) => (
                        <tr key={a.id} onClick={() => setSeciliId(a.id)}>
                          <td>{ilce ? a.mahalle ?? "—" : a.ilce}</td>
                          <td>{a.ada}/{a.parsel}</td>
                          <td>{a.imar}</td>
                          <td>{a.alan.toLocaleString("tr-TR")}</td>
                          <td>{TL(a.alan * a.fiyatM2)}</td>
                          <td><DogrulamaRozeti a={a} /></td>
                          <td><span className={`rozet ${puanSinifi(puanlar[a.id])}`}>{puanlar[a.id]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </>
            )}
          </section>
        </div>

        <section className="kart" id="tavsiyeler">
          <h2>İlerisi için tavsiyeler — {yer}</h2>
          {TAVSIYE_GRUPLARI.map((grup) => {
            const liste = tavsiyeler.filter((t) => t.grup === grup);
            if (!liste.length) return null;
            return (
              <div key={grup} style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>{grup}</h3>
                <ul className="tavsiye">{liste.map((t, i) => <li key={i}>{t.metin}</li>)}</ul>
              </div>
            );
          })}
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
      // Gerçek parsel koordinatı bilinmediğinden mahalle (yoksa ilçe) noktası kullanılır.
      lat: k.lat,
      lng: k.lng,
      konumYaklasik: true,
      manuel: true,
    });
    setF(bos);
  };

  return (
    <section className="kart" id="arsa-ekle">
      <h2>Arsa ekle — bu arsa ne kadar eder?</h2>
      <p className="soluk" style={{ marginTop: 0 }}>
        Bilgileri ilan veya tapudan değil, resmi kaynaktan girin: ada/parsel ve alanı <a href="https://parselsorgu.tkgm.gov.tr/" target="_blank" rel="noreferrer">TKGM Parsel Sorgu</a>'dan,
        imar ve emsali belediyenin imar durum belgesinden. Kayıtlar yalnızca bu tarayıcıda, hesabınıza özel saklanır.
      </p>
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
        <button type="submit">Ekle ve değerlendir</button>
      </form>
    </section>
  );
}

function DogrulamaRozeti({ a }: { a: Arsa }) {
  const toplam = kontrolListesi(a).length;
  const tamam = (a.kontroller ?? []).filter((id) => kontrolListesi(a).some((k) => k.id === id)).length;
  return <span className={`rozet ${tamam === toplam ? "p-yuksek" : tamam ? "p-orta" : "p-dusuk"}`}>{tamam}/{toplam}</span>;
}

// Resmi doğrulama kontrol listesi: işaretlenenler arsa kaydıyla birlikte saklanır.
function Dogrulama({ a, degistir }: { a: Arsa; degistir: (kontroller: string[]) => void }) {
  const liste = kontrolListesi(a);
  const yapilan = new Set(a.kontroller ?? []);
  const tamam = liste.filter((k) => yapilan.has(k.id)).length;
  return (
    <div className="dogrulama">
      <div className="dogrulama-ust">
        <b>✅ Resmi doğrulama listesi</b>
        <span className={`rozet ${tamam === liste.length ? "p-yuksek" : tamam ? "p-orta" : "p-dusuk"}`}>{tamam}/{liste.length} tamamlandı</span>
      </div>
      <div className="cubuk" style={{ margin: "6px 0 10px" }}><div style={{ width: `${(tamam / liste.length) * 100}%`, background: tamam === liste.length ? "var(--yesil)" : undefined }} /></div>
      {tamam < liste.length && <p className="eksi" style={{ fontSize: 13, margin: "0 0 8px" }}>Liste tamamlanmadan alım kararı vermeyin; yukarıdaki değerler doğrulanmamıştır.</p>}
      <ul>
        {liste.map((k) => (
          <li key={k.id} className={yapilan.has(k.id) ? "yapildi" : ""}>
            <label>
              <input
                type="checkbox"
                checked={yapilan.has(k.id)}
                onChange={(e) => degistir(e.target.checked ? [...yapilan, k.id] : [...yapilan].filter((x) => x !== k.id))}
              />
              <span>
                <b>{k.baslik}</b>
                <span className="soluk">{k.aciklama}</span>
                {k.kaynak && (
                  <span className="kaynak">
                    Kaynak: {k.kaynak.url ? <a href={k.kaynak.url} target="_blank" rel="noreferrer">{k.kaynak.ad} ↗</a> : k.kaynak.ad}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
