"use client";

import { useEffect, useState } from "react";
import { ilceKonumu, mahalleKonumu } from "../lib/arsa";

// Seçilen mahallenin (yoksa ilçenin) çevresindeki hastane, okul ve AVM'leri OpenStreetMap'ten
// (Overpass API) tarayıcıda çeker. Sunucular yoğun olabildiği için sırayla denenir; sonuç oturum boyunca saklanır.

interface Yer {
  ad: string;
  tur: "Hastane" | "Okul" | "AVM";
  alt: string; // özel / devlet / kamu vb.
  km: number;
  lat: number;
  lng: number;
}

const SUNUCULAR = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const uzaklik = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r);
  return Math.hypot(x, (c - a) * r) * 6371;
};

// OSM'de aile sağlığı merkezi, kurs ve halk eğitim gibi kayıtlar da hastane/okul etiketli olabilir; bunlar elenir.
const HASTANE_DISI = /aile sağlığı|asm\b|sağlık ocağı|ağız ve diş|diş hastanesi|veteriner|tıbbiye binası|poliklini|dispanser|tıp merkezi|sağlık merkezi|laboratuvar|fizik tedavi/i;
const OKUL_DISI = /halk eğitim|eğitim merkezi|kurs|sürücü|dershane|etüt|anaokulu|kreş|üniversite|fakülte|yüksekokul/i;

function sinifla(t: Record<string, string>): { tur: Yer["tur"]; alt: string } | null {
  const ad = t.name ?? "";
  const ozel = /^özel\b|\bözel\b/i.test(ad) || t["operator:type"] === "private";
  if (t.amenity === "hospital") {
    if (!ad || HASTANE_DISI.test(ad)) return null;
    const kamu = t["operator:type"] === "government" || /devlet|şehir hastanesi|eğitim ve araştırma|numune|sağlık bakanlığı|üniversite/i.test(ad);
    return { tur: "Hastane", alt: ozel ? "Özel" : kamu ? "Kamu" : "" };
  }
  if (t.amenity === "school") {
    if (!ad || OKUL_DISI.test(ad)) return null;
    const kademe = /lise/i.test(ad) ? "Lise" : /ortaokul/i.test(ad) ? "Ortaokul" : /ilkokul|ilköğretim/i.test(ad) ? "İlkokul" : "";
    return { tur: "Okul", alt: [ozel ? "Özel" : "Devlet", kademe].filter(Boolean).join(" · ") };
  }
  if (t.shop === "mall") return ad ? { tur: "AVM", alt: "" } : null;
  return null;
}

function ayikla(j: { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] }, lat: number, lng: number): Yer[] {
  const goruldu = new Set<string>();
  const yerler: Yer[] = [];
  for (const e of j.elements) {
    const p = e.center ?? (e.lat !== undefined ? { lat: e.lat, lon: e.lon! } : null);
    const s = e.tags && sinifla(e.tags);
    if (!p || !s) continue;
    const ad = e.tags!.name;
    if (goruldu.has(s.tur + ad)) continue; // aynı yer hem nokta hem alan olarak girilmiş olabilir
    goruldu.add(s.tur + ad);
    yerler.push({ ad, ...s, km: Math.round(uzaklik(lat, lng, p.lat, p.lon) * 10) / 10, lat: p.lat, lng: p.lon });
  }
  return yerler.sort((a, b) => a.km - b.km);
}

// Sunucular 6 sn arayla devreye girer; ilk başarılı cevap alınır, diğer istekler iptal edilir.
async function cek(lat: number, lng: number, yaricap: { okul: number; diger: number }): Promise<Yer[]> {
  const q = `[out:json][timeout:25];(nwr(around:${yaricap.diger},${lat},${lng})[amenity=hospital];nwr(around:${yaricap.okul},${lat},${lng})[amenity=school];nwr(around:${yaricap.diger},${lat},${lng})[shop=mall];);out center tags;`;
  const iptaller = SUNUCULAR.map(() => new AbortController());
  const zamanlar: ReturnType<typeof setTimeout>[] = [];
  const dene = (u: string, i: number) =>
    new Promise<Yer[]>((coz, reddet) => {
      zamanlar.push(
        setTimeout(async () => {
          zamanlar.push(setTimeout(() => iptaller[i].abort(), 30000));
          try {
            const r = await fetch(u, { method: "POST", signal: iptaller[i].signal, body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
            if (!r.ok) throw new Error("HTTP " + r.status);
            coz(ayikla(await r.json(), lat, lng));
          } catch (h) {
            reddet(h);
          }
        }, i * 6000),
      );
    });
  try {
    return await Promise.any(SUNUCULAR.map(dene));
  } finally {
    zamanlar.forEach(clearTimeout);
    iptaller.forEach((c) => c.abort());
  }
}

const GRUPLAR: { tur: Yer["tur"]; baslik: string }[] = [
  { tur: "Hastane", baslik: "🏥 Hastaneler" },
  { tur: "Okul", baslik: "🏫 Okullar" },
  { tur: "AVM", baslik: "🛍️ AVM ve çarşılar" },
];

export default function YakinYerler({ il, ilce, mahalle }: { il: string; ilce: string; mahalle?: string }) {
  const [durum, setDurum] = useState<{ yuk: boolean; hata?: string; yerler?: Yer[] }>({ yuk: true });
  const [deneme, setDeneme] = useState(0);
  const k = mahalle ? mahalleKonumu(il, ilce, mahalle) : ilceKonumu(il, ilce);
  const mahalleNoktasi = !!mahalle && !k.yaklasik;
  const yaricap = mahalleNoktasi ? { okul: 1500, diger: 3000 } : { okul: 2500, diger: 5000 };
  const anahtar = `yakin:${k.lat},${k.lng},${yaricap.okul}`;

  useEffect(() => {
    let iptal = false;
    try {
      const kayit = sessionStorage.getItem(anahtar);
      if (kayit) {
        setDurum({ yuk: false, yerler: JSON.parse(kayit) });
        return;
      }
    } catch {}
    setDurum({ yuk: true });
    cek(k.lat, k.lng, yaricap)
      .then((yerler) => {
        if (iptal) return;
        setDurum({ yuk: false, yerler });
        try {
          sessionStorage.setItem(anahtar, JSON.stringify(yerler));
        } catch {}
      })
      .catch(() => !iptal && setDurum({ yuk: false, hata: "Harita sunucuları şu an yoğun." }));
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar, deneme]);

  const yer = mahalleNoktasi ? `${mahalle} mahallesi` : `${ilce} merkezi`;
  return (
    <div className="yakin-yerler">
      <h3>📍 {yer} çevresindeki hastane, okul ve AVM'ler</h3>
      {durum.yuk && <p className="soluk">OpenStreetMap'ten yükleniyor…</p>}
      {durum.hata && (
        <p className="soluk">
          {durum.hata}{" "}
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
                    {liste.slice(0, g.tur === "Okul" ? 8 : 5).map((y) => (
                      <li key={y.ad}>
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
        Kaynak: OpenStreetMap katkıcıları (ODbL). {mahalleNoktasi ? "Mahalle noktasına" : "Mahalle koordinatı olmadığından ilçe merkezine"} göre kuş uçuşu uzaklık; okullar {(yaricap.okul / 1000).toLocaleString("tr-TR")} km,
        hastane ve AVM'ler {yaricap.diger / 1000} km içinde. Özel/devlet ayrımı okul adından çıkarılır; kayıtlar eksik olabilir.
      </p>
    </div>
  );
}
