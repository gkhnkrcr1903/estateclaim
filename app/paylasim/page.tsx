"use client";

import { useEffect, useState } from "react";
import { paylasimGetir, type Paylasim } from "../../lib/paylasim";
import { RaporUstGorunum, RaporAltGorunum } from "../../components/RaporBasligi";
import { EvOzeti, AliciSonuc, SaticiSonuc, Yontemler, AliciTavsiyeler, Etkenler } from "../../components/EvRaporBolumleri";
import type { Profil } from "../../lib/oturum";

// Paylaşılan rapor: giriş gerektirmez. Bağlantıdaki kimlikle, danışmanın paylaştığı anki hesaplanmış sonucu gösterir.
export default function Sayfa() {
  const [p, setP] = useState<Paylasim | null>(null);
  const [durum, setDurum] = useState<"yuk" | "yok" | "hata" | "tamam">("yuk");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    paylasimGetir(id)
      .then((x) => {
        setP(x);
        setDurum(x ? "tamam" : "yok");
        if (x) document.title = `${x.baslik} — ${x.veri.kimlik?.ofis_adi || "Ev/Arsa Analiz"}`;
      })
      .catch(() => setDurum("hata"));
  }, []);

  if (durum !== "tamam" || !p)
    return (
      <main className="paylasim">
        <section className="kart" style={{ maxWidth: 560, margin: "40px auto" }}>
          <h2>{durum === "yuk" ? "Rapor yükleniyor…" : durum === "yok" ? "Rapor bulunamadı" : "Rapor açılamadı"}</h2>
          {durum === "yok" && <p style={{ margin: 0 }}>Bağlantı hatalı ya da paylaşım süresi dolmuş veya kaldırılmış olabilir. Raporu size gönderen danışmandan yeni bir bağlantı isteyin.</p>}
          {durum === "hata" && <p style={{ margin: 0 }}>Bağlantı kurulamadı; internet bağlantınızı kontrol edip sayfayı yenileyin.</p>}
        </section>
      </main>
    );

  const { e, s, f, kimlik, hazirlayan, ilAd } = p.veri;
  const sahte = { ad: hazirlayan.ad, eposta: hazirlayan.eposta } as Profil;
  const satici = p.tur === "ev-satici";
  const tarih = (t: string) => new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <main className="paylasim">
      <div className="paylasim-sayfa">
        <RaporUstGorunum k={kimlik} profil={sahte} baslik={p.baslik} />
        <div className="paylasim-bilgi yazdirma">
          <span className="soluk">Paylaşım tarihi {tarih(p.olusturma)} · Bağlantı {tarih(p.bitis)} tarihine kadar geçerli</span>
          <button onClick={() => window.print()}>PDF olarak kaydet / yazdır</button>
        </div>
        <EvOzeti e={e} ilAd={ilAd} />
        {satici && f ? <SaticiSonuc s={s} f={f} /> : <AliciSonuc e={e} s={s} />}
        <Yontemler e={e} s={s} satici={satici} />
        {satici ? <Etkenler s={s} /> : (
          <div className="izgara">
            <AliciTavsiyeler s={s} />
            <Etkenler s={s} />
          </div>
        )}
        <RaporAltGorunum k={kimlik} profil={sahte} />
      </div>
    </main>
  );
}
