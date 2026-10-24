"use client";

import { useCallback, useEffect, useState } from "react";
import { girisYap, yenidenYukle, cikisYap, SifreHatasi, type Veri } from "../lib/veri";
import { supabase, profilGetir, veriSifresiGetir, veriSifresiKaydet, girisKaydet, hataMetni, ProfilBaglami, type Profil } from "../lib/oturum";
import VeriGuncelligi from "./VeriGuncelligi";
import { Logo } from "./Menu";

// Kullanıcı girişi (Supabase), onay ve yetki kontrolü; onaylı kullanıcı için şifreli veri çözülene kadar
// uygulama içeriğini göstermez. Veri şifresi kullanıcıya söylenmez, yalnızca aktif kullanıcıların okuyabildiği
// "ayarlar" tablosundan alınır.

type Durum = "yukleniyor" | "giris" | "bekliyor" | "sifre-yok" | "hazir" | "hata";

function Kabuk({ children }: { children: React.ReactNode }) {
  return (
    <div className="giris">
      <div className="kart giris-kart">
        <div className="giris-marka"><Logo boyut={44} /><div><h1>Arsa Analiz</h1><small>Gayrimenkul Analiz</small></div></div>
        {children}
      </div>
    </div>
  );
}

export default function Giris({ children }: { children: React.ReactNode }) {
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [profil, setProfil] = useState<Profil | null>(null);
  const [v, setV] = useState<Veri | null>(null);
  const [hataMsj, setHataMsj] = useState("");
  const [bekle, setBekle] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [surum, setSurum] = useState(0);

  // Oturumdaki kullanıcının profilini alır, onaylıysa veri şifresini çekip veriyi çözer.
  const hazirla = useCallback(async () => {
    setHataMsj("");
    try {
      const p = await profilGetir();
      setProfil(p);
      if (!p) return setDurum("giris");
      if (!p.aktif) return setDurum("bekliyor");
      girisKaydet();
      const onceki = await yenidenYukle();
      if (onceki) {
        setV(onceki);
        return setDurum("hazir");
      }
      const sifre = await veriSifresiGetir();
      if (!sifre) return setDurum("sifre-yok");
      setV(await girisYap(sifre));
      setDurum("hazir");
    } catch (e) {
      setHataMsj(e instanceof SifreHatasi ? "Kayıtlı veri şifresi bu veri dosyasını açmıyor. Admin panelinden veri şifresini güncelleyin." : hataMetni(e));
      setDurum("hata");
    }
  }, []);

  useEffect(() => {
    hazirla();
    const { data } = supabase.auth.onAuthStateChange((olay) => {
      if (olay === "SIGNED_OUT") {
        cikisYap();
        setV(null);
        setProfil(null);
        setDurum("giris");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [hazirla]);

  // Yazdırma yetkisi: PDF yetkisi olmayanların çıktısında içerik gizlenir (bkz. globals.css @media print).
  useEffect(() => {
    document.body.dataset.pdf = profil?.pdf ? "acik" : "kapali";
  }, [profil]);

  const cikis = async () => {
    cikisYap();
    await supabase.auth.signOut();
  };

  const guncelle = async () => {
    setBekle(true);
    const once = v?.guncelleme;
    const yeni = await yenidenYukle();
    setBekle(false);
    if (!yeni) return hazirla();
    setV(yeni);
    setSurum((s) => s + 1);
    setMesaj(yeni.guncelleme === once ? `Veriler zaten güncel (${yeni.guncelleme}).` : `Veriler güncellendi: ${yeni.guncelleme}`);
    setTimeout(() => setMesaj(""), 5000);
  };

  if (durum === "yukleniyor") return <div className="giris"><p className="soluk">Yükleniyor…</p></div>;
  if (durum === "giris") return <GirisFormu tamam={hazirla} />;
  if (durum === "bekliyor")
    return (
      <Kabuk>
        <p><b>Hesabınız onay bekliyor.</b></p>
        <p className="soluk">{profil?.eposta} ile kayıt oldunuz. Yönetici hesabınızı onaylayıp yetki verdiğinde uygulamayı kullanabilirsiniz.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={hazirla}>Tekrar kontrol et</button>
          <button className="ikincil" onClick={cikis}>Çıkış</button>
        </div>
      </Kabuk>
    );
  if (durum === "sifre-yok")
    return profil?.admin ? (
      <VeriSifresiFormu tamam={hazirla} cikis={cikis} />
    ) : (
      <Kabuk>
        <p className="soluk">Uygulama henüz yönetici tarafından yapılandırılmadı. Lütfen daha sonra tekrar deneyin.</p>
        <button className="ikincil" onClick={cikis}>Çıkış</button>
      </Kabuk>
    );
  if (durum === "hata" || !v)
    return (
      <Kabuk>
        <div className="eksi">{hataMsj || "Beklenmeyen bir hata oluştu."}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={hazirla}>Tekrar dene</button>
          {profil?.admin && <button className="ikincil" onClick={() => setDurum("sifre-yok")}>Veri şifresini gir</button>}
          <button className="ikincil" onClick={cikis}>Çıkış</button>
        </div>
      </Kabuk>
    );

  return (
    <ProfilBaglami.Provider value={profil}>
      <div className="veri-cubugu">
        <span className="soluk" title={v.kaynaklar.join("\n")}>Veri tarihi: {v.guncelleme} · Konut fiyatı: {v.konutDonemi}</span>
        {mesaj && <span className="arti">{mesaj}</span>}
        <span className="soluk">👤 {profil?.ad || profil?.eposta}</span>
        <button className="ikincil" onClick={guncelle} disabled={bekle}>{bekle ? "Çekiliyor…" : "🔄 Güncel veriyi çek"}</button>
        <button className="ikincil" onClick={cikis}>Çıkış</button>
        <VeriGuncelligi v={v} />
      </div>
      <div key={surum}>{children}</div>
      {profil?.pdf && (
        <div className="yazdirma-imza">
          Hazırlayan: {profil.ad ? `${profil.ad} (${profil.eposta})` : profil.eposta} · {new Date().toLocaleString("tr-TR")} · Arsa Analiz — Gayrimenkul Analiz. Ekspertiz veya yatırım tavsiyesi değildir.
        </div>
      )}
    </ProfilBaglami.Provider>
  );
}

function GirisFormu({ tamam }: { tamam: () => void }) {
  const [mod, setMod] = useState<"giris" | "kayit" | "sifirla">("giris");
  const [ad, setAd] = useState("");
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");
  const [bekle, setBekle] = useState(false);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekle(true);
    setHata("");
    setBilgi("");
    try {
      if (mod === "giris") {
        const { error } = await supabase.auth.signInWithPassword({ email: eposta.trim(), password: sifre });
        if (error) throw error;
        tamam();
      } else if (mod === "kayit") {
        const { data, error } = await supabase.auth.signUp({ email: eposta.trim(), password: sifre, options: { data: { ad: ad.trim() } } });
        if (error) throw error;
        if (data.session) tamam();
        else setBilgi("Kayıt alındı. E-postanıza gelen doğrulama bağlantısına tıklayın, ardından giriş yapın.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(eposta.trim(), { redirectTo: window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/" });
        if (error) throw error;
        setBilgi("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
      }
    } catch (h) {
      setHata(hataMetni(h));
    }
    setBekle(false);
  };

  return (
    <div className="giris">
      <form className="kart giris-kart" onSubmit={gonder}>
        <div className="giris-marka"><Logo boyut={44} /><div><h1>Arsa Analiz</h1><small>Gayrimenkul Analiz</small></div></div>
        <div className="sekme">
          <button type="button" className={mod === "giris" ? "" : "ikincil"} onClick={() => setMod("giris")}>Giriş yap</button>
          <button type="button" className={mod === "kayit" ? "" : "ikincil"} onClick={() => setMod("kayit")}>Kayıt ol</button>
        </div>
        {mod === "kayit" && <input required placeholder="Ad soyad" value={ad} onChange={(e) => setAd(e.target.value)} autoComplete="name" />}
        <input type="email" required placeholder="E-posta" value={eposta} onChange={(e) => setEposta(e.target.value)} autoComplete="email" autoCapitalize="off" />
        {mod !== "sifirla" && (
          <input type="password" required minLength={6} placeholder="Şifre" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete={mod === "kayit" ? "new-password" : "current-password"} />
        )}
        {hata && <div className="eksi">{hata}</div>}
        {bilgi && <div className="arti">{bilgi}</div>}
        <button type="submit" disabled={bekle}>
          {bekle ? "Lütfen bekleyin…" : mod === "giris" ? "Giriş yap" : mod === "kayit" ? "Kayıt ol" : "Sıfırlama bağlantısı gönder"}
        </button>
        {mod === "giris" && <a href="#" className="kucuk-baglanti" onClick={(e) => { e.preventDefault(); setMod("sifirla"); }}>Şifremi unuttum</a>}
        {mod === "sifirla" && <a href="#" className="kucuk-baglanti" onClick={(e) => { e.preventDefault(); setMod("giris"); }}>Girişe dön</a>}
        {mod === "kayit" && <p className="soluk" style={{ fontSize: 12, margin: 0 }}>Kayıt olduktan sonra yönetici onayı gerekir.</p>}
      </form>
    </div>
  );
}

function VeriSifresiFormu({ tamam, cikis }: { tamam: () => void; cikis: () => void }) {
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);
  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekle(true);
    setHata("");
    try {
      await girisYap(sifre); // önce şifrenin veriyi gerçekten açtığını doğrula
      await veriSifresiKaydet(sifre);
      tamam();
    } catch (h) {
      setHata(h instanceof SifreHatasi ? "Bu şifre veri dosyasını açmıyor." : hataMetni(h));
    }
    setBekle(false);
  };
  return (
    <div className="giris">
      <form className="kart giris-kart" onSubmit={gonder}>
        <div className="giris-marka"><Logo boyut={44} /><div><h1>İlk kurulum</h1><small>Yalnızca admin</small></div></div>
        <p className="soluk">Veri dosyasının şifresini (GitHub'daki SITE_PASSWORD) bir kez girin. Kullanıcılara söylenmez; onaylı kullanıcılar giriş yaptığında otomatik kullanılır.</p>
        <input type="password" required placeholder="Veri şifresi" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="off" />
        {hata && <div className="eksi">{hata}</div>}
        <button type="submit" disabled={bekle}>{bekle ? "Doğrulanıyor…" : "Kaydet ve devam et"}</button>
        <button type="button" className="ikincil" onClick={cikis}>Çıkış</button>
      </form>
    </div>
  );
}
