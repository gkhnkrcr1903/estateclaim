"use client";

import { useEffect, useState } from "react";
import { ilceKonumu, mahalleKonumu } from "../lib/arsa";

// Seçilen mahallenin (yoksa ilçenin) çevresindeki hastane, okul ve AVM'ler. Veri OpenStreetMap'ten
// scripts/yakin-yerler-cek.mjs ile il başına önceden çekilir (public/yakin/{il}.json); sayfa yalnızca seçilen ilin
// dosyasını indirir ve uzaklıkları tarayıcıda hesaplar.

interface Yer {
  ad: string;
  tur: "Hastane" | "Okul" | "AVM";
  alt: string; // özel / devlet / kamu, okul kademesi
  km: number;
  lat: number;
  lng: number;
}
type Kayit = ["H" | "O" | "A", string, string, number, number];
interface IlDosyasi {
  tarih: string;
  y: Kayit[];
  yok?: boolean;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const TUR = { H: "Hastane", O: "Okul", A: "AVM" } as const;
const onbellek = new Map<string, Promise<IlDosyasi>>();
const ilDosyasi = (il: string) => {
  if (!onbellek.has(il))
    onbellek.set(
      il,
      fetch(`${BASE}/yakin/${il}.json`).then((r) => {
        // 404: bu il için yakın yer verisi henüz derlenmedi (boş liste gibi davranılır).
        if (r.status === 404) return { tarih: "", y: [], yok: true };
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }),
    );
  const p = onbellek.get(il)!;
  p.catch(() => onbellek.delete(il)); // hata olursa bir sonraki denemede yeniden indir
  return p;
};

const uzaklik = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r);
  return Math.hypot(x, (c - a) * r) * 6371;
};

const GRUPLAR: { tur: Yer["tur"]; baslik: string; adet: number }[] = [
  { tur: "Hastane", baslik: "🏥 Hastaneler", adet: 5 },
  { tur: "Okul", baslik: "🏫 Okullar", adet: 8 },
  { tur: "AVM", baslik: "🛍️ AVM ve çarşılar", adet: 5 },
];

export default function YakinYerler({ il, ilce, mahalle }: { il: string; ilce: string; mahalle?: string }) {
  const [durum, setDurum] = useState<{ yuk: boolean; hata?: boolean; yok?: boolean; yerler?: Yer[]; tarih?: string }>({ yuk: true });
  const [deneme, setDeneme] = useState(0);
  const k = mahalle ? mahalleKonumu(il, ilce, mahalle) : ilceKonumu(il, ilce);
  const mahalleNoktasi = !!mahalle && !k.yaklasik;
  const yaricap = mahalleNoktasi ? { okul: 1.5, diger: 3 } : { okul: 2.5, diger: 5 };

  useEffect(() => {
    let iptal = false;
    setDurum((d) => ({ ...d, yuk: true, hata: false }));
    ilDosyasi(il)
      .then((dosya) => {
        if (iptal) return;
        const yerler = dosya.y
          .map(([t, alt, ad, lat, lng]) => ({ tur: TUR[t], alt, ad, lat, lng, km: Math.round(uzaklik(k.lat, k.lng, lat, lng) * 10) / 10 }))
          .filter((y) => y.km <= (y.tur === "Okul" ? yaricap.okul : yaricap.diger))
          .sort((a, b) => a.km - b.km);
        setDurum(dosya.yok ? { yuk: false, yok: true } : { yuk: false, yerler, tarih: dosya.tarih });
      })
      .catch(() => !iptal && setDurum({ yuk: false, hata: true }));
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [il, k.lat, k.lng, deneme]);

  const yer = mahalleNoktasi ? `${mahalle} mahallesi` : `${ilce} merkezi`;
  return (
    <div className="yakin-yerler">
      <h3>📍 {yer} çevresindeki hastane, okul ve AVM'ler</h3>
      {durum.yuk && !durum.yerler && <p className="soluk">Yükleniyor…</p>}
      {durum.yok && <p className="soluk">Bu il için hastane, okul ve AVM verisi henüz derlenmedi.</p>}
      {durum.hata && (
        <p className="soluk">
          Yakın yer verisi yüklenemedi.{" "}
          <button type="button" className="ikincil yazdirma" style={{ height: 28, padding: "0 10px", fontSize: 12 }} onClick={() => setDeneme((d) => d + 1)}>
            Tekrar dene
          </button>
        </p>
      )}
      {durum.yerler && (
        <div className="yakin-izgara">
          {GRUPLAR.map((g) => {
            const liste = durum.yerler!.filter((y) => y.tur === g.tur);
            return (
              <div key={g.tur}>
                <b>{g.baslik}</b> <span className="soluk">({liste.length})</span>
                {liste.length ? (
                  <ul>
                    {liste.slice(0, g.adet).map((y) => (
                      <li key={y.ad + y.lat}>
                        <a href={`https://www.openstreetmap.org/?mlat=${y.lat}&mlon=${y.lng}#map=17/${y.lat}/${y.lng}`} target="_blank" rel="noreferrer">{y.ad}</a>
                        <span className="soluk">{[y.alt, `${y.km.toLocaleString("tr-TR")} km`].filter(Boolean).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="soluk">Yakında kayıtlı yer yok.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="soluk" style={{ fontSize: 11, marginBottom: 0 }}>
        Kaynak: OpenStreetMap katkıcıları (ODbL){durum.tarih ? `, ${durum.tarih} tarihli derleme` : ""}. {mahalleNoktasi ? "Mahalle noktasına" : mahalle ? "Mahalle koordinatı olmadığından ilçe merkezine" : "Mahalle seçilmediğinden ilçe merkezine"} göre kuş uçuşu uzaklık; okullar{" "}
        {yaricap.okul.toLocaleString("tr-TR")} km, hastane ve AVM'ler {yaricap.diger.toLocaleString("tr-TR")} km içinde. Özel/devlet ayrımı adından çıkarılır; kayıtlar eksik olabilir.
      </p>
    </div>
  );
}
