"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useProfil, hataMetni } from "../../lib/oturum";
import { iller as ilListesi } from "../../lib/iller-meta";
import {
  musterileriGetir, musteriKaydet, musteriSil, portfoyGetir, portfoyGuncelle, portfoySil, portfoyHatasi,
  MUSTERI_TURLERI, PORTFOY_DURUMLARI, type Musteri, type PortfoyKaydi, type PortfoyDurumu, type MusteriTuru,
} from "../../lib/portfoy";
import SayiKutusu from "../../components/SayiKutusu";

// Portföy ve müşteri kaydı: danışmanın kayıtlı evleri/arsaları ve müşterileri. Her danışman yalnızca kendi kayıtlarını görür.

const TL = (n: number | null | undefined) => (n ? n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺" : "—");
const tarih = (t: string) => new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const DURUM_SINIFI: Record<PortfoyDurumu, string> = { Aktif: "p-yuksek", Opsiyonlu: "p-orta", "Satıldı": "f-Orta", "Kiralandı": "f-Orta", "İptal": "p-dusuk" };

export default function Sayfa() {
  const p = useProfil();
  const [sekme, setSekme] = useState<"portfoy" | "musteriler">("portfoy");
  const [kayitlar, setKayitlar] = useState<PortfoyKaydi[] | null>(null);
  const [musteriler, setMusteriler] = useState<Musteri[] | null>(null);
  const [hata, setHata] = useState("");

  const yukle = useCallback(async () => {
    setHata("");
    try {
      const [k, m] = await Promise.all([portfoyGetir(), musterileriGetir()]);
      setKayitlar(k);
      setMusteriler(m);
    } catch (e) {
      setHata(portfoyHatasi(e) ?? hataMetni(e));
      setKayitlar([]);
      setMusteriler([]);
    }
  }, []);
  useEffect(() => {
    yukle();
  }, [yukle]);

  if (!p?.ev && !p?.arsa)
    return <main><section className="kart"><h2>Bu bölüme erişim yetkiniz yok</h2><p style={{ margin: 0 }}>Portföy, Ev veya Arsa yetkisi olan kullanıcılar içindir.</p></section></main>;

  return (
    <>
      <header className="baslik-satiri">
        <div>
          <h1>Portföy</h1>
          <p>Analiz ettiğiniz evler, arsalar ve müşterileriniz. Kayıtlar hesabınıza bağlıdır; telefon ve bilgisayarda aynı listeyi görürsünüz.</p>
          <div className="rapor-turu" role="tablist">
            <button type="button" role="tab" aria-selected={sekme === "portfoy"} className={sekme === "portfoy" ? "" : "ikincil"} onClick={() => setSekme("portfoy")}>Kayıtlar{kayitlar ? ` (${kayitlar.length})` : ""}</button>
            <button type="button" role="tab" aria-selected={sekme === "musteriler"} className={sekme === "musteriler" ? "" : "ikincil"} onClick={() => setSekme("musteriler")}>Müşteriler{musteriler ? ` (${musteriler.length})` : ""}</button>
          </div>
        </div>
        <div className="baslik-dugmeleri">
          {p.ev && <Link className="dugme-baglanti" href="/ev">Yeni ev analizi</Link>}
          {p.arsa && <Link className="dugme-baglanti ikincil-baglanti" href="/#arsa-ekle">Yeni arsa</Link>}
        </div>
      </header>
      <main>
        {hata && <div className="uyari" style={{ borderLeftColor: "var(--kirmizi)" }}>{hata}</div>}
        {sekme === "portfoy" ? (
          <Kayitlar kayitlar={kayitlar} musteriler={musteriler ?? []} setKayitlar={setKayitlar} setHata={setHata} />
        ) : (
          <Musteriler musteriler={musteriler} kayitlar={kayitlar ?? []} setMusteriler={setMusteriler} setHata={setHata} />
        )}
      </main>
    </>
  );
}

function Kayitlar({ kayitlar, musteriler, setKayitlar, setHata }: {
  kayitlar: PortfoyKaydi[] | null; musteriler: Musteri[];
  setKayitlar: (f: (k: PortfoyKaydi[] | null) => PortfoyKaydi[] | null) => void; setHata: (h: string) => void;
}) {
  const ilAdi = useMemo(() => Object.fromEntries(ilListesi().map((i) => [i.kod, i.ad])), []);
  const [ara, setAra] = useState("");
  const [tur, setTur] = useState<"" | "ev" | "arsa">("");
  const [durum, setDurum] = useState<"" | PortfoyDurumu>("");
  const [musteri, setMusteri] = useState("");

  const liste = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase("tr");
    return (kayitlar ?? []).filter((k) =>
      (!tur || k.tur === tur) && (!durum || k.durum === durum) && (!musteri || k.musteri_id === musteri) &&
      (!q || [k.baslik, k.ilce, k.mahalle, ilAdi[k.il]].join(" ").toLocaleLowerCase("tr").includes(q)));
  }, [kayitlar, ara, tur, durum, musteri, ilAdi]);

  const guncelle = async (k: PortfoyKaydi, degisim: Partial<PortfoyKaydi>) => {
    try {
      await portfoyGuncelle(k.id, degisim);
      setKayitlar((l) => l?.map((x) => (x.id === k.id ? { ...x, ...degisim } : x)) ?? null);
    } catch (e) {
      setHata(hataMetni(e));
    }
  };
  const sil = async (k: PortfoyKaydi) => {
    if (!confirm(`"${k.baslik}" portföyden silinsin mi?`)) return;
    try {
      await portfoySil(k.id);
      setKayitlar((l) => l?.filter((x) => x.id !== k.id) ?? null);
    } catch (e) {
      setHata(hataMetni(e));
    }
  };
  const acAdres = (k: PortfoyKaydi) => (k.tur === "ev" ? `/ev/?kayit=${k.id}` : `/?arsa=${k.id}`);

  return (
    <section className="kart">
      <h2>Kayıtlar</h2>
      <div className="form" style={{ marginBottom: 12 }}>
        <label>Ara<input placeholder="Başlık, ilçe, mahalle…" value={ara} onChange={(e) => setAra(e.target.value)} /></label>
        <label>Tür<select value={tur} onChange={(e) => setTur(e.target.value as typeof tur)}><option value="">Tümü</option><option value="ev">Ev</option><option value="arsa">Arsa</option></select></label>
        <label>Durum<select value={durum} onChange={(e) => setDurum(e.target.value as typeof durum)}><option value="">Tümü</option>{PORTFOY_DURUMLARI.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label>Müşteri<select value={musteri} onChange={(e) => setMusteri(e.target.value)}><option value="">Tümü</option>{musteriler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}</select></label>
      </div>
      {!kayitlar ? <p className="soluk">Yükleniyor…</p> : liste.length === 0 ? (
        <div className="bos-durum">
          <p><b>{kayitlar.length ? "Süzgece uyan kayıt yok." : "Portföyünüz boş."}</b></p>
          <p className="soluk">Ev Analiz sayfasında "Portföye kaydet" ile ev, Arsa Analizi'nde "Arsa ekle" ile arsa kaydedebilirsiniz.</p>
        </div>
      ) : (
        <div className="kaynak-tablo">
          <table>
            <thead><tr><th>Kayıt</th><th>Fiyat / değer</th><th>Durum</th><th>Müşteri</th><th>Güncelleme</th><th></th></tr></thead>
            <tbody>
              {liste.map((k) => (
                <tr key={k.id}>
                  <td>
                    <span className={`rozet ${k.tur === "ev" ? "f-Düşük" : "f-Yüksek"}`}>{k.tur === "ev" ? "Ev" : "Arsa"}</span> <b>{k.baslik}</b>
                    <div className="soluk" style={{ fontSize: 12 }}>{[k.mahalle, k.ilce, ilAdi[k.il]].filter(Boolean).join(", ")}</div>
                    {k.ozet?.karar && <div className="soluk" style={{ fontSize: 12 }}>{k.ozet.karar}</div>}
                  </td>
                  <td>{TL(k.fiyat)}<div className="soluk" style={{ fontSize: 12 }}>Tahmini {TL(k.ozet?.tahmini)}</div></td>
                  <td>
                    <select className={`durum-sec ${DURUM_SINIFI[k.durum]}`} value={k.durum} onChange={(e) => guncelle(k, { durum: e.target.value as PortfoyDurumu })} aria-label="Durum">
                      {PORTFOY_DURUMLARI.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={k.musteri_id ?? ""} onChange={(e) => guncelle(k, { musteri_id: e.target.value || null })} aria-label="Müşteri">
                      <option value="">—</option>
                      {musteriler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
                    </select>
                  </td>
                  <td className="soluk">{tarih(k.guncelleme)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link className="dugme-baglanti kucuk" href={acAdres(k)}>Aç</Link>{" "}
                    <button className="ikincil" style={{ height: 30, padding: "0 10px" }} onClick={() => sil(k)}>Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const BOS_MUSTERI = { id: "", ad: "", telefon: "", eposta: "", tur: "Alıcı" as MusteriTuru, butce_min: 0, butce_max: 0, notlar: "" };

function Musteriler({ musteriler, kayitlar, setMusteriler, setHata }: {
  musteriler: Musteri[] | null; kayitlar: PortfoyKaydi[];
  setMusteriler: (f: (m: Musteri[] | null) => Musteri[] | null) => void; setHata: (h: string) => void;
}) {
  const [f, setF] = useState(BOS_MUSTERI);
  const [bekle, setBekle] = useState(false);
  const [ara, setAra] = useState("");
  const sayi = useMemo(() => kayitlar.reduce<Record<string, number>>((t, k) => (k.musteri_id ? { ...t, [k.musteri_id]: (t[k.musteri_id] ?? 0) + 1 } : t), {}), [kayitlar]);
  const liste = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase("tr");
    return (musteriler ?? []).filter((m) => !q || [m.ad, m.telefon, m.eposta, m.notlar].join(" ").toLocaleLowerCase("tr").includes(q));
  }, [musteriler, ara]);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekle(true);
    try {
      const m = await musteriKaydet({ ...f, id: f.id || undefined });
      setMusteriler((l) => (f.id ? l?.map((x) => (x.id === m.id ? m : x)) ?? null : [m, ...(l ?? [])]));
      setF(BOS_MUSTERI);
    } catch (h) {
      setHata(portfoyHatasi(h) ?? hataMetni(h));
    }
    setBekle(false);
  };
  const sil = async (m: Musteri) => {
    if (!confirm(`${m.ad} silinsin mi? Bağlı portföy kayıtları silinmez, yalnızca müşteri bağlantısı kalkar.`)) return;
    try {
      await musteriSil(m.id);
      setMusteriler((l) => l?.filter((x) => x.id !== m.id) ?? null);
    } catch (h) {
      setHata(hataMetni(h));
    }
  };

  return (
    <>
      <section className="kart">
        <h2>{f.id ? "Müşteriyi düzenle" : "Yeni müşteri"}</h2>
        <form className="form" onSubmit={kaydet}>
          <label>Ad soyad<input required maxLength={120} value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} /></label>
          <label>Telefon<input type="tel" maxLength={40} value={f.telefon} onChange={(e) => setF({ ...f, telefon: e.target.value })} /></label>
          <label>E-posta<input type="email" maxLength={120} value={f.eposta} onChange={(e) => setF({ ...f, eposta: e.target.value })} /></label>
          <label>Tür<select value={f.tur} onChange={(e) => setF({ ...f, tur: e.target.value as MusteriTuru })}>{MUSTERI_TURLERI.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Bütçe en az (₺)<SayiKutusu min={0} step={100000} deger={f.butce_min} degistir={(n) => setF({ ...f, butce_min: n })} /></label>
          <label>Bütçe en çok (₺)<SayiKutusu min={0} step={100000} deger={f.butce_max} degistir={(n) => setF({ ...f, butce_max: n })} /></label>
          <label style={{ gridColumn: "1 / -1" }}>Notlar<textarea rows={2} maxLength={4000} value={f.notlar} onChange={(e) => setF({ ...f, notlar: e.target.value })} placeholder="Aradığı özellikler, görüşme notları…" /></label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={bekle}>{bekle ? "Kaydediliyor…" : f.id ? "Güncelle" : "Müşteri ekle"}</button>
            {f.id && <button type="button" className="ikincil" onClick={() => setF(BOS_MUSTERI)}>Vazgeç</button>}
          </div>
        </form>
        <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>
          KVKK: Müşterinizin ad, telefon ve e-posta bilgilerini kaydetmeden önce aydınlatma yapın ve gerekiyorsa açık rızasını alın. Bilgiler yalnızca sizin
          hesabınızda saklanır; diğer kullanıcılar ve yöneticiler göremez.
        </p>
      </section>

      <section className="kart">
        <h2>Müşteriler</h2>
        <input placeholder="Ad, telefon, e-posta, not ara…" value={ara} onChange={(e) => setAra(e.target.value)} style={{ width: "100%", maxWidth: 360, marginBottom: 12 }} />
        {!musteriler ? <p className="soluk">Yükleniyor…</p> : liste.length === 0 ? <p className="soluk" style={{ margin: 0 }}>{musteriler.length ? "Aramaya uyan müşteri yok." : "Henüz müşteri eklenmedi."}</p> : (
          <div className="kaynak-tablo">
            <table>
              <thead><tr><th>Müşteri</th><th>İletişim</th><th>Bütçe</th><th>Kayıt</th><th></th></tr></thead>
              <tbody>
                {liste.map((m) => (
                  <tr key={m.id}>
                    <td><b>{m.ad}</b> <span className="rozet r-Orta">{m.tur}</span>{m.notlar && <div className="soluk" style={{ fontSize: 12 }}>{m.notlar.slice(0, 120)}</div>}</td>
                    <td className="soluk" style={{ fontSize: 12.5 }}>
                      {m.telefon && <div><a href={`tel:${m.telefon.replace(/\s/g, "")}`}>{m.telefon}</a></div>}
                      {m.eposta && <div><a href={`mailto:${m.eposta}`}>{m.eposta}</a></div>}
                    </td>
                    <td>{m.butce_min || m.butce_max ? `${TL(m.butce_min)} – ${TL(m.butce_max)}` : "—"}</td>
                    <td>{sayi[m.id] ?? 0}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="ikincil" style={{ height: 30, padding: "0 10px" }} onClick={() => { setF({ id: m.id, ad: m.ad, telefon: m.telefon ?? "", eposta: m.eposta ?? "", tur: m.tur, butce_min: m.butce_min ?? 0, butce_max: m.butce_max ?? 0, notlar: m.notlar ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Düzenle</button>{" "}
                      <button className="ikincil" style={{ height: 30, padding: "0 10px" }} onClick={() => sil(m)}>Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
