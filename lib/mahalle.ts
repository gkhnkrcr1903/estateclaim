import { useEffect, useState } from "react";

// İl başına mahalle listesi ve koordinatları (public/mahalle/{il}.json). Herkese açık veridir (PTT, Wikidata);
// şifreli pakete konmaz, böylece giriş hızlanır. Seçilen ilin dosyası bir kez indirilip bellekte tutulur.

interface IlMahalleleri {
  m: Record<string, string[]>; // ilçe → mahalle listesi
  k: Record<string, Record<string, [number, number]>>; // ilçe → mahalle → konum (kısmi)
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const yuklenen = new Map<string, IlMahalleleri>();
const bekleyen = new Map<string, Promise<void>>();

export function ilMahalleleriYukle(ilKod: string): Promise<void> {
  if (yuklenen.has(ilKod)) return Promise.resolve();
  if (!bekleyen.has(ilKod))
    bekleyen.set(
      ilKod,
      fetch(`${BASE}/mahalle/${ilKod}.json`)
        .then((r) => {
          if (!r.ok) throw new Error("Mahalle listesi indirilemedi");
          return r.json();
        })
        .then((d: IlMahalleleri) => void yuklenen.set(ilKod, d))
        .finally(() => bekleyen.delete(ilKod)),
    );
  return bekleyen.get(ilKod)!;
}

// Dosya henüz inmediyse boş liste / undefined döner; bileşen useIlMahalleleri ile yeniden çizilir.
export const mahalleListesi = (ilKod: string, ilce: string): string[] => yuklenen.get(ilKod)?.m[ilce] ?? [];
export const mahalleKoordinati = (ilKod: string, ilce: string, mahalle: string): [number, number] | undefined => yuklenen.get(ilKod)?.k[ilce]?.[mahalle];

// Seçili ilin mahalle dosyasını indirir; indirince bileşeni yeniden çizer. Dönüş: dosya hazır mı.
export function useIlMahalleleri(ilKod: string): boolean {
  const [hazir, setHazir] = useState(() => yuklenen.has(ilKod));
  useEffect(() => {
    let iptal = false;
    setHazir(yuklenen.has(ilKod));
    ilMahalleleriYukle(ilKod)
      .then(() => !iptal && setHazir(true))
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [ilKod]);
  return hazir;
}
