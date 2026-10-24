"use client";

import { useEffect, useState } from "react";
import { useProfil, type Profil } from "../lib/oturum";
import { raporKimligiGetir, raporKimligiDinle, type RaporKimligi } from "../lib/rapor";

// PDF/yazdırma çıktısının üstündeki kurumsal başlık ve altındaki danışman imza bloğu.
// Ekranda görünmez (yalnızca @media print); Rapor ayarları sayfasında önizleme olarak da kullanılır.

const tarih = () => new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

export function RaporUstGorunum({ k, profil, baslik }: { k: RaporKimligi | null; profil: Profil | null; baslik?: string }) {
  const ofis = k?.ofis_adi || "Ev/Arsa Analiz";
  const iletisim = [k?.telefon, k?.eposta || profil?.eposta, k?.web].filter(Boolean);
  return (
    <div className="rapor-ust">
      <div className="rapor-ust-sol">
        {k?.logo ? <img src={k.logo} alt={`${ofis} logosu`} className="rapor-logo" /> : <div className="rapor-logo-bos">{ofis.charAt(0).toLocaleUpperCase("tr")}</div>}
        <div>
          <div className="rapor-ofis">{ofis}</div>
          {k?.adres && <div className="rapor-ince">{k.adres}</div>}
          {iletisim.length > 0 && <div className="rapor-ince">{iletisim.join(" · ")}</div>}
        </div>
      </div>
      <div className="rapor-ust-sag">
        <div className="rapor-tur">{baslik ?? "Gayrimenkul Ön Analiz Raporu"}</div>
        <div className="rapor-ince">Rapor tarihi: {tarih()}</div>
        {k?.yetki_belge_no && <div className="rapor-ince">Yetki belgesi no: {k.yetki_belge_no}</div>}
      </div>
    </div>
  );
}

export function RaporAltGorunum({ k, profil }: { k: RaporKimligi | null; profil: Profil | null }) {
  const ad = k?.danisman_adi || profil?.ad || profil?.eposta || "";
  return (
    <div className="rapor-alt">
      <div className="rapor-imza">
        <div className="rapor-ince">Hazırlayan</div>
        <div className="rapor-imza-ad">{ad}</div>
        {k?.unvan && <div className="rapor-ince">{k.unvan}</div>}
        {k?.ofis_adi && <div className="rapor-ince">{k.ofis_adi}</div>}
        <div className="rapor-imza-cizgi">İmza</div>
      </div>
      <p className="rapor-yasal">
        Bu rapor kural tabanlı bir ön analizdir; TÜİK, TCMB ve diğer resmî/açık kaynaklardan türetilen tahminler içerir. SPK lisanslı değerleme
        (ekspertiz) raporu, imar durum belgesi veya tapu kaydı yerine geçmez; yatırım tavsiyesi değildir. Ev/Arsa Analiz ile hazırlanmıştır.
      </p>
    </div>
  );
}

// Uygulama çerçevesinde: yazdırma sırasında içeriğin üstüne ve altına eklenir. Yalnızca PDF yetkisi olanlarda.
export function RaporUst() {
  const profil = useProfil();
  const k = useRaporKimligi(!!profil?.pdf);
  if (!profil?.pdf) return null;
  return <div className="yalniz-yazdir"><RaporUstGorunum k={k} profil={profil} /></div>;
}

export function RaporAlt() {
  const profil = useProfil();
  const k = useRaporKimligi(!!profil?.pdf);
  if (!profil?.pdf) return null;
  return <div className="yalniz-yazdir"><RaporAltGorunum k={k} profil={profil} /></div>;
}

function useRaporKimligi(etkin: boolean) {
  const [k, setK] = useState<RaporKimligi | null>(null);
  useEffect(() => {
    if (!etkin) return;
    const yukle = () => raporKimligiGetir().then(setK).catch(() => setK(null));
    yukle();
    return raporKimligiDinle(yukle);
  }, [etkin]);
  return k;
}
