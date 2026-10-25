"use client";

import { useEffect, useMemo, useState } from "react";
import { iller as ilListesi } from "../../lib/iller-meta";
import { mahalleler } from "../../lib/arsa";
import { evDegerle, YAKINLIKLAR, type EvBilgisi } from "../../lib/ev";
import { saticiFiyatlandirma } from "../../lib/satici";
import { paylasimOlustur } from "../../lib/paylasim";
import { raporBasligiAyarla } from "../../lib/rapor";
import { useProfil, hataMetni } from "../../lib/oturum";
import { useIlMahalleleri } from "../../lib/mahalle";
import { AliciSonuc, SaticiSonuc, Yontemler, AliciTavsiyeler, Etkenler } from "../../components/EvRaporBolumleri";
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
  useIlMahalleleri(e.il); // mahalle listesi ve koordinatları il dosyasından
  const s = useMemo(() => (e.netM2 > 0 && e.istenenFiyat > 0 ? evDegerle(e) : null), [e]);
  // Rapor türü: alıcıya "alınır mı?" analizi veya satıcıya fiyatlandırma raporu.
  const [tur, setTur] = useState<"alici" | "satici">("alici");
  const satici = tur === "satici";
  const f = useMemo(() => (s && satici ? saticiFiyatlandirma(e, s) : null), [e, s, satici]);
  const baslik = satici ? "Satıcı Fiyatlandırma Raporu" : "Gayrimenkul Ön Analiz Raporu";
  useEffect(() => {
    raporBasligiAyarla(baslik);
    return () => raporBasligiAyarla("Gayrimenkul Ön Analiz Raporu");
  }, [baslik]);

  // Paylaşılabilir bağlantı
  const profil = useProfil();
  const [paylasim, setPaylasim] = useState<{ url?: string; hata?: string; bekle?: boolean; kopyalandi?: boolean }>({});
  useEffect(() => setPaylasim({}), [e, tur]);
  const paylas = async () => {
    if (!s || !profil) return;
    setPaylasim({ bekle: true });
    try {
      const url = await paylasimOlustur(satici ? "ev-satici" : "ev-alici", baslik, { e, s, f: f ?? undefined, hazirlayan: { ad: profil.ad, eposta: profil.eposta }, ilAd: il.ad });
      setPaylasim({ url });
    } catch (h) {
      setPaylasim({ hata: /paylasimlar/.test(String((h as Error)?.message)) ? "Paylaşım tablosu henüz kurulmamış (supabase/paylasim.sql çalıştırılmalı)." : hataMetni(h) });
    }
  };
  const kopyala = async () => {
    if (!paylasim.url) return;
    try {
      await navigator.clipboard.writeText(paylasim.url);
      setPaylasim({ ...paylasim, kopyalandi: true });
    } catch {}
  };

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
          <p>{satici
            ? "Satıcı için fiyatlandırma: ilan, hedef ve hızlı satış fiyatı, değeri artırma önerileri ve satış stratejisi."
            : "Alıcı için analiz: adil değer dört yöntemle hesaplanır; pazarlık, finansman ve kontrol tavsiyeleri verilir."}</p>
          <div className="rapor-turu yazdirma" role="tablist" aria-label="Rapor türü">
            <button type="button" role="tab" aria-selected={!satici} className={satici ? "ikincil" : ""} onClick={() => setTur("alici")}>Alıcı analizi</button>
            <button type="button" role="tab" aria-selected={satici} className={satici ? "" : "ikincil"} onClick={() => setTur("satici")}>Satıcı fiyatlandırma</button>
          </div>
        </div>
        <div className="baslik-dugmeleri">
          {s && <button type="button" className="pdf-dugme yazdirma" onClick={paylas} disabled={paylasim.bekle}>{paylasim.bekle ? "Hazırlanıyor…" : "Paylaşılabilir bağlantı"}</button>}
          <PdfKaydet dosyaAdi={`${satici ? "Satıcı Fiyatlandırma" : "Ev Değerleme"} - ${[e.mahalle, e.ilce, il.ad].filter(Boolean).join(", ")}`} />
        </div>
      </header>
      <main>
        {(paylasim.url || paylasim.hata) && (
          <div className="paylasim-kutu yazdirma">
            {paylasim.hata ? <span className="eksi">{paylasim.hata}</span> : (
              <>
                <b>Bağlantı hazır.</b> <span className="soluk">Müşteriniz giriş yapmadan, logonuz ve bilgilerinizle bu raporu görür. 30 gün geçerlidir; Rapor ayarları sayfasından kaldırabilirsiniz.</span>
                <div className="paylasim-satir">
                  <input readOnly value={paylasim.url} onFocus={(x) => x.target.select()} aria-label="Paylaşım bağlantısı" />
                  <button type="button" onClick={kopyala}>{paylasim.kopyalandi ? "Kopyalandı" : "Kopyala"}</button>
                  <a className="dugme-baglanti" href={`https://wa.me/?text=${encodeURIComponent(baslik + ": " + paylasim.url)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  <a className="dugme-baglanti ikincil-baglanti" href={paylasim.url} target="_blank" rel="noreferrer">Aç</a>
                </div>
              </>
            )}
          </div>
        )}
        <div className="uyari">⚠️ Tahminler TCMB/tahmini bölge fiyatları, Bakanlık 2026 yapı maliyetleri ve kural tabanlı düzeltmelerle hesaplanır, <b>ekspertiz veya yatırım tavsiyesi değildir</b>. Kesin değer için lisanslı gayrimenkul değerleme raporu alın.</div>

        <section className="kart">
          <h2>Konum ve fiyat</h2>
          <div className="form">
            <label>İl<select value={e.il} onChange={(x) => setE({ ...e, il: x.target.value, ilce: iller.find((i) => i.kod === x.target.value)!.ilceler[0], mahalle: "" })}>{iller.map((i) => <option key={i.kod} value={i.kod}>{i.ad}</option>)}</select></label>
            <label>İlçe<select value={e.ilce} onChange={(x) => setE({ ...e, ilce: x.target.value, mahalle: "" })}>{il.ilceler.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Mahalle<select value={e.mahalle ?? ""} onChange={(x) => g("mahalle", x.target.value)}><option value="">Belirtilmedi (ilçe ortalaması)</option>{mahalleler(e.il, e.ilce).map((x) => <option key={x}>{x}</option>)}</select></label>
            {sayi("istenenFiyat", satici ? "Satıcının beklediği fiyat (₺)" : "İstenen fiyat (₺)", { min: 1, step: 50000 })}
            {sayi("ulasimKm", "Şehir/iş merkezine (km)", { step: 0.1 })}
            {!satici && secim("amac", "Alma amacınız", AMAC)}
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
            {!satici && sayi("mevcutKira", "Şu an ödediğim kira (₺/ay, yoksa 0)", { step: 500 })}
            {!satici && sayi("pesinatOrani", "Peşinat (%)", { max: 100 })}
            {!satici && sayi("aylikFaiz", "Aylık kredi faizi (%)", { step: 0.01 })}
            {!satici && sayi("vadeAy", "Vade (ay)", { min: 1, step: 12 })}
            {kutu("iskan", "İskânı var")}
            {kutu("krediyeUygun", "Krediye uygun")}
          </div>
          {!satici && <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>Kredi faizi bankaya ve döneme göre değişir; bankanızın güncel konut kredisi faizini girin.</p>}
        </section>

        {s && (
          <>
            {satici && f ? <SaticiSonuc s={s} f={f} /> : <AliciSonuc e={e} s={s} />}
            <Yontemler e={e} s={s} satici={satici} />
            <div className="izgara">
              {!satici && <AliciTavsiyeler s={s} />}
              <Etkenler s={s}>
                <YakinYerler il={e.il} ilce={e.ilce} mahalle={e.mahalle || undefined} />
              </Etkenler>
            </div>
          </>
        )}
      </main>
    </>
  );
}
