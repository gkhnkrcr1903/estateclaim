import { supabase } from "./oturum";
import { raporKimligiGetir, type RaporKimligi } from "./rapor";
import type { EvBilgisi, EvSonuc } from "./ev";
import type { SaticiRaporu } from "./satici";

// Paylaşılabilir rapor bağlantıları (supabase/paylasim.sql). Paylaşılan şey, hesaplanmış sonucun o anki kopyasıdır;
// müşteri giriş yapmadan yalnızca bu kopyayı görür.

export type PaylasimTuru = "ev-alici" | "ev-satici";

export interface PaylasimVerisi {
  e: EvBilgisi;
  s: EvSonuc;
  f?: SaticiRaporu;
  kimlik: RaporKimligi | null;
  hazirlayan: { ad: string | null; eposta: string };
  ilAd: string;
}

export interface Paylasim {
  tur: PaylasimTuru;
  baslik: string;
  veri: PaylasimVerisi;
  olusturma: string;
  bitis: string;
}

export interface PaylasimOzeti {
  id: string;
  tur: PaylasimTuru;
  baslik: string;
  olusturma: string;
  bitis: string;
  goruntulenme: number;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const paylasimAdresi = (id: string) => `${window.location.origin}${BASE}/paylasim/?id=${id}`;

export async function paylasimOlustur(tur: PaylasimTuru, baslik: string, veri: Omit<PaylasimVerisi, "kimlik">): Promise<string> {
  const kimlik = await raporKimligiGetir().catch(() => null);
  const { data, error } = await supabase.from("paylasimlar").insert({ tur, baslik, veri: { ...veri, kimlik } }).select("id").single();
  if (error) throw error;
  return paylasimAdresi(data.id);
}

export async function paylasimGetir(id: string): Promise<Paylasim | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.rpc("paylasim_getir", { p_id: id });
  if (error) throw error;
  return (data as Paylasim | null) ?? null;
}

export async function paylasimlarim(): Promise<PaylasimOzeti[]> {
  const { data, error } = await supabase.from("paylasimlar").select("id, tur, baslik, olusturma, bitis, goruntulenme").order("olusturma", { ascending: false }).limit(50);
  if (error) throw error;
  return data as PaylasimOzeti[];
}

export async function paylasimSil(id: string) {
  const { error } = await supabase.from("paylasimlar").delete().eq("id", id);
  if (error) throw error;
}
