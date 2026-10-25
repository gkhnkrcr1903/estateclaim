import { supabase } from "./oturum";

// PDF raporlarında kullanılan ofis/danışman kimliği (supabase/rapor-kimligi.sql). Her kullanıcı kendi kaydını tutar.
export interface RaporKimligi {
  ofis_adi: string;
  danisman_adi: string;
  unvan: string;
  telefon: string;
  eposta: string;
  adres: string;
  web: string;
  yetki_belge_no: string;
  logo: string | null; // data URL
}

export const BOS_KIMLIK: RaporKimligi = { ofis_adi: "", danisman_adi: "", unvan: "", telefon: "", eposta: "", adres: "", web: "", yetki_belge_no: "", logo: null };

const OLAY = "rapor-kimligi-guncellendi";
let onbellek: Promise<RaporKimligi | null> | null = null;

export function raporKimligiGetir(): Promise<RaporKimligi | null> {
  onbellek ??= (async () => {
    const { data: o } = await supabase.auth.getSession();
    const id = o.session?.user.id;
    if (!id) return null;
    const { data, error } = await supabase.from("rapor_kimlikleri").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const k = { ...BOS_KIMLIK };
    for (const a of Object.keys(k) as (keyof RaporKimligi)[]) if (data[a] != null) (k as Record<string, unknown>)[a] = data[a];
    return k;
  })().catch((e) => {
    onbellek = null;
    throw e;
  });
  return onbellek;
}

export async function raporKimligiKaydet(k: RaporKimligi) {
  const { data: o } = await supabase.auth.getSession();
  const id = o.session?.user.id;
  if (!id) throw new Error("Oturum bulunamadı");
  const temiz = Object.fromEntries(Object.entries(k).map(([a, d]) => [a, typeof d === "string" ? d.trim() || null : d]));
  const { error } = await supabase.from("rapor_kimlikleri").upsert({ id, ...temiz, guncelleme: new Date().toISOString() });
  if (error) throw error;
  onbellek = Promise.resolve(k);
  window.dispatchEvent(new Event(OLAY));
}

export function raporKimligiDinle(f: () => void) {
  window.addEventListener(OLAY, f);
  return () => window.removeEventListener(OLAY, f);
}

export const raporOnbellekTemizle = () => {
  onbellek = null;
};

// Logo dosyasını tarayıcıda en fazla 480×200 piksele küçültür; şeffaflık korunur (PNG), çok büyükse JPEG'e düşer.
export async function logoKucult(dosya: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp|svg\+xml|gif)$/.test(dosya.type)) throw new Error("Logo PNG, JPG, WEBP, SVG veya GIF olmalı.");
  if (dosya.size > 5 * 1024 * 1024) throw new Error("Logo dosyası 5 MB'tan küçük olmalı.");
  const url = URL.createObjectURL(dosya);
  try {
    const img = await new Promise<HTMLImageElement>((coz, reddet) => {
      const i = new Image();
      i.onload = () => coz(i);
      i.onerror = () => reddet(new Error("Görsel okunamadı."));
      i.src = url;
    });
    const oran = Math.min(1, 480 / (img.naturalWidth || 480), 200 / (img.naturalHeight || 200));
    const w = Math.max(1, Math.round((img.naturalWidth || 480) * oran));
    const h = Math.max(1, Math.round((img.naturalHeight || 200) * oran));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    let sonuc = c.toDataURL("image/png");
    if (sonuc.length > 150_000) {
      // JPEG şeffaflığı desteklemez: siyah zemin olmasın diye beyaz zemine yeniden çizilir.
      const g = c.getContext("2d")!;
      g.globalCompositeOperation = "destination-over";
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      sonuc = c.toDataURL("image/jpeg", 0.85);
    }
    if (sonuc.length > 190_000) throw new Error("Logo küçültüldükten sonra da çok büyük; daha sade bir görsel deneyin.");
    return sonuc;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// PDF başlığındaki rapor türü (ör. "Satıcı Fiyatlandırma Raporu"); sayfalar ayarlar, RaporUst okur.
let raporBasligi = "Gayrimenkul Ön Analiz Raporu";
const BASLIK_OLAYI = "rapor-basligi-degisti";
export function raporBasligiAyarla(b: string) {
  if (b === raporBasligi) return;
  raporBasligi = b;
  window.dispatchEvent(new Event(BASLIK_OLAYI));
}
export const raporBasligiAl = () => raporBasligi;
export function raporBasligiDinle(f: () => void) {
  window.addEventListener(BASLIK_OLAYI, f);
  return () => window.removeEventListener(BASLIK_OLAYI, f);
}
