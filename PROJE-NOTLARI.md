# Arsa Analiz (estateclaim) — Proje Notları

Yayın: https://gkhnkrcr1903.github.io/estateclaim/ · Depo: https://github.com/gkhnkrcr1903/estateclaim

## Amaç

Uygulamanın iki ana sorusu:

1. **"Bu ev bu fiyata alınır mı, ne kadar eder?"** → `/ev` sayfası
2. **"Bu arsa ne kadar eder, gelecek için alınır mı?"** → ana sayfa (Arsa Analizi)

Diğer her şey (konut piyasası, semt sıralaması, nüfus profili, bütçe önerileri) bu iki soruyu destekleyen bilgidir.
Uygulama yatırım tavsiyesi değil, kural tabanlı bir analiz aracıdır; her ekranda bu uyarı bulunur.

## Mimari

- Next.js 15 + React 19, **statik çıktı** (`output: "export"`), GitHub Pages'te yayın. Sunucu yok.
- Harita: Leaflet / react-leaflet (OpenStreetMap).
- **Şifreli giriş:** Tüm veri `data/veri.json` → gzip → AES-256-GCM (PBKDF2, 310 bin tur) → `public/veri.enc.json`.
  Giriş ekranı şifreyle tarayıcıda çözer. Kod herkese açık, veri şifreli. Şifre `SITE_PASSWORD` secret'ında,
  yerelde `.env.local` içinde (git'e girmez).
- Tüm hesaplamalar istemcide, veriden anlık yapılır; veri güncellenince öneriler de güncellenir.

### Önemli dosyalar

| Dosya | Görev |
|---|---|
| `app/page.tsx` | Arsa Analizi: il/ilçe/mahalle seçimi, bütçe önerileri, il bilgisi, nüfus profili, en değerli semtler, konut piyasası, harita, arsa kararı |
| `app/ev/page.tsx` | "Bu ev alınır mı?": form, 4 yöntemle adil değer, tavsiyeler |
| `lib/ev.ts` | Ev değerleme: emsal (%60), gelir (%25), maliyet (%15), il ortalaması (referans); fiyat etkenleri; tavsiyeler; kredi |
| `lib/konut.ts` | Bölge çarpanı (ilçe kademeleri + mahalle sapması), konut piyasası |
| `lib/arsa.ts` | Örnek arsa üretimi, tapu durumu, tahmini arsa m² |
| `lib/puan.ts` | Arsa puanı, arsa kararı, bütçe önerileri, bölge tavsiyeleri |
| `lib/bolge.ts` | İl özeti, en değerli semt/ilçe sıralaması |
| `lib/profil.ts` | TÜİK profilinden konut talebi yorumları |
| `components/Giris.tsx` | Şifre ekranı, "Güncel veriyi çek", çıkış |
| `components/VeriGuncelligi.tsx` | Kaynaklar ve güncellik paneli (eskiyen veri uyarısı, kaynak bağlantıları) |
| `scripts/veri-olustur.mjs` | Kaynak dosyalardan `data/veri.json` üretir |
| `scripts/sifrele.mjs` | `veri.json` → `public/veri.enc.json` |
| `scripts/tcmb-guncelle.mjs` | TCMB EVDS 3'ten konut m² fiyatlarını çeker |
| `scripts/tuik-profil-cek.mjs` | 81 il TÜİK profilini (nufusune.com derlemesi) çeker |
| `.github/workflows/yayinla.yml` | Push'ta + her ayın 20'sinde + elle: TCMB güncelle → veri oluştur/şifrele → derle → Pages |

## Veri kaynakları ve güncelleme takvimi

| Veri | Kaynak | Gerçek mi? | Güncelleme |
|---|---|---|---|
| Konut m² fiyatı: TR, İstanbul, Ankara, İzmir | TCMB EVDS 3 (`evds3.tcmb.gov.tr/igmevdsms-dis/`) | Gerçek | **Otomatik**, her ayın 20'si (GitHub Actions) |
| Diğer illerin konut m² fiyatı | TR ortalaması × il kademesi | Tahmini | TCMB ile birlikte |
| İlçe farkları | Büyük şehirlerde bilinen piyasa kademeleri (A–D), diğer illerde Merkez/kırsal | Tahmini | Kodda (`lib/konut.ts`) |
| Mahalle farkları | Sabit sapma (±%15) | **Örnek** | — |
| Kira | %5,5 brüt getiri varsayımı + oda tipi primi | Tahmini | — |
| Nüfus, nüfus artışı (2021–2025) | TÜİK ADNKS (`data/kaynak/tuik-2025.csv`, `tuik-2021.csv`) | Gerçek | **Elle**, yılda bir (Şubat) |
| Yaş, hane, medeni durum, ilçe nüfusu | TÜİK ADNKS 2025 (nufusune.com derlemesi) | Gerçek | **Elle**, Şubat: `node scripts/tuik-profil-cek.mjs` |
| Eğitim süresi (25+) | TÜİK Ulusal Eğitim İst. 2025 | Gerçek, **yalnızca 11 il** | **Elle**, Haziran: `data/kaynak/tuik-egitim-2025.json` |
| Yapı maliyeti | Bakanlık 2026 tebliği (RG 03.02.2026/33157) | Gerçek | **Elle**, Ocak–Şubat: `lib/ev.ts` → `yapiBirimMaliyeti`, `YAPI_MALIYET_YILI` |
| İl/ilçe/mahalle listesi | PTT (`turkey-neighbourhoods` paketi) | Gerçek | Her derlemede |
| Arsa ilanları ve tapu durumları | Deterministik örnek üretim | **Örnek** | Gerçek açık kaynak yok |

Malik adı KVKK gereği hiçbir zaman gösterilmez. Türkiye'de "sahipsiz arsa" yoktur; tapusuz yerler Hazine'ye aittir.

## Kurulum / ayarlar

- GitHub secrets: `SITE_PASSWORD` (giriş şifresi), `EVDS_API_KEY` (TCMB EVDS anahtarı, gerçek anahtar girildi ve çalışıyor).
- GitHub Pages kaynağı: **GitHub Actions**.
- Yerel çalıştırma: `npm run dev` (önce veriyi oluşturup şifreler). Yerel şifre `.env.local` içinde.
- Zamanlanmış görev (Claude masaüstü uygulaması): **"GitHub Pages depolarına boş commit"**, her ayın 1'i 10:00.
  Betik: `C:\Claude_projects\github-keepalive\bos-commit.sh` — Pages'i açık tüm depolara boş commit atar,
  böylece GitHub 60 gün hareketsizlikte cron iş akışlarını kapatmaz. Uygulama açıkken çalışır.

## Dikkat edilecek tuzaklar (yaşandı)

- **Dev sunucusu açıkken `next build` çalıştırma**: aynı `.next` klasörünü bozar (sayfa "Yükleniyor…"da kalır).
  Önce dev sunucusunu durdur, derlemeden sonra `rm -rf .next`.
- **Dev'de hot reload** veri modülünü sıfırlayıp "Veri henüz çözülmedi" hatası verebilir; yalnızca geliştirmede olur, sayfayı yenile.
- **Git Bash** `/zmir/i` gibi ifadeleri dosya yolu sanıp dönüştürür → `MSYS_NO_PATHCONV=1`.
- **JS regex `/i`** büyük "İ"yi "i" ile eşleştirmez → "stanbul", "zmir" gibi aranır.
- **TCMB EVDS 2** (`evds2.tcmb.gov.tr/service/evds/`) artık veri yerine HTML döndürüyor; EVDS 3 adresi kullanılmalı.
- **Kabuk heredoc + Türkçe/tırnak** bazen bozulur; karmaşık düzenlemeleri scratchpad'e yazılan node betikleriyle yap.
- `public/` klasörü git'te yok (içindeki tek dosya ignore); `sifrele.mjs` klasörü kendisi oluşturur.
- Sayı ayrıştırırken cümle sonu virgülü ("20,9,") `NaN` üretir; `sayi()` sondaki işareti atar.

## Kullanıcı tercihleri

- Arayüz ve tüm metinler **Türkçe**.
- **Web ve mobil uyumlu** olmalı (375 px'te yatay taşma yok).
- Veriler ve öneriler **güncel** kalmalı; kaynaklar şeffaf gösterilmeli.
- Commit e-postası: `gkhnkrcr1903@gmail.com`.
- Gerçek veri yoksa uydurulmaz; tahmini/örnek olduğu ekranda açıkça yazılır.

## Olası sonraki adımlar

- TÜİK eğitim il tablosunun 81 il için tamamlanması (data.tuik.gov.tr Ulusal Eğitim İstatistikleri il tablosu).
- Mahalle bazında gerçek fiyat verisi (ücretli kaynak gerekir: Endeksa API vb.) veya kullanıcının elle girdiği emsaller.
- TCMB'nin 26 bölge (Düzey 2) konut birim fiyatlarının da çekilmesi → tahmini il fiyatlarının yerine.
- Mahalle nüfusu (nufusune.com'da mahalle sayfaları var, ~50 bin sayfa; toplu çekmek yerine talep üzerine).
