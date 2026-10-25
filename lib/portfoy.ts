import { supabase } from "./oturum";
import type { EvBilgisi } from "./ev";
import type { Arsa } from "./arsa";

// Müşteri ve portföy kayıtları (supabase/portfoy.sql). Her danışman yalnızca kendi kayıtlarını görür.

export const MUSTERI_TURLERI = ["Alıcı", "Satıcı", "Kiracı", "Ev sahibi", "Yatırımcı"] as const;
export type MusteriTuru = (typeof MUSTERI_TURLERI)[number];
export const PORTFOY_DURUMLARI = ["Aktif", "Opsiyonlu", "Satıldı", "Kiralandı", "İptal"] as const;
export type PortfoyDurumu = (typeof PORTFOY_DURUMLARI)[number];

export interface Musteri {
  id: string;
  ad: string;
  telefon: string | null;
  eposta: string | null;
  tur: MusteriTuru;
  butce_min: number | null;
  butce_max: number | null;
  notlar: string | null;
  olusturma: string;
  guncelleme: string;
}

export interface PortfoyOzeti {
  tahmini?: number;
  karar?: string;
}

export interface PortfoyKaydi<T = EvBilgisi | Arsa> {
  id: string;
  musteri_id: string | null;
  tur: "ev" | "arsa";
  baslik: string;
  il: string;
  ilce: string | null;
  mahalle: string | null;
  durum: PortfoyDurumu;
  fiyat: number | null;
  veri: T;
  ozet: PortfoyOzeti | null;
  notlar: string | null;
  olusturma: string;
  guncelleme: string;
}

// Tablo kurulmamışsa anlaşılır mesaj
export function portfoyHatasi(e: unknown): string | null {
  const m = String((e as Error)?.message ?? e);
  return /musteriler|portfoy|ekspertiz_firma/.test(m) && /does not exist|schema cache|column/.test(m)
    ? "Portföy tabloları henüz kurulmamış (supabase/portfoy.sql çalıştırılmalı)."
    : null;
}

// ---- Müşteriler
export async function musterileriGetir(): Promise<Musteri[]> {
  const { data, error } = await supabase.from("musteriler").select("*").order("guncelleme", { ascending: false });
  if (error) throw error;
  return data as Musteri[];
}

export async function musteriKaydet(m: Partial<Musteri> & { ad: string }): Promise<Musteri> {
  const alanlar = {
    ad: m.ad.trim(),
    telefon: m.telefon?.trim() || null,
    eposta: m.eposta?.trim() || null,
    tur: m.tur ?? "Alıcı",
    butce_min: m.butce_min || null,
    butce_max: m.butce_max || null,
    notlar: m.notlar?.trim() || null,
  };
  const sorgu = m.id ? supabase.from("musteriler").update(alanlar).eq("id", m.id) : supabase.from("musteriler").insert(alanlar);
  const { data, error } = await sorgu.select("*").single();
  if (error) throw error;
  return data as Musteri;
}

export async function musteriSil(id: string) {
  const { error } = await supabase.from("musteriler").delete().eq("id", id);
  if (error) throw error;
}

// ---- Portföy
export async function portfoyGetir(tur?: "ev" | "arsa"): Promise<PortfoyKaydi[]> {
  let q = supabase.from("portfoy").select("*").order("guncelleme", { ascending: false });
  if (tur) q = q.eq("tur", tur);
  const { data, error } = await q;
  if (error) throw error;
  return data as PortfoyKaydi[];
}

export async function portfoyKaydiGetir(id: string): Promise<PortfoyKaydi | null> {
  const { data, error } = await supabase.from("portfoy").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as PortfoyKaydi | null;
}

export async function portfoyKaydet(k: Omit<PortfoyKaydi, "id" | "olusturma" | "guncelleme" | "durum" | "musteri_id" | "notlar"> & Partial<Pick<PortfoyKaydi, "id" | "durum" | "musteri_id" | "notlar">>): Promise<PortfoyKaydi> {
  const { id, ...alanlar } = k;
  const sorgu = id ? supabase.from("portfoy").update(alanlar).eq("id", id) : supabase.from("portfoy").insert(alanlar);
  const { data, error } = await sorgu.select("*").single();
  if (error) throw error;
  return data as PortfoyKaydi;
}

export async function portfoyGuncelle(id: string, degisim: Partial<Pick<PortfoyKaydi, "durum" | "musteri_id" | "notlar" | "baslik" | "veri" | "ozet" | "fiyat">>) {
  const { error } = await supabase.from("portfoy").update(degisim).eq("id", id);
  if (error) throw error;
}

export async function portfoySil(id: string) {
  const { error } = await supabase.from("portfoy").delete().eq("id", id);
  if (error) throw error;
}
