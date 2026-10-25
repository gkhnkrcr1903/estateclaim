"use client";

import Link from "next/link";
import { useProfil } from "../../lib/oturum";

// Tanıtım sayfası: emlak danışmanları için uygulamanın bugün sunduğu güçlü yanlar. Giriş yapmadan da açılır.
// Yalnızca uygulamada gerçekten bulunan özellikler anlatılır.

const NEDENLER: { baslik: string; ozet: string; maddeler: string[] }[] = [
  {
    baslik: "Müşterinize dakikalar içinde kurumsal rapor",
    ozet: "Ofis logonuz, iletişim bilgileriniz ve imza bloğunuzla PDF rapor.",
    maddeler: [
      "Rapor ayarlarından bir kez logonuzu ve bilgilerinizi girin; her rapor sizin başlığınızla çıkar.",
      "Alıcı için ön analiz raporu, satıcı için fiyatlandırma raporu.",
      "Raporun sonunda hazırlayan bilgisi, imza alanı ve yasal uyarı.",
    ],
  },
  {
    baslik: "Bağlantıyla paylaşım",
    ozet: "Müşteriniz giriş yapmadan raporu telefonundan açar.",
    maddeler: [
      "Tek tıkla 30 gün geçerli paylaşım bağlantısı; WhatsApp ile gönderme.",
      "Bağlantı sizin logonuz ve bilgilerinizle açılır; müşteri isterse PDF alır.",
      "Kaç kez görüntülendiğini görün, istediğiniz an kaldırın.",
    ],
  },
  {
    baslik: "Pazarlıkta gerekçeli rakamlar",
    ozet: "Adil değer dört yöntemle, adım adım hesaplanır.",
    maddeler: [
      "Emsal, gelir (kira) ve maliyet yöntemlerinin ağırlıklı ortalaması; il ortalaması referans.",
      "Alıcıya açılış teklifi ve hedef fiyat; satıcıya ilan, hedef ve hızlı satış fiyatı ile pazarlık alt sınırı.",
      "Her yöntemin hesap adımları açıkça gösterilir: \"bu rakam nereden çıktı?\" sorusunun cevabı hazır.",
    ],
  },
  {
    baslik: "Satıcıyı gerçekçi fiyata ikna edin",
    ozet: "Satıcı fiyatlandırma raporu beklentiyi piyasaya göre konumlar.",
    maddeler: [
      "Satıcının beklediği fiyatın piyasaya göre yeri: uyumlu, biraz üstünde, belirgin üstünde.",
      "İlanda öne çıkarılacak özellikler ve alıcının itiraz edeceği noktalar.",
      "Bakım, boş teslim, iskân gibi iyileştirmelerin değere tahmini etkisi ve hedef alıcı kitlesi.",
    ],
  },
  {
    baslik: "Kararsız alıcıya net cevap",
    ozet: "Kira mı, satın almak mı? Taksit, kira ve peşinat karşılaştırması.",
    maddeler: [
      "Müşterinin şu anki kirası, bu evin tahmini kirası ve kredi taksitiyle kıyaslanır.",
      "Kredi taksiti, toplam geri ödeme, alım masrafları (harç, komisyon) ve DASK prim aralığı.",
      "Aile için uygunluk puanı: okul, park, hastane, güvenlik ve konut özellikleri.",
    ],
  },
  {
    baslik: "Her bölgede uzman gibi hazırlıklı",
    ozet: "Resmî verilerle bölge bilgisi, tek ekranda.",
    maddeler: [
      "TÜİK nüfus profili: yaş, hane yapısı, göç, eğitim; konut talebine dair yorumlar.",
      "İlçelerin 2020–2025 nüfus değişimi ve ilin büyüme yönü (gerçek koordinatlarla).",
      "Mahalle çevresindeki hastane, okul ve AVM'ler; TCMB konut fiyatları ve ilçe kademeleri.",
    ],
  },
  {
    baslik: "Arsada riskleri önceden görün",
    ozet: "Resmî doğrulama listesi müşteriyi ve itibarınızı korur.",
    maddeler: [
      "TKGM parsel, tapu kaydı, imar durum belgesi, düzenleme ortaklık payı, aplikasyon, afet riski, ekspertiz.",
      "Kamu arsası, tarım arazisi ve hisseli tapu için ek kontroller.",
      "Ekspertiz değeri girildiğinde fiyat kararı ona göre yeniden hesaplanır.",
    ],
  },
  {
    baslik: "Şeffaf ve dürüst veri",
    ozet: "Her rakamın kaynağı ve tahmin olup olmadığı yazar.",
    maddeler: [
      "Kaynaklar sayfası: TCMB, TÜİK, Bakanlık, DASK, Wikidata, OpenStreetMap; dönemi ve güncelliğiyle.",
      "Uydurma veri gösterilmez; tahminler açıkça etiketlenir.",
      "TCMB konut fiyatları her ay otomatik güncellenir.",
    ],
  },
  {
    baslik: "Sahada, telefondan",
    ozet: "Müşteriyle evi gezerken anında analiz.",
    maddeler: [
      "Mobil uyumlu arayüz; masaüstü ve telefonda aynı hesap.",
      "Ofis içinde rol bazlı kullanım: sayfa ve PDF yetkileri yönetici panelinden.",
    ],
  },
];

export default function Sayfa() {
  const profil = useProfil();
  return (
    <>
      <header className="tanitim-baslik">
        <div className="tanitim-ic">
          <span className="tanitim-etiket">Emlak danışmanları için</span>
          <h1>Neden Ev/Arsa Analiz?</h1>
          <p>
            Müşterinizin karşısına kaynakları belli, gerekçeli rakamlar ve kendi logonuzla hazırlanmış bir raporla çıkın. Ev ve arsa için
            değer analizi, satıcı fiyatlandırması, bölge bilgisi ve risk kontrolleri tek uygulamada.
          </p>
          <div className="tanitim-dugmeler">
            {profil ? <Link className="dugme-baglanti" href="/ev">Ev Analiz'e başla</Link> : <Link className="dugme-baglanti" href="/">Giriş yap / Kayıt ol</Link>}
          </div>
        </div>
      </header>
      <main>
        <div className="neden-izgara">
          {NEDENLER.map((n, i) => (
            <section key={n.baslik} className="kart neden-kart">
              <div className="neden-no">{String(i + 1).padStart(2, "0")}</div>
              <h2>{n.baslik}</h2>
              <p className="neden-ozet">{n.ozet}</p>
              <ul>{n.maddeler.map((m) => <li key={m}>{m}</li>)}</ul>
            </section>
          ))}
        </div>
        <section className="kart">
          <h2>Bilmeniz gerekenler</h2>
          <p style={{ margin: 0 }}>
            Ev/Arsa Analiz kural tabanlı bir ön analiz aracıdır. Değerler resmî verilerden türetilen tahminlerdir; SPK lisanslı ekspertiz raporu, imar durum
            belgesi veya tapu kaydı yerine geçmez ve yatırım tavsiyesi değildir. Mahalle bazında fiyat verisi bulunmaz.
          </p>
        </section>
      </main>
    </>
  );
}
