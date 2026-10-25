"use client";

import { useVeriDurumu } from "../../components/Giris";
import { kaynaklar, type KaynakTuru } from "../../components/VeriGuncelligi";

// Veri ve Kaynaklar: verinin tarihi, "güncel veriyi çek", tüm kaynakların türü, dönemi ve güncellik durumu.
// Onaylı her kullanıcı görebilir.
const TURLER: { tur: KaynakTuru; baslik: string; aciklama: string }[] = [
  { tur: "Resmî", baslik: "Resmî kaynaklar", aciklama: "Kamu kurumlarının yayımladığı veriler." },
  { tur: "Mevzuat", baslik: "Mevzuat ve resmî bağlantılar", aciklama: "Tavsiyelerde kullanılan yasal oranlar ve kurallar; doğrulama için yönlendirilen resmî sorgu ekranları." },
  { tur: "Açık veri", baslik: "Açık veri", aciklama: "Açık lisanslı topluluk verileri; eksik kayıt olabilir." },
  { tur: "Tahmin", baslik: "Tahminler ve varsayımlar", aciklama: "Resmî verilerden kural tabanlı türetilen değerler; kesin değildir." },
  { tur: "Kullanıcı", baslik: "Kullanıcı verisi", aciklama: "Kullanıcının girdiği bilgiler; resmî kaynaktan doğrulanmalıdır." },
];

export default function Sayfa() {
  const d = useVeriDurumu();
  if (!d) return null;
  const { v, guncelle, bekle, mesaj } = d;
  const liste = kaynaklar(v);
  const eski = liste.filter((k) => k.eski);

  return (
    <>
      <header className="baslik-satiri">
        <div>
          <h1>Veri ve Kaynaklar</h1>
          <p>Uygulamadaki tüm hesaplamaların dayandığı veriler, kaynakları ve ne zaman güncellendikleri.</p>
        </div>
        <button onClick={guncelle} disabled={bekle} className="yazdirma">{bekle ? "Çekiliyor…" : "Güncel veriyi çek"}</button>
      </header>
      <main>
        {mesaj && <div className="uyari" style={{ borderLeftColor: "var(--yesil)" }}>✅ {mesaj}</div>}

        <section className="kart">
          <h2>Veri durumu</h2>
          <div className="oneriler">
            <div><div className="soluk">Veri paketi tarihi</div><b>{v.guncelleme}</b><div className="soluk">Son yayında oluşturuldu</div></div>
            <div><div className="soluk">Konut fiyatı dönemi</div><b>{v.konutDonemi}</b><div className="soluk">TCMB, her ayın 20'si yenilenir</div></div>
            <div><div className="soluk">Nüfus yılı</div><b>{v.nufusYili ?? 2025}</b><div className="soluk">TÜİK ADNKS</div></div>
            <div>
              <div className="soluk">Güncellik</div>
              <b className={eski.length ? "eksi" : "arti"}>{eski.length ? `${eski.length} kaynak eski` : "Tümü güncel"}</b>
              <div className="soluk">{eski.length ? eski.map((k) => k.ad).join(", ") : `${liste.length} kaynak kontrol edildi`}</div>
            </div>
          </div>
          <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>
            Tüm öneri ve hesaplamalar bu verilerden anlık üretilir. "Güncel veriyi çek", yayındaki en son veri paketini indirir; sayfayı yenilemeden yeni
            veriye geçer.
          </p>
        </section>

        {TURLER.map(({ tur, baslik, aciklama }) => {
          const grup = liste.filter((k) => k.tur === tur);
          if (!grup.length) return null;
          return (
            <section key={tur} className="kart">
              <h2>{baslik}</h2>
              <p className="soluk" style={{ marginTop: 0 }}>{aciklama}</p>
              <div className="kaynak-tablo">
                <table>
                  <thead>
                    <tr><th>Veri</th><th>Dönem</th><th>Güncelleme</th><th>Durum</th></tr>
                  </thead>
                  <tbody>
                    {grup.map((k) => (
                      <tr key={k.ad}>
                        <td>
                          <b>{k.ad}</b>
                          <div className="soluk" style={{ fontSize: 12 }}>{k.kullanim}</div>
                          {k.linkler && (
                            <div className="kaynak-link">
                              {k.linkler.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.ad} ↗</a>)}
                            </div>
                          )}
                        </td>
                        <td>{k.donem}</td>
                        <td className="soluk">{k.nasil}</td>
                        <td>
                          {tur === "Tahmin" ? <span className="rozet r-Orta">Tahmin</span>
                            : tur === "Mevzuat" ? <span className="rozet f-Düşük">Mevzuat</span>
                            : tur === "Kullanıcı" ? <span className="rozet f-Orta">Kullanıcı</span>
                            : k.eski ? <span className="rozet p-dusuk">Eski</span> : <span className="rozet p-yuksek">Güncel</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
