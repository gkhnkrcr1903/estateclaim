# Ev/Arsa Analiz (estateclaim) — Proje Notları

Yayın: https://evarsaanaliz.pages.dev (Cloudflare Pages) · Depo: https://github.com/gkhnkrcr1903/estateclaim
Eski adres https://gkhnkrcr1903.github.io/estateclaim/ yalnızca yeni adrese yönlendirir (`yonlendirme/`).

## Amaç

Uygulamanın iki ana sorusu:

1. **"Bu ev bu fiyata alınır mı, ne kadar eder?"** → `/ev` sayfası
2. **"Bu arsa ne kadar eder, gelecek için alınır mı?"** → ana sayfa (Arsa Analizi)

Diğer her şey (konut piyasası, semt sıralaması, nüfus profili, bütçe önerileri) bu iki soruyu destekleyen bilgidir.
Uygulama yatırım tavsiyesi değil, kural tabanlı bir analiz aracıdır; her ekranda bu uyarı bulunur.

## Mimari

- Next.js 15 + React 19, **statik çıktı** (`output: "export"`), **Cloudflare Pages**'te yayın (2026-10-25'te GitHub Pages'ten taşındı; GitHub Pages ticari SaaS'a izin vermiyor). Sunucu yok.
  Cloudflare her push'ta derler: build `npm run cf-build`, çıktı `out`, ortam değişkenleri `SITE_PASSWORD` (şifreli) ve `NODE_VERSION=22`, base path yok.
- Harita: Leaflet / react-leaflet (OpenStreetMap).
- **Kullanıcılar ve roller (Supabase, ücretsiz plan):** e-posta + şifre ile giriş/kayıt; yeni kayıt yetkisiz başlar, admin
  `/admin` panelinden onaylar ve yetki verir (aktif, arsa, ev, pdf, admin). Tablolar ve RLS kuralları `supabase/kurulum.sql`
  (ilk admin: gkhnkrcr1903@gmail.com). Proje: https://ylyjcarnydrumlrkvlyw.supabase.co, istemci `lib/oturum.ts`.
  Supabase ayarları: Email sağlayıcı açık, "Confirm email" kapalı, Site URL = Pages adresi. Gizli (service role) anahtar kullanılmaz.
  Veri şifresi kullanıcıya söylenmez: `ayarlar` tablosunda (veri_sifresi), yalnızca aktif kullanıcılar okuyabilir; SITE_PASSWORD
  değişirse admin panelinden güncellenir. PDF yetkisi olmayanın yazdırma çıktısı gizlenir (Ctrl+P tam engellenemez).
