import { createClient } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

// Kullanıcı girişi ve yetkiler Supabase'te tutulur (supabase/kurulum.sql). Proje adresi ve "publishable" anahtar
// herkese açık değerlerdir; erişim, veritabanındaki satır güvenliği (RLS) kurallarıyla sınırlanır.
const SUPABASE_URL = "https://ylyjcarnydrumlrkvlyw.supabase.co";
const SUPABASE_ANAHTAR = "sb_publishable_ox-kuDNVRlldHHSO71nHIw_K20AB7r_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANAHTAR, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export interface Profil {
  id: string;
  eposta: string;
  ad: string | null;
  aktif: boolean;
  admin: boolean;
  arsa: boolean;
  ev: boolean;
  pdf: boolean;
  olusturma: string;
  son_giris: string | null;
}

export async function profilGetir(): Promise<Profil | null> {
  // Oturum tarayıcıda saklıdır; sunucuya ayrıca sorulmaz (yetkiyi veritabanı RLS ile her istekte denetler).
  const { data: o } = await supabase.auth.getSession();
  const user = o.session?.user;
  if (!user) return null;
  const { data, error } = await supabase.from("profiller").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  // Profil satırı yoksa (ör. admin sildiyse) kullanıcı onaysız sayılır.
  return data ?? { id: user.id, eposta: user.email ?? "", ad: null, aktif: false, admin: false, arsa: false, ev: false, pdf: false, olusturma: "", son_giris: null };
}

// Şifreli veri dosyasını açan site şifresi; yalnızca aktif kullanıcılar okuyabilir.
export async function veriSifresiGetir(): Promise<string | null> {
  const { data } = await supabase.from("ayarlar").select("deger").eq("anahtar", "veri_sifresi").maybeSingle();
  return data?.deger ?? null;
}

export async function veriSifresiKaydet(sifre: string) {
  const { error } = await supabase.from("ayarlar").upsert({ anahtar: "veri_sifresi", deger: sifre.trim() });
  if (error) throw error;
}

export const girisKaydet = () => supabase.rpc("giris_kaydet");

// Supabase hata iletilerinin Türkçesi (sık görülenler).
export function hataMetni(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(m)) return "E-posta veya şifre hatalı.";
  if (/already registered|already exists/i.test(m)) return "Bu e-posta ile zaten kayıt olunmuş; giriş yapın.";
  if (/password should be at least/i.test(m)) return "Şifre en az 6 karakter olmalı.";
  if (/email not confirmed/i.test(m)) return "E-posta adresiniz henüz doğrulanmadı; gelen kutunuzu kontrol edin.";
  if (/signups? (are|is) disabled|provider is disabled|signups not allowed/i.test(m)) return "E-posta ile kayıt şu an kapalı; yöneticiye bildirin.";
  if (/rate limit/i.test(m)) return "Çok fazla deneme yapıldı; birkaç dakika sonra tekrar deneyin.";
  if (/invalid email|unable to validate email/i.test(m)) return "Geçerli bir e-posta adresi girin.";
  if (/son aktif admin/i.test(m)) return "Son aktif admin kaldırılamaz.";
  if (/failed to fetch|network/i.test(m)) return "Sunucuya ulaşılamadı; bağlantınızı kontrol edin.";
  return m;
}

export const ProfilBaglami = createContext<Profil | null>(null);
export const useProfil = () => useContext(ProfilBaglami);
