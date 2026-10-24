"use client";

import Link from "next/link";
import { useProfil, type Profil } from "../lib/oturum";

// Sayfa yetki kontrolü: kullanıcının ilgili yetkisi yoksa sayfa içeriği hiç oluşturulmaz.
export default function Yetki({ gerekli, children }: { gerekli: "arsa" | "ev" | "admin"; children: React.ReactNode }) {
  const p = useProfil();
  if (p?.[gerekli]) return <>{children}</>;
  const ilk = ilkSayfa(p);
  return (
    <main>
      <section className="kart">
        <h2>Bu bölüme erişim yetkiniz yok</h2>
        <p style={{ marginTop: 0 }}>Erişim için yöneticinizden yetki isteyin.</p>
        {ilk && <Link href={ilk.href}>{ilk.ad} sayfasına git →</Link>}
      </section>
    </main>
  );
}

// Kullanıcının yetkili olduğu ilk sayfa (menü ve yönlendirme için).
export function ilkSayfa(p: Profil | null) {
  if (p?.arsa) return { href: "/", ad: "Arsa Analizi" };
  if (p?.ev) return { href: "/ev", ad: "Ev Analiz" };
  if (p?.admin) return { href: "/admin", ad: "Yönetim" };
  return null;
}
