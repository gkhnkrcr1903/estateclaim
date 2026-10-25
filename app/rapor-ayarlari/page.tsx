"use client";

import { useEffect, useRef, useState } from "react";
import { useProfil, hataMetni } from "../../lib/oturum";
import { BOS_KIMLIK, raporKimligiGetir, raporKimligiKaydet, logoKucult, type RaporKimligi } from "../../lib/rapor";
import { RaporUstGorunum, RaporAltGorunum } from "../../components/RaporBasligi";
import { paylasimlarim, paylasimSil, paylasimAdresi, type PaylasimOzeti } from "../../lib/paylasim";

// Rapor ayarları: PDF raporlarında görünen ofis/danışman kimliği ve logo. Yalnızca PDF yetkisi olan kullanıcılar.
const ALANLAR: { a: Exclude<keyof RaporKimligi, "logo">; ad: string; ipucu?: string; tur?: string }[] = [
  { a: "ofis_adi", ad: "Ofis / firma adı", ipucu: "Örn. Yıldız Gayrimenkul" },
  { a: "danisman_adi", ad: "Danışman adı soyadı" },
  { a: "unvan", ad: "Unvan", ipucu: "Örn. Gayrimenkul Danışmanı" },
  { a: "telefon", ad: "Telefon", tur: "tel" },
  { a: "eposta", ad: "E-posta", tur: "email" },
  { a: "web", ad: "Web sitesi", ipucu: "Örn. www.ofisiniz.com" },
  { a: "yetki_belge_no", ad: "Yetki belgesi no", ipucu: "Taşınmaz ticareti yetki belgesi" },
  { a: "adres", ad: "Adres" },
];

export default function Sayfa() {
  const profil = useProfil();
  const [k, setK] = useState<RaporKimligi>(BOS_KIMLIK);
  const [yuk, setYuk] = useState(true);
  const [mesaj, setMesaj] = useState<{ tur: "arti" | "eksi"; metin: string } | null>(null);
  const [bekle, setBekle] = useState(false);
  const dosya = useRef<HTMLInputElement>(null);

  useEffect(() => {
    raporKimligiGetir()
      .then((x) => setK(x ?? { ...BOS_KIMLIK, danisman_adi: profil?.ad ?? "", eposta: profil?.eposta ?? "" }))
      .catch((e) => setMesaj({ tur: "eksi", metin: /rapor_kimlikleri/.test(String(e?.message)) ? "Rapor tablosu henüz kurulmamış (supabase/rapor-kimligi.sql çalıştırılmalı)." : hataMetni(e) }))
      .finally(() => setYuk(false));
  }, [profil?.ad, profil?.eposta]);

  if (!profil?.pdf)
    return (
      <main>
        <section className="kart"><h2>Bu bölüme erişim yetkiniz yok</h2><p style={{ margin: 0 }}>Rapor ayarları PDF yetkisi olan kullanıcılar içindir.</p></section>
      </main>
    );

  const logoSec = async (f?: File) => {
    if (!f) return;
    setMesaj(null);
    try {
      setK({ ...k, logo: await logoKucult(f) });
    } catch (e) {
      setMesaj({ tur: "eksi", metin: hataMetni(e) });
    }
    if (dosya.current) dosya.current.value = "";
  };

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekle(true);
    setMesaj(null);
    try {
      await raporKimligiKaydet(k);
      setMesaj({ tur: "arti", metin: "Kaydedildi. Bundan sonraki PDF raporlarınız bu bilgilerle hazırlanır." });
    } catch (h) {
      setMesaj({ tur: "eksi", metin: /rapor_kimlikleri/.test(String((h as Error)?.message)) ? "Rapor tablosu henüz kurulmamış (supabase/rapor-kimligi.sql çalıştırılmalı)." : hataMetni(h) });
    }
    setBekle(false);
  };

  return (
    <>
      <header>
        <h1>Rapor ayarları</h1>
        <p>PDF raporlarınızın başında ofis logonuz ve iletişim bilgileriniz, sonunda imza bloğunuz yer alır. Bilgiler hesabınıza kaydedilir; tüm cihazlarda geçerlidir.</p>
      </header>
      <main>
        {mesaj && <div className="uyari" style={{ borderLeftColor: mesaj.tur === "arti" ? "var(--yesil)" : "var(--kirmizi)" }}>{mesaj.metin}</div>}
        <section className="kart">
            <h2>Ofis ve danışman bilgileri</h2>
            {yuk ? (
              <p className="soluk">Yükleniyor…</p>
            ) : (
              <form onSubmit={kaydet} className="rapor-form">
                <div className="logo-alani">
                  <div className="logo-onizleme">{k.logo ? <img src={k.logo} alt="Logo önizleme" /> : <span className="soluk">Logo yok</span>}</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <input ref={dosya} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={(e) => logoSec(e.target.files?.[0])} hidden />
                    <button type="button" className="ikincil" onClick={() => dosya.current?.click()}>{k.logo ? "Logoyu değiştir" : "Logo yükle"}</button>
                    {k.logo && <button type="button" className="ikincil" onClick={() => setK({ ...k, logo: null })}>Logoyu kaldır</button>}
                    <span className="soluk" style={{ fontSize: 12 }}>PNG (şeffaf zeminli) önerilir. Görsel otomatik küçültülür.</span>
                  </div>
                </div>
                <div className="form">
                  {ALANLAR.map(({ a, ad, ipucu, tur }) => (
                    <label key={a} style={a === "adres" ? { gridColumn: "1 / -1" } : undefined}>
                      {ad}
                      <input type={tur ?? "text"} value={k[a]} placeholder={ipucu} maxLength={a === "adres" ? 200 : 100} onChange={(e) => setK({ ...k, [a]: e.target.value })} />
                    </label>
                  ))}
                </div>
                <div><button type="submit" disabled={bekle}>{bekle ? "Kaydediliyor…" : "Kaydet"}</button></div>
              </form>
            )}
        </section>
        <section className="kart">
            <h2>PDF önizleme</h2>
            <div className="rapor-onizleme">
              <RaporUstGorunum k={k} profil={profil} />
              <div className="rapor-onizleme-govde">
                <div /><div /><div style={{ width: "70%" }} /><div style={{ width: "85%" }} />
              </div>
              <RaporAltGorunum k={k} profil={profil} />
            </div>
            <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>Gerçek raporda gri çizgilerin yerinde sayfanın analiz içeriği yer alır.</p>
        </section>
        <Paylasimlarim />
      </main>
    </>
  );
}

