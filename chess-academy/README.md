# Satranç Akademisi

Sıfırdan usta adayı seviyesine kadar aşama aşama ilerleyen, Türkçe bir satranç öğretim programı.
Tarayıcıda çalışır; kurulum, derleme veya sunucu gerektirmez.

## Çalıştırma

`chess-academy/index.html` dosyasını tarayıcıda açmak yeterlidir. İsterseniz yerel bir sunucuyla da açabilirsiniz:

```bash
cd chess-academy
python3 -m http.server 8000   # sonra http://localhost:8000
```

Tek dosyalık bir kopya üretmek için (paylaşması kolay):

```bash
node chess-academy/tools/build-single.mjs dist/satranc-akademisi.html
```

## Neler var?

| Bölüm | İçerik |
|---|---|
| **Öğrenme Yolu** (birinci arayüz) | 8 bölüm, 37 ders, 55 alıştırma. Bölümler en basitten en deneyimli oyuncu profiline sıralıdır: Sıfırdan Başlayan → Kuralları Öğrenen → İlk Oyunlarını Oynayan → Hobi Oyuncusu → Gelişen Kulüp Oyuncusu → Turnuva Adayı → Deneyimli Oyuncu → Usta Adayı. Bir bölümün alıştırmalarının en az %75’i çözülünce sıradaki bölüm açılır. |
| **Özel Hamleler Atölyesi** (ikinci arayüz) | Piyonun çift adımı, rok, geçerken alma ve terfi: kuralların tam listesi, adım adım gösterim ve 17 alıştırma. **Rok Laboratuvarı**’nda taşları serbestçe yerleştirip rok koşullarının (6 koşul) canlı olarak nasıl değiştiğini görürsünüz. |
| **2B / 3B görünüm** | Üst menüdeki düğmeyle tüm tahtalar 2B ile 3B arasında geçer. 3B tahta sürüklenerek döndürülür, tekerlek veya iki parmakla yakınlaştırılır; hamleler 3B’de de tıklanarak yapılır. |
| **Temalar ve hareket** | Varsayılan tema **Bauhaus Satranç**: taşlar Josef Hartwig'in 1920'lerdeki Bauhaus takımından esinlenen geometrik biçimlerdir (kale küp, fil X, at L, vezir küre, şah döndürülmüş küp); biçim hareketi anlatır. GSAP ile animasyonlar: üç renkli perde sayfa geçişi, renk ve biçim değiştirerek yaylanan menü göstergesi, zıplayan menü harfleri, imleci izleyen kartlar, sayan sayaçlar, doğru çözümde geometrik konfeti. 3B görünümde de taşlar küp ve kürelerden oluşur. Ayarlar'dan seçilebilen diğer temalar: Satranç Kitabı ( kayan siyah menü kapsülü, sayfa geçişinde çapraz akan dama kareleri), Gece Turnuvası (koyu cam paneller, yaylanan parlak menü, odak geçişi), Mermer ve Pirinç (uzayıp toplanan pirinç çizgi, kartların sırayla yükselmesi), Satranç Saati (basılan tuş sekmeler, LCD göstergeler, kaydırma geçişi) ve ilk tema Kulüp Salonu. Telefonda menü, animasyonlu bir çekmeceye dönüşür. Sistemde “hareketi azalt” açıksa animasyonlar kapanır. |
| **Gelişim Paneli** | Seviye ve unvan, XP çubuğu, tahmini bulmaca puanı ve grafiği, oyuncu profili yolculuğu (8 basamak), 7 beceri alanı için radar grafiği ve tablo, son 14 günün XP grafiği, günlük seri, 17 rozet, etkinlik geçmişi, öneriler, istatistikler, yedekleme/geri yükleme/sıfırlama. |
| **Seviye belirleme sınavı** | Satranç bilenler için: her bölümden bir soru; ilk hatada biter ve geçilen bölümler açılır. |
| **Serbest oyun** | Bilgisayara karşı üç zorluk seviyesinde, beyaz veya siyahla tam oyun. |
| **Sözlük** | Uygulamada geçen her terimin tanımı. |

### Alıştırma türleri

Koordinat bulma, kare seçme, kareleri işaretleme, yıldız toplama (en kısa yol hesaplanır), çoktan seçmeli soru,
bulmaca (çatal, açmaz, şiş, açarak saldırı, kombinasyon), 1 ve 2 hamlede mat, bilgisayara karşı vezir/kale ile mat,
kusursuz savunmaya karşı şah+piyon oyunsonu ve bilgisayara karşı tam oyun.

