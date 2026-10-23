"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Marka çubuğu: logo, uygulama adı ve sayfa bağlantıları; geçerli sayfa vurgulanır.
export default function Menu() {
  const yol = usePathname();
  const aktif = (h: string) => (h === "/" ? yol === "/" : yol?.startsWith(h));
  return (
    <nav className="menu">
      <Link href="/" className="marka">
        <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="currentColor" opacity="0.14" />
          <path d="M6 23 L13 12 L18 18 L21 14 L26 23 Z" fill="currentColor" />
          <circle cx="22" cy="9" r="2.4" fill="currentColor" />
        </svg>
        <span>
          <b>Arsa Analiz</b>
          <small>Gayrimenkul değerleme</small>
        </span>
      </Link>
      <div className="menu-baglanti">
        <Link href="/" className={aktif("/") ? "aktif" : ""}>Arsa Analizi</Link>
        <Link href="/ev" className={aktif("/ev") ? "aktif" : ""}>Bu ev alınır mı?</Link>
      </div>
    </nav>
  );
}