// Kullanıcının oluşturduğu paylaşım bağlantıları: görüntülenme sayısı, süre ve kaldırma.
function Paylasimlarim() {
  const [liste, setListe] = useState<PaylasimOzeti[] | null>(null);
  const [hata, setHata] = useState("");
  useEffect(() => {
    paylasimlarim()
      .then(setListe)
      .catch((e) => setHata(/paylasimlar/.test(String(e?.message)) ? "Paylaşım tablosu henüz kurulmamış (supabase/paylasim.sql çalıştırılmalı)." : hataMetni(e)));
  }, []);
  const sil = async (id: string) => {
    if (!confirm("Bu bağlantı kaldırılsın mı? Müşteriniz raporu artık açamaz.")) return;
    try {
      await paylasimSil(id);
      setListe((l) => l?.filter((x) => x.id !== id) ?? null);
    } catch (e) {
      setHata(hataMetni(e));
    }
  };
  const tarih = (t: string) => new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <section className="kart">
      <h2>Paylaştığım bağlantılar</h2>
      {hata && <p className="eksi" style={{ marginTop: 0 }}>{hata}</p>}
      {!hata && !liste && <p className="soluk">Yükleniyor…</p>}
      {liste && liste.length === 0 && <p className="soluk" style={{ margin: 0 }}>Henüz paylaşılmış rapor yok. Ev Analiz sayfasında "Paylaşılabilir bağlantı" ile oluşturabilirsiniz.</p>}
      {liste && liste.length > 0 && (
        <div className="kaynak-tablo">
          <table>
            <thead><tr><th>Rapor</th><th>Oluşturma</th><th>Geçerlilik</th><th>Görüntülenme</th><th></th></tr></thead>
            <tbody>
              {liste.map((x) => {
                const gecti = new Date(x.bitis) < new Date();
                return (
                  <tr key={x.id}>
                    <td><b>{x.baslik}</b><div className="kaynak-link"><a href={paylasimAdresi(x.id)} target="_blank" rel="noreferrer">Bağlantıyı aç ↗</a></div></td>
                    <td>{tarih(x.olusturma)}</td>
                    <td>{gecti ? <span className="rozet p-dusuk">Süresi doldu</span> : tarih(x.bitis)}</td>
                    <td>{x.goruntulenme}</td>
                    <td style={{ textAlign: "right" }}><button className="ikincil" style={{ height: 30, padding: "0 10px" }} onClick={() => sil(x.id)}>Kaldır</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
