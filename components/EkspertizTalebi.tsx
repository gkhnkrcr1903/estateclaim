"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProfil } from "../lib/oturum";
import { raporKimligiGetir, raporKimligiDinle, type RaporKimligi } from "../lib/rapor";

// SPK lisanslı ekspertiz yönlendirmesi: taşınmazın bilgilerini içeren hazır talep metni; danışmanın kayıtlı
// ekspertiz firmasına e-posta/WhatsApp ile gönderme ve SPK'nın resmî değerleme kuruluşları sayfası.
const SPK_DEGERLEME = "https://spk.gov.tr/kurumlar/gayrimenkul-degerleme-kuruluslari";
const TL = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";

// "0532 000 00 00" → "905320000000" (WhatsApp bağlantısı için)
function whatsappNumarasi(t?: string | null) {
  const r = (t ?? "").replace(/\D/g, "");
  if (r.length === 10 && r.startsWith("5")) return "90" + r;
  if (r.length === 11 && r.startsWith("0")) return "9" + r;
  return r.length >= 11 ? r : "";
}

export default function EkspertizTalebi({ tur, konum, ozellikler, tahmini, adaParsel }: {
  tur: "Konut" | "Arsa";
  konum: string;
  ozellikler: string[];
  tahmini: number;
  adaParsel?: string;
}) {
  const profil = useProfil();
  const [k, setK] = useState<RaporKimligi | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  useEffect(() => {
    const yukle = () => raporKimligiGetir().then(setK).catch(() => setK(null));
    yukle();
    return raporKimligiDinle(yukle);
  }, []);

  const danisman = k?.danisman_adi || profil?.ad || profil?.eposta || "";
  const metin = useMemo(
    () =>
      [
        `Merhaba${k?.ekspertiz_firma ? ` ${k.ekspertiz_firma}` : ""},`,
        "",
        `Aşağıdaki taşınmaz için SPK lisanslı gayrimenkul değerleme (ekspertiz) raporu talep ediyoruz.`,
        "",
        `• Taşınmaz türü: ${tur}`,
        `• Konum: ${konum}`,
        ...(adaParsel ? [`• Ada / parsel: ${adaParsel}`] : []),
        ...ozellikler.map((o) => `• ${o}`),
        "",
        `Ön analizdeki tahmini değer ${TL(tahmini)} olup yalnızca bilgi amaçlıdır.`,
        "Rapor ücreti, teslim süresi ve yerinde inceleme için uygun zamanı paylaşabilir misiniz?",
        "",
        "Teşekkürler,",
        [danisman, k?.unvan, k?.ofis_adi].filter(Boolean).join(" · "),
        [k?.telefon, k?.eposta || profil?.eposta].filter(Boolean).join(" · "),
      ].join("\n"),
    [k, tur, konum, adaParsel, ozellikler, tahmini, danisman, profil?.eposta],
  );
  const konu = `Ekspertiz talebi — ${tur}, ${konum}`;
  const wa = whatsappNumarasi(k?.ekspertiz_telefon);

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2500);
    } catch {}
  };

  return (
    <section className="kart yazdirma ekspertiz">
      <h2>SPK lisanslı ekspertiz</h2>
      <p style={{ marginTop: 0 }}>
        Uygulamadaki değer bir ön analizdir. Alım-satım, kredi ve resmî işlemler için SPK lisanslı bir değerleme kuruluşundan ekspertiz raporu alınmalıdır.
        Konut kredisinde ekspertizi kredi veren banka ayrıca yaptırır.
      </p>
      <div className="ekspertiz-firma">
        {k?.ekspertiz_firma ? (
          <>
            <div><div className="soluk">Çalıştığınız ekspertiz firması</div><b>{k.ekspertiz_firma}</b><div className="soluk">{[k.ekspertiz_telefon, k.ekspertiz_eposta].filter(Boolean).join(" · ")}</div></div>
            <div className="ekspertiz-dugmeler">
              {k.ekspertiz_eposta && <a className="dugme-baglanti" href={`mailto:${k.ekspertiz_eposta}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(metin)}`}>E-postayla gönder</a>}
              {wa && <a className="dugme-baglanti" href={`https://wa.me/${wa}?text=${encodeURIComponent(metin)}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            </div>
          </>
        ) : (
          <p className="soluk" style={{ margin: 0 }}>
            Çalıştığınız ekspertiz firmasını <Link href="/rapor-ayarlari">Rapor ayarları</Link>'na kaydederseniz talebi buradan tek tıkla gönderebilirsiniz.
          </p>
        )}
      </div>
      <details className="ayrinti" style={{ marginTop: 10 }}>
        <summary>Talep metnini göster</summary>
        <pre className="talep-metni">{metin}</pre>
      </details>
      <div className="ekspertiz-dugmeler" style={{ marginTop: 10 }}>
        <button type="button" className="ikincil" onClick={kopyala}>{kopyalandi ? "Kopyalandı" : "Talep metnini kopyala"}</button>
        {!k?.ekspertiz_eposta && <a className="dugme-baglanti ikincil-baglanti" href={`mailto:?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(metin)}`}>E-posta taslağı</a>}
        <a className="dugme-baglanti ikincil-baglanti" href={SPK_DEGERLEME} target="_blank" rel="noreferrer">SPK değerleme kuruluşları ↗</a>
      </div>
    </section>
  );
}
