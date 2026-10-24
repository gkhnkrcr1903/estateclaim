"use client";

import { useProfil } from "../lib/oturum";

// Tarayıcının yazdırma penceresini açar; "Hedef: PDF olarak kaydet" seçilerek sayfa PDF'e dönüşür.
// Dosya adı belge başlığından gelir; kapalı ayrıntı kutuları yazdırırken açılır.
// PDF yetkisi olmayan kullanıcıda düğme gösterilmez.
export default function PdfKaydet({ dosyaAdi }: { dosyaAdi: string }) {
  const profil = useProfil();
  const yazdir = () => {
    const eskiBaslik = document.title;
    const kapali = [...document.querySelectorAll("details:not([open])")] as HTMLDetailsElement[];
    kapali.forEach((d) => (d.open = true));
    document.title = dosyaAdi;
    window.addEventListener(
      "afterprint",
      () => {
        document.title = eskiBaslik;
        kapali.forEach((d) => (d.open = false));
      },
      { once: true },
    );
    window.print();
  };
  if (!profil?.pdf) return null;
  return (
    <button type="button" className="pdf-dugme yazdirma" onClick={yazdir} title="Yazdırma penceresinde 'PDF olarak kaydet'i seçin">
      PDF olarak kaydet
    </button>
  );
}
