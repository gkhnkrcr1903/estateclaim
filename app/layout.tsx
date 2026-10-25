import type { Metadata } from "next";
import Link from "next/link";
import Giris from "../components/Giris";
import Menu from "../components/Menu";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ev/Arsa Analiz",
  description: "İl/ilçe bazında arsa imar durumu ve değerlenme potansiyeli analizi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Giris>
          <Menu />
          {children}
          <footer className="alt-bilgi">
            Ev/Arsa Analiz · Kural tabanlı analiz aracıdır; ekspertiz veya yatırım tavsiyesi değildir. Veriler: TÜİK, TCMB, DASK, Wikidata, OpenStreetMap, PTT. · <Link href="/neden">Neden Ev/Arsa Analiz?</Link>
          </footer>
        </Giris>
      </body>
    </html>
  );
}