- **Şifreli giriş:** Tüm veri `data/veri.json` → gzip → AES-256-GCM (PBKDF2, 310 bin tur) → `public/veri.enc.json`.
  Giriş ekranı şifreyle tarayıcıda çözer. Kod herkese açık, veri şifreli. Şifre `SITE_PASSWORD` secret'ında,
  yerelde `.env.local` içinde (git'e girmez).
- Tüm hesaplamalar istemcide, veriden anlık yapılır; veri güncellenince öneriler de güncellenir.

### Önemli dosyalar

| Dosya | Görev |
|---|---|
| `app/page.tsx` | Arsa Analizi: il/ilçe/mahalle seçimi, bütçe önerileri, il bilgisi, nüfus profili, en değerli semtler, konut piyasası, harita, arsa kararı |
| `app/rapor-ayarlari/page.tsx` | Ofis logolu PDF: ofis/danışman bilgileri, logo (tarayıcıda küçültülür), önizleme; `lib/rapor.ts`, `components/RaporBasligi.tsx`, tablo `supabase/rapor-kimligi.sql` |
| `app/admin/page.tsx` | Yönetim paneli: kullanıcı onayı, yetkiler, veri şifresi |
| `app/neden/page.tsx` | Tanıtım: emlak danışmanları için güçlü yanlar (herkese açık, yalnızca var olan özellikler) |
| `app/paylasim/page.tsx` | Paylaşılan rapor (girişsiz); `lib/paylasim.ts`, tablo/fonksiyon `supabase/paylasim.sql`, 30 gün geçerli |
| `lib/satici.ts` | Satıcı fiyatlandırma: ilan/hedef/hızlı satış fiyatı, iyileştirme etkileri (model yeniden çalıştırılarak) |
| `components/EvRaporBolumleri.tsx` | Ev sonuç bölümleri (Ev Analiz ve paylaşım sayfası ortak) |
| `app/portfoy/page.tsx` | Portföy (ev/arsa kayıtları) ve müşteriler; `lib/portfoy.ts`, tablolar `supabase/portfoy.sql`. Arsalarım da portföyde (tablo yoksa tarayıcıda) |
| `components/EkspertizTalebi.tsx` | SPK lisanslı ekspertiz yönlendirmesi: hazır talep metni, kayıtlı firmaya e-posta/WhatsApp, SPK bağlantısı |
| `app/kaynaklar/page.tsx` | Veri ve Kaynaklar: veri tarihi, güncel veriyi çek, kaynak listesi (`components/VeriGuncelligi.tsx`) |
| `app/ev/page.tsx` | Ev Analiz: form, 4 yöntemle adil değer, tavsiyeler |
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
| `scripts/ilce-nufus-cek.mjs` | TÜİK ilçe nüfus serisi (2015, 2020, 2024, 2025) → `data/kaynak/tuik-ilce-nufus.json` (büyüme yönü tavsiyeleri) |
| `lib/buyume.ts` | İlçe nüfus artışı + koordinatlarla büyüme yönü, yatırım yönü, imar tavsiyeleri |
| `components/PdfKaydet.tsx` | Tarayıcı yazdırma penceresiyle PDF kaydetme (ev ve arsa sayfaları) |
| `components/SayiKutusu.tsx` | Sayı girişi; silip yazarken başa 0 eklenmesini önler |
| `scripts/yakin-yerler-cek.mjs` | OpenStreetMap hastane/okul/AVM → `public/yakin/{il}.json` (il başına, şifresiz, git'te); `components/YakinYerler.tsx` yalnızca seçili ilin dosyasını indirir |
| `scripts/koordinat-cek.mjs` | Wikidata'dan ilçe/mahalle koordinatları → `data/kaynak/ilce-koordinat.json`, `mahalle-koordinat.json` |
| `scripts/tuik-profil-cek.mjs` | 81 il TÜİK profilini (nufusune.com derlemesi) çeker |
| `.github/workflows/yayinla.yml` | "Veri güncelle": her ayın 20'si + elle TCMB güncelle ve commit'le (Cloudflare yeni yayını başlatır); eski GitHub Pages adresine `yonlendirme/` sayfasını yayınlar |
| `yonlendirme/` | Eski github.io adresinden yeni adrese yol ve parametreleri koruyarak yönlendiren sayfa (index.html + 404.html) |

## Veri kaynakları ve güncelleme takvimi

| Veri | Kaynak | Gerçek mi? | Güncelleme |
|---|---|---|---|
| Konut m² fiyatı: TR, İstanbul, Ankara, İzmir | TCMB EVDS 3 (`evds3.tcmb.gov.tr/igmevdsms-dis/`) | Gerçek | **Otomatik**, her ayın 20'si (GitHub Actions) |
| Diğer illerin konut m² fiyatı | TR ortalaması × il kademesi | Tahmini | TCMB ile birlikte |
| İlçe farkları | Büyük şehirlerde bilinen piyasa kademeleri (A–D), diğer illerde Merkez/kırsal | Tahmini | Kodda (`lib/konut.ts`) |
| Mahalle farkları | **Yok** — mahalle ilçe değerini alır (uydurma sapma 2026-10-24'te kaldırıldı) | — | — |
| Kira | %5,5 brüt getiri varsayımı + oda tipi primi | Tahmini | — |
| Nüfus, nüfus artışı (2021–2025) | TÜİK ADNKS (`data/kaynak/tuik-2025.csv`, `tuik-2021.csv`) | Gerçek | **Elle**, yılda bir (Şubat) |
| İlçe nüfus serisi 2015–2025 | TÜİK ADNKS (nufusune.com derlemesi), 972/973 ilçe (19 Mayıs eksik) | Gerçek | **Elle**, Şubat: `node scripts/ilce-nufus-cek.mjs` (~20 dk) |
| Yaş, hane, medeni durum, ilçe nüfusu | TÜİK ADNKS 2025 (nufusune.com derlemesi) | Gerçek | **Elle**, Şubat: `node scripts/tuik-profil-cek.mjs` |
| Eğitim süresi (25+) | TÜİK Ulusal Eğitim İst. 2025 | Gerçek, **yalnızca 11 il** | **Elle**, Haziran: `data/kaynak/tuik-egitim-2025.json` |
| Yapı maliyeti | Bakanlık 2026 tebliği (RG 03.02.2026/33157) | Gerçek | **Elle**, Ocak–Şubat: `lib/ev.ts` → `yapiBirimMaliyeti`, `YAPI_MALIYET_YILI` |
| İlçe ve mahalle koordinatları (harita) | Wikidata (CC0): ilçe 968/973, mahalle ~33 bin/73 bin; eksikte ilçe/il merkezi, "konum yaklaşık" | Gerçek | **Elle**, nadiren: `node scripts/koordinat-cek.mjs` |
| DASK tarifesi (birim maliyet, 7 risk grubu oranı) | dask.gov.tr Tarife ve Primler, 01.10.2026 dönemi | Gerçek; ilçe risk grubu açık değil → prim aralık olarak | **Elle**, DASK yeni dönem açıklayınca: `lib/ev.ts` → `DASK` |
| Hastane, okul, AVM konumları | OpenStreetMap (Overpass, ODbL) | Gerçek; eksik kayıt olabilir, özel/devlet ayrımı addan | **Elle**, birkaç ayda bir: `node scripts/yakin-yerler-cek.mjs` (~15 dk; tek il: `… 34`) |
| İl/ilçe/mahalle listesi | PTT (`turkey-neighbourhoods` paketi) | Gerçek | Her derlemede |
| Arsalar | Kullanıcı girer (localStorage, kullanıcı başına); örnek ilan üretimi kaldırıldı. Her arsa için resmi doğrulama listesi (`lib/dogrulama.ts`) ve ekspertiz değeri alanı | Kullanıcı verisi | — |

Malik adı KVKK gereği hiçbir zaman gösterilmez. Türkiye'de "sahipsiz arsa" yoktur; tapusuz yerler Hazine'ye aittir.

## Kurulum / ayarlar

- GitHub secrets: `SITE_PASSWORD` (giriş şifresi), `EVDS_API_KEY` (TCMB EVDS anahtarı, gerçek anahtar girildi ve çalışıyor).
- GitHub Pages kaynağı: **GitHub Actions** (yalnızca yönlendirme sayfası). Uygulama Cloudflare'de.
- Supabase Site URL: https://evarsaanaliz.pages.dev/ (Redirect URLs'te ayrıca localhost:3000).
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
- **İlçe sıralaması** yalnızca `ILCE_KADEMELERI` olan illerde gösterilir; kademe içindeki sıra listedeki sıradır.
- **Wikidata "Merkez" kayıtları** başka illere karışıyor; Merkez ilçe için il merkezi koordinatı kullanılır. Wikidata sorguları 429/502 verebilir, betik yeniden dener.
- **Overpass sunucuları** sık sık 502/504/429 verir; `yakin-yerler-cek.mjs` sunucuları sırayla ve beklemeli dener. Sınıflama kuralları (ASM, poliklinik, kurs vb. eleme) betikte; OSM adlarındaki yazım hataları için kökler kısaltılmış.
- Ayrıntılı işletim/yayın rehberi yerelde `UYGULAMA-REHBERI.md` (git dışı, herkese açık depoya konmaz).
- **Giriş hızı (2026-10-25):** mahalle listeleri ve koordinatları şifreli pakette değil, `public/mahalle/{il}.json` (her yayında `veri-olustur.mjs` üretir, git dışı); `lib/mahalle.ts` seçili ili indirir. Şifreli paket 1,1 MB → 85 KB. `veri.enc.json` ETag ile önbelleğe alınır (`cache: no-cache`) ve sayfa açılırken paralel indirilir; oturum `getSession` ile tarayıcıdan okunur.
- **Paylaşım boyutu:** paylaşımlar logo ve ekspertiz firması kopyası saklamaz; `paylasim_getir` logoyu sahibin rapor kimliğinden ekler. Süresi dolan paylaşımlar her yeni paylaşımda tetikleyiciyle silinir (`supabase/paylasim-temizlik.sql`).
