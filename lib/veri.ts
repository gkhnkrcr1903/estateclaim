// Şifreli veri dosyasının çözülmesi ve uygulama genelinde tutulması.

export interface IlVerisi {
  kod: string;
  ad: string;
  ilceler: string[];
  mahalleler: Record<string, string[]>; // ilçe → mahalle listesi
  lat: number;
  lng: number;
  nufus: number;
  buyume: number; // yıllık ortalama nüfus artışı, binde
  satisM2: number;
  satisKaynak: "TCMB" | "tahmini";
  kiraM2: number;
}

export interface Veri {
  guncelleme: string;
  kaynaklar: string[];
  konutDonemi: string;
  nufusYili?: number;
  iller: IlVerisi[];
}

let mevcut: Veri | null = null;

export function veri(): Veri {
  if (!mevcut) throw new Error("Veri henüz çözülmedi");
  return mevcut;
}

export function veriAyarla(v: Veri) {
  mevcut = v;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ANAHTAR_SAKLAMA = "arsa-analiz:anahtar";
const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

interface Sifreli {
  v: number;
  iter: number;
  salt: string;
  iv: string;
  data: string;
}

async function indir(): Promise<Sifreli> {
  const r = await fetch(`${BASE}/veri.enc.json?t=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Veri dosyası indirilemedi");
  return r.json();
}

async function anahtarTuret(sifre: string, s: Sifreli) {
  const temel = await crypto.subtle.importKey("raw", new TextEncoder().encode(sifre), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(s.salt), iterations: s.iter, hash: "SHA-256" },
    temel,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"],
  );
}

async function coz(s: Sifreli, anahtar: CryptoKey): Promise<Veri> {
  const acik = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(s.iv) }, anahtar, b64(s.data));
  // v2: içerik şifrelemeden önce gzip ile sıkıştırılmıştır.
  const metin = s.v >= 2
    ? await new Response(new Blob([acik]).stream().pipeThrough(new DecompressionStream("gzip"))).text()
    : new TextDecoder().decode(acik);
  return JSON.parse(metin);
}

export class SifreHatasi extends Error {}

// Şifreyle giriş: başarılıysa veriyi çözer ve şifreyi (oturum boyunca) saklar.
export async function girisYap(sifre: string): Promise<Veri> {
  sifre = sifre.trim();
  const s = await indir();
  let v: Veri;
  try {
    v = await coz(s, await anahtarTuret(sifre, s));
  } catch {
    throw new SifreHatasi("Şifre hatalı");
  }
  try {
    sessionStorage.setItem(ANAHTAR_SAKLAMA, sifre);
  } catch {}
  veriAyarla(v);
  return v;
}

// Sayfa yenilendiğinde veya "güncel veriyi çek" butonunda: saklı şifreyle en son dosyayı tekrar indirip çözer.
export async function yenidenYukle(): Promise<Veri | null> {
  let sifre: string | null = null;
  try {
    sifre = sessionStorage.getItem(ANAHTAR_SAKLAMA);
  } catch {}
  if (!sifre) return null;
  try {
    return await girisYap(sifre);
  } catch {
    cikisYap();
    return null;
  }
}

export function cikisYap() {
  mevcut = null;
  try {
    sessionStorage.removeItem(ANAHTAR_SAKLAMA);
  } catch {}
}
