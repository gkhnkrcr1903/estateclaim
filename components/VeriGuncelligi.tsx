"use client";

import type { Veri } from "../lib/veri";
import { YAPI_MALIYET_YILI } from "../lib/ev";

interface Kaynak {
  ad: string;
  donem: string;
  nasil: string;
  eski: boolean;
  ornek?: boolean;
}

// "2026-Q3" veya "2026 Ç1" biçimindeki çeyreğin bittiği tarih
function ceyrekSonu(donem: string): Date | null {
  const m = donem.match(/(\d{4})\D*(?:Q|Ç)\s*(\d)/i);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) * 3, 0);
}

function kaynaklar(v: Veri, bugun = new Date()): Kaynak[] {
  const gun = (d: Date) => (bugun.getTime() - d.getTime()) / 86_400_000;
  const tcmbSon = ceyrekSonu(v.konutDonemi);
  const nufusYili = v.nufusYili ?? 2025;
  return [
    {
      ad: "Konut m² fiyatları (TCMB EVDS)",
      donem: v.konutDonemi,
      nasil: "Otomatik: her ayın 20'si",
      // TCMB çeyrek verisini yaklaşık 2–3 ay sonra yayımlar; 7 aydan eskiyse güncelleme aksamış demektir.
      eski: tcmbSon ? gun(tcmbSon) > 210 : false,
    },
    {
      ad: "Nüfus ve nüfus artışı (TÜİK ADNKS)",
      donem: String(nufusYili),
      nasil: "Yılda bir (Şubat), elle",
      // N yılının ADNKS verisi N+1 Şubat'ında yayımlanır; N+2 Mart'ından sonra yenisi çıkmış olmalıdır.
      eski: bugun > new Date(nufusYili + 2, 2, 1),
    },
    {
      ad: "Yapı maliyeti (Bakanlık tebliği)",
      donem: String(YAPI_MALIYET_YILI),
      nasil: "Yılda bir (Ocak–Şubat), elle",
      eski: bugun > new Date(YAPI_MALIYET_YILI + 1, 2, 1),
    },
    { ad: "İl / ilçe / mahalle listesi (PTT)", donem: v.guncelleme, nasil: "Her yayında", eski: false },
    { ad: "Arsa ilanları ve tapu durumları", donem: "—", nasil: "Gerçek kaynak yok", eski: false, ornek: true },
  ];
}

export default function VeriGuncelligi({ v }: { v: Veri }) {
  const liste = kaynaklar(v);
  const eskiSayisi = liste.filter((k) => k.eski).length;
  return (
    <details className="guncellik">
      <summary>
        {eskiSayisi ? <span className="eksi">⚠️ {eskiSayisi} veri güncel değil</span> : <span>✅ Veriler güncel</span>} · Kaynaklar
      </summary>
      <table>
        <thead><tr><th>Veri</th><th>Dönem</th><th>Güncelleme</th><th></th></tr></thead>
        <tbody>
          {liste.map((k) => (
            <tr key={k.ad} style={{ cursor: "default" }}>
              <td>{k.ad}</td>
              <td>{k.donem}</td>
              <td className="soluk">{k.nasil}</td>
              <td>{k.ornek ? <span className="rozet r-Orta">Örnek</span> : k.eski ? <span className="rozet p-dusuk">Eski</span> : <span className="rozet p-yuksek">Güncel</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="soluk" style={{ margin: "6px 0 0" }}>
        Tüm öneri ve hesaplamalar bu verilerden anlık üretilir; veri güncellenince öneriler de kendiliğinden güncellenir.
        "Güncel veriyi çek" yayındaki en son veriyi indirir.
      </p>
    </details>
  );
}
