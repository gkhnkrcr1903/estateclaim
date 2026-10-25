"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase, useProfil } from "../lib/oturum";
import { cikisYap } from "../lib/veri";

// Kurumsal logo: kalkan biçiminde amblem, içinde parsel ızgarası üzerinde yükselen bina silueti.
export function Logo({ boyut = 34 }: { boyut?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={boyut} height={boyut} aria-hidden="true">
      <defs>
        <linearGradient id="logo-zemin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b6cff" />
          <stop offset="1" stopColor="#123a9c" />
        </linearGradient>
      </defs>
      <path d="M20 2 L35 7.5 V19 C35 28.5 28.6 35 20 38 C11.4 35 5 28.5 5 19 V7.5 Z" fill="url(#logo-zemin)" />
      <path d="M20 2 L35 7.5 V19 C35 28.5 28.6 35 20 38 C11.4 35 5 28.5 5 19 V7.5 Z" fill="none" stroke="#c9a961" strokeWidth="1.4" />
      {/* parsel çizgileri */}
      <path d="M10 27.5 H30 M13 31 H27" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round" />
      {/* binalar */}
      <rect x="12" y="17" width="5" height="9" rx="0.6" fill="#ffffff" fillOpacity="0.85" />
      <rect x="18" y="11" width="6" height="15" rx="0.6" fill="#ffffff" />
      <rect x="25" y="15" width="4" height="11" rx="0.6" fill="#ffffff" fillOpacity="0.85" />
      <path d="M19.6 14 h2.8 M19.6 17 h2.8 M19.6 20 h2.8" stroke="#123a9c" strokeWidth="1.1" />
      <circle cx="29.5" cy="10.5" r="1.6" fill="#c9a961" />
    </svg>
  );
}

// Marka çubuğu: logo, uygulama adı, sayfa bağlantıları (geçerli sayfa vurgulanır) ve kullanıcı/çıkış.
export default function Menu() {
  const yol = usePathname();
  const p = useProfil();
  // Paylaşılan raporda uygulama menüsü gösterilmez; rapor danışmanın kendi başlığıyla açılır.
  if (yol?.startsWith("/paylasim")) return null;
  const aktif = (h: string) => (h === "/" ? yol === "/" : yol?.startsWith(h));
  return (
    <nav className="menu">
      <Link href="/" className="marka">
        <Logo />
        <span>
          <b>Ev/Arsa Analiz</b>
          <small>Gayrimenkul Analiz</small>
        </span>
      </Link>
      <div className="menu-baglanti">
        {p?.arsa && <Link href="/" className={aktif("/") ? "aktif" : ""}>Arsa Analizi</Link>}
        {p?.ev && <Link href="/ev" className={aktif("/ev") ? "aktif" : ""}>Ev Analiz</Link>}
        {p?.aktif && <Link href="/kaynaklar" className={aktif("/kaynaklar") ? "aktif" : ""}>Kaynaklar</Link>}
        {p?.admin && <Link href="/admin" className={aktif("/admin") ? "aktif" : ""}>Yönetim</Link>}
      </div>
      {p && (
        <div className="kullanici-menu">
          <span className="avatar" aria-hidden="true">{(p.ad || p.eposta).trim().charAt(0).toLocaleUpperCase("tr")}</span>
          <span className="kullanici-ad" title={p.eposta}>{p.ad || p.eposta}</span>
          {p.pdf && <Link href="/rapor-ayarlari" className={`rapor-ayar-baglanti${aktif("/rapor-ayarlari") ? " aktif" : ""}`} title="PDF rapor ayarları (logo, ofis bilgileri)">Rapor ayarları</Link>}
          <button
            type="button"
            className="cikis"
            onClick={async () => {
              cikisYap();
              await supabase.auth.signOut();
            }}
          >
            Çıkış
          </button>
        </div>
      )}
    </nav>
  );
}