## Doğruluk nasıl güvenceye alındı?

- **Kural motoru** (`js/engine.js`): rok, geçerken alma, terfi, şah/mat/pat dahil tüm kurallar. Bilinen 5 standart konumda
  “perft” (belirli derinliğe kadar tüm yasal hamle dizilerinin sayısı) değerleri birebir tutar.
- **İçerik doğrulama** (`tests/content.test.mjs`): her ders kartı ve 72 alıştırmanın tamamı motorla kontrol edilir:
  konumlar kurallara uygun mu, çözüm hamleleri yasal mı, çözüm motorun en iyi hamlesi mi ve alternatiflerden en az
  1 piyon değeri kadar iyi mi, senaryodaki rakip cevabı gerçekçi bir savunma mı, mat bulmacalarında daha kısa mat var mı,
  soru cevapları (ör. “Burada rok yapılabilir mi?”) motorun sonucu ile aynı mı.
- **Oyunsonu çözücüleri**: Şah+Piyon–Şah (`js/kpk.js`) ve Şah+Vezir/Kale–Şah (`js/kxk.js`) için geriye doğru analizle
  kesin sonuçlar hesaplanır. Bilinen teorik değerlerle karşılaştırılır (ör. vezirle en uzun mat 10, kaleyle 16 hamle).
  Bu alıştırmalarda bilgisayar en uzun direnen savunmayı oynar, ipucu en kısa yolu gösterir.

Testleri çalıştırmak için (yalnızca Node.js gerekir):

```bash
node chess-academy/tests/run-all.mjs
```

## Sınırlamalar

- **Animasyonlar** GSAP (3.12.5) kitaplığını internetten indirir; indirilemezse daha sade, tarayıcının kendi animasyonlarıyla çalışır.
- **3B görünüm** ilk açılışta three.js (r128) grafik kitaplığını internetten (cdnjs, olmazsa jsDelivr) indirir. İnternet
  yoksa veya cihaz WebGL desteklemiyorsa uygulama bunu bildirir ve 2B görünüme döner.
- **İlerleme** tarayıcının yerel depolamasında (localStorage) tutulur; tarayıcı verisi silinirse kaybolur. Gelişim
  panelindeki “Yedeği kopyala / Geri yükle” ile başka cihaza taşınabilir. claude.ai üzerinde Artifact olarak açıldığında
  ilerleme ayrıca kullanıcıya özel bir bulut belgesine yedeklenir.
- **Bilgisayar rakibi** basit bir arama motorudur (alfa-beta, birkaç hamle derinlik). Yeni başlayanlar ve orta seviye için
  pratik sağlar; güçlü bir kulüp oyuncusu için zayıftır.
- **Tahmini bulmaca puanı** Elo yöntemine benzer biçimde yalnızca bu uygulamadaki alıştırma sonuçlarından hesaplanır;
  resmî FIDE Elo puanı değildir. Unvanlar (Piyon, At, Fil…) da uygulama içi adlandırmadır.
- Bulmaca konumları bu program için hazırlanmıştır; ünlü oyunlardan alınmamıştır.

## Dosya yapısı

```
chess-academy/
├── index.html          Uygulama kabuğu
├── css/style.css       Tasarım (açık/koyu tema)
├── js/engine.js        Kural motoru, notasyon, mat arayıcı, yapay zekâ
├── js/kpk.js           Şah+Piyon–Şah çözücüsü
├── js/kxk.js           Şah+Vezir/Kale–Şah çözücüsü
├── js/curriculum.js    8 bölümün dersleri ve alıştırmaları
├── js/special.js       Özel Hamleler Atölyesi içeriği
├── js/progress.js      XP, seviye, puan, rozetler, kayıt
├── js/board.js         2B tahta ve ortak etkileşim
├── js/board3d.js       3B tahta (three.js)
├── js/motion.js        Temalar, menü animasyonu, sayfa geçişleri, kutlama (GSAP)
├── js/trainer.js       Ders oynatıcı ve alıştırma kuralları
├── js/views.js         Ekranlar
├── js/app.js           Yönlendirme, ayarlar
├── tests/              Motor, oyunsonu ve içerik testleri
└── tools/build-single.mjs  Tek dosyalık sürüm üretici
```
