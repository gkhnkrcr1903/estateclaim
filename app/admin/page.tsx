"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Yetki from "../../components/Yetki";
import { supabase, useProfil, veriSifresiKaydet, veriSifresiGetir, hataMetni, type Profil } from "../../lib/oturum";
import { girisYap, SifreHatasi } from "../../lib/veri";

// Yönetim paneli: kullanıcı onayı, yetkiler (arsa, ev, PDF, admin), pasife alma ve veri şifresi.
// Yetki değişiklikleri veritabanında RLS ile korunur: bu sayfayı açmak tek başına yetki vermez.
const KULLANICI_SINIRI = 50;
type Alan = "aktif" | "arsa" | "ev" | "pdf" | "admin";
const ALANLAR: { alan: Alan; ad: string }[] = [
  { alan: "aktif", ad: "Aktif" },
  { alan: "arsa", ad: "Arsa" },
  { alan: "ev", ad: "Ev" },
  { alan: "pdf", ad: "PDF" },
  { alan: "admin", ad: "Admin" },
];
const tarih = (s: string | null) => (s ? new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function Sayfa() {
  return (
    <Yetki gerekli="admin">
      <AdminPaneli />
    </Yetki>
  );
}

function AdminPaneli() {
  const ben = useProfil();
  const [liste, setListe] = useState<Profil[]>([]);
  const [yuk, setYuk] = useState(true);
  const [hata, setHata] = useState("");
  const [ara, setAra] = useState("");
  const [isleniyor, setIsleniyor] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYuk(true);
    const { data, error } = await supabase.from("profiller").select("*").order("olusturma", { ascending: false });
    if (error) setHata(hataMetni(error));
    else setListe(data as Profil[]);
    setYuk(false);
  }, []);
  useEffect(() => {
    yukle();
  }, [yukle]);

  const guncelle = async (p: Profil, degisim: Partial<Profil>) => {
    setIsleniyor(p.id);
    setHata("");
    const { error } = await supabase.from("profiller").update(degisim).eq("id", p.id);
    if (error) setHata(hataMetni(error));
    else setListe((l) => l.map((x) => (x.id === p.id ? { ...x, ...degisim } : x)));
    setIsleniyor(null);
  };

  // Şifreler geri çevrilemez biçimde saklandığı için gösterilemez; kullanıcıya sıfırlama bağlantısı gönderilir.
  const [bilgi, setBilgi] = useState("");
  const sifreSifirla = async (p: Profil) => {
    if (!confirm(`${p.eposta} adresine şifre sıfırlama bağlantısı gönderilsin mi? Kullanıcı yeni şifresini kendisi belirler.`)) return;
    setIsleniyor(p.id);
    setHata("");
    setBilgi("");
    const { error } = await supabase.auth.resetPasswordForEmail(p.eposta, { redirectTo: window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/" });
    if (error) setHata(hataMetni(error));
    else setBilgi(`${p.eposta} adresine şifre sıfırlama bağlantısı gönderildi.`);
    setIsleniyor(null);
  };

  const sil = async (p: Profil) => {
    if (!confirm(`${p.eposta} kullanıcısının kaydı silinsin mi? Kullanıcı tekrar giriş yaparsa onay bekleyen olarak görünür.`)) return;
    setIsleniyor(p.id);
    const { error } = await supabase.from("profiller").delete().eq("id", p.id);
    if (error) setHata(hataMetni(error));
    else setListe((l) => l.filter((x) => x.id !== p.id));
    setIsleniyor(null);
  };

  // Hiç yetki verilmemiş pasif kullanıcı = yeni kayıt (pasife alınanların yetkileri durur, burada görünmez).
  const bekleyen = liste.filter((p) => !p.aktif && !p.arsa && !p.ev && !p.pdf && !p.admin);
  const suzulmus = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase("tr");
    return liste.filter((p) => !q || p.eposta.toLocaleLowerCase("tr").includes(q) || (p.ad ?? "").toLocaleLowerCase("tr").includes(q));
  }, [liste, ara]);
  const aktifSayisi = liste.filter((p) => p.aktif).length;

  return (
    <>
      <header>
        <h1>Yönetim</h1>
        <p>Kullanıcıları onaylayın, yetkilerini düzenleyin. Değişiklikler kullanıcı sayfayı yenilediğinde geçerli olur.</p>
      </header>
      <main>
        {hata && <div className="uyari">⚠️ {hata}</div>}
        {bilgi && <div className="uyari" style={{ borderLeftColor: "var(--yesil)" }}>✅ {bilgi}</div>}

        <section className="kart">
          <h2>Özet</h2>
          <div className="oneriler">
            <div><div className="soluk">Toplam kullanıcı</div><b>{liste.length}</b></div>
            <div><div className="soluk">Aktif</div><b>{aktifSayisi} / {KULLANICI_SINIRI}</b>{aktifSayisi >= KULLANICI_SINIRI && <div className="eksi">Sınıra ulaşıldı</div>}</div>
            <div><div className="soluk">Onay bekleyen</div><b>{bekleyen.length}</b></div>
          </div>
        </section>

        {bekleyen.length > 0 && (
          <section className="kart">
            <h2>Onay bekleyenler</h2>
            <div className="admin-tablo">
              <table>
                <thead><tr><th>Ad</th><th>E-posta</th><th>Kayıt</th><th></th></tr></thead>
                <tbody>
                  {bekleyen.map((p) => (
                    <tr key={p.id}>
                      <td>{p.ad || "—"}</td>
                      <td>{p.eposta}</td>
                      <td>{tarih(p.olusturma)}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button disabled={isleniyor === p.id || aktifSayisi >= KULLANICI_SINIRI} onClick={() => guncelle(p, { aktif: true, arsa: true, ev: true })}>Onayla</button>{" "}
                        <button className="ikincil" disabled={isleniyor === p.id} onClick={() => sil(p)}>Reddet</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>Onaylanan kullanıcıya Arsa ve Ev yetkisi verilir; PDF ve Admin yetkisini aşağıdan ayrıca açın.</p>
          </section>
        )}

        <section className="kart">
          <h2>Kullanıcılar ve yetkiler</h2>
          <input placeholder="Ad veya e-posta ara…" value={ara} onChange={(e) => setAra(e.target.value)} style={{ width: "100%", maxWidth: 360, marginBottom: 12 }} />
          {yuk ? (
            <p className="soluk">Yükleniyor…</p>
          ) : (
            <div className="admin-tablo">
              <table>
                <thead>
                  <tr>
                    <th>Kullanıcı</th>
                    {ALANLAR.map((a) => <th key={a.alan} style={{ textAlign: "center" }}>{a.ad}</th>)}
                    <th>Son giriş</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {suzulmus.map((p) => (
                    <tr key={p.id} className={p.aktif ? "" : "pasif-satir"}>
                      <td>
                        <b>{p.ad || "—"}</b>{p.id === ben?.id && <span className="rozet p-orta" style={{ marginLeft: 6 }}>siz</span>}
                        <div className="soluk" style={{ fontSize: 12 }}>{p.eposta}</div>
                      </td>
                      {ALANLAR.map((a) => (
                        <td key={a.alan} style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            aria-label={`${p.eposta} ${a.ad}`}
                            checked={p[a.alan]}
                            disabled={isleniyor === p.id || (p.id === ben?.id && (a.alan === "admin" || a.alan === "aktif"))}
                            onChange={(e) => guncelle(p, { [a.alan]: e.target.checked })}
                          />
                        </td>
                      ))}
                      <td style={{ whiteSpace: "nowrap" }}>{tarih(p.son_giris)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="ikincil" style={{ height: 30, padding: "0 10px" }} disabled={isleniyor === p.id} onClick={() => sifreSifirla(p)} title="Kullanıcıya yeni şifre belirleme bağlantısı gönderir">Şifre sıfırla</button>{" "}
                        {p.id !== ben?.id && <button className="ikincil" style={{ height: 30, padding: "0 10px" }} disabled={isleniyor === p.id} onClick={() => sil(p)}>Sil</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="soluk" style={{ fontSize: 12, marginBottom: 0 }}>
            Pasif kullanıcı giriş yapabilir ama uygulamayı göremez. Kendi admin ve aktif yetkinizi kapatamazsınız. Silme, kullanıcının yetki kaydını siler; hesabı tamamen kaldırmak için Supabase panelinde Authentication &gt; Users bölümünü kullanın.
          </p>
        </section>

        <VeriSifresi />
      </main>
    </>
  );
}

function VeriSifresi() {
  const [sifre, setSifre] = useState("");
  const [kayitli, setKayitli] = useState<string | null>(null);
  const [goster, setGoster] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  useEffect(() => {
    veriSifresiGetir().then(setKayitli).catch(() => setKayitli(null));
  }, []);
  const kopyala = async () => {
    if (!kayitli) return;
    try {
      await navigator.clipboard.writeText(kayitli);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2500);
    } catch {}
  };
  const [mesaj, setMesaj] = useState("");
  const [bekle, setBekle] = useState(false);
  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekle(true);
    setMesaj("");
    try {
      await girisYap(sifre);
      await veriSifresiKaydet(sifre);
      setKayitli(sifre.trim());
      setSifre("");
      setMesaj("✅ Veri şifresi güncellendi.");
    } catch (h) {
      setMesaj(h instanceof SifreHatasi ? "⚠️ Bu şifre veri dosyasını açmıyor." : "⚠️ " + hataMetni(h));
    }
    setBekle(false);
  };
  return (
    <section className="kart">
      <h2>Veri şifresi</h2>
      <div className="erisim-satir">
        <div>
          <div className="soluk">Kayıtlı veri şifresi (GitHub'daki SITE_PASSWORD ile aynı olmalı)</div>
          <code className="gizli-deger">{kayitli == null ? "—" : goster ? kayitli : "•".repeat(Math.max(8, kayitli.length))}</code>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="ikincil" disabled={!kayitli} onClick={() => setGoster(!goster)}>{goster ? "Gizle" : "Göster"}</button>
          <button type="button" className="ikincil" disabled={!kayitli} onClick={kopyala}>{kopyalandi ? "Kopyalandı" : "Kopyala"}</button>
        </div>
      </div>
      <p className="soluk" style={{ fontSize: 12 }}>
        Bu şifre kullanıcılara gösterilmez; onaylı kullanıcılar giriş yaptığında uygulama tarafından otomatik kullanılır. Kullanıcı şifreleri ise Supabase'te
        geri çevrilemez biçimde (bcrypt) saklandığı için kimse tarafından görüntülenemez; şifresini unutan kullanıcıya yukarıdaki listeden "Şifre sıfırla" ile bağlantı gönderin.
      </p>
      <p style={{ margin: "12px 0 8px" }}><b>Veri şifresini değiştir</b> — GitHub'daki SITE_PASSWORD değiştiğinde yeni şifreyi girin. Kaydetmeden önce şifrenin veri dosyasını açtığı doğrulanır.</p>
      <form onSubmit={kaydet} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="password" required placeholder="Yeni veri şifresi" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="off" />
        <button type="submit" disabled={bekle}>{bekle ? "Doğrulanıyor…" : "Kaydet"}</button>
      </form>
      {mesaj && <p style={{ marginBottom: 0 }}>{mesaj}</p>}
    </section>
  );
}
