import type { Metadata } from "next";
import Link from "next/link";
import Giris from "../components/Giris";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arsa Analiz",
  description: "İl/ilçe bazında arsa imar durumu ve değerlenme potansiyeli analizi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Giris>
          <nav className="menu">
            <Link href="/">🗺️ Arsa Analizi</Link>
            <Link href="/ev">🏠 Bu ev alınır mı?</Link>
          </nav>
          {children}
        </Giris>
      </body>
    </html>
  );
}
