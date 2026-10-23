"use client";

import { useEffect, useState } from "react";
import { girisYap, yenidenYukle, cikisYap, SifreHatasi, type Veri } from "../lib/veri";
import VeriGuncelligi from "./VeriGuncelligi";

// Şifre girilip veri çözülene kadar uygulama içeriğini göstermez.
export default function Giris({ children }: { children: React.ReactNode }) {
  const [v, setV] = useState<Veri | null>(null);
  const [hazir, setHazir] = useState(false);
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [surum, setSurum] = useState(0);

  useEffect(() => {
    yenidenYukle().then((x) => {
      setV(x);
      setHazir(true);
    });
  }, []);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekle(true);
    setHata("");
    try {
      setV(await girisYap(sifre));
      setSifre("");
    } catch (e) {
      setHata(e instanceof SifreHatasi ? "Şifre hatalı." : "Veri dosyası indirilemedi, bağlantınızı kontrol edip tekrar deneyin.");
    }
    setBekle(false);
  };

  const guncelle = async () => {
    setBekle(true);
    const once = v?.guncelleme;
    const yeni = await yenidenYukle();
    setBekle(false);
    if (!yeni) return setV(null);
    setV(yeni);
    setSurum((s) => s + 1);
    setMesaj(yeni.guncelleme === once ? `Veriler zaten güncel (${yeni.guncelleme}).` : `Veriler güncellendi: ${yeni.guncelleme}`);
    setTimeout(() => setMesaj(""), 5000);
  };

  if (!hazir) return <div className="giris"><p className="soluk">Yükleniyor…</p></div>;

  if (!v)
    return (
      <div className="giris">
        <form className="kart giris-kart" onSubmit={gonder}>
          <h1>🔒 Arsa Analiz</h1>
          <p className="soluk">Devam etmek için şifreyi girin.</p>
          <input type="password" autoFocus required autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="Şifre" value={sifre} onChange={(e) => setSifre(e.target.value)} />
          {hata && <div className="eksi">{hata}</div>}
          <button type="submit" disabled={bekle}>{bekle ? "Açılıyor…" : "Giriş yap"}</button>
        </form>
      </div>
    );

  return (
    <>
      <div className="veri-cubugu">
        <span className="soluk" title={v.kaynaklar.join("\n")}>Veri tarihi: {v.guncelleme} · Konut fiyatı: {v.konutDonemi}</span>
        {mesaj && <span className="arti">{mesaj}</span>}
        <button className="ikincil" onClick={guncelle} disabled={bekle}>{bekle ? "Çekiliyor…" : "🔄 Güncel veriyi çek"}</button>
        <button className="ikincil" onClick={() => { cikisYap(); setV(null); }}>Çıkış</button>
        <VeriGuncelligi v={v} />
      </div>
      <div key={surum}>{children}</div>
    </>
  );
}
