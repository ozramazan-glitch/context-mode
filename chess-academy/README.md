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
| **Temalar ve hareket** | 11 tema, Ayarlar'da üç grup hâlinde. **Sakin fütüristik** (göz yormayan; saf siyah/beyaz zemin yok, soluk vurgu, 30 saniyeden uzun döngülü yavaş ortam hareketi): **Kuantum Sakin** (varsayılan; koyu lacivert cam, yavaş ve soluk yıldız alanı, yumuşak derinlik geçişi), **Ay Üssü** (açık gri cam paneller, süzülen ışık küreleri, katman katman yükselen sayfa), **Aurora** (koyu arduvaz, ağır kuzey ışığı bandı, ince çizgi menü göstergesi), **Bulut Şehri** (pastel gökyüzü, süzülen bulutlar; sayfa değişince bulutlar bir an hızlanır, sayfa yana süzülür). **Canlı**: **Kuantum Arena** (WebGL uzay sahnesi, ışık hızı geçişi, neon taşlar), **Bauhaus Satranç** (Josef Hartwig'in 1920'lerdeki takımından esinlenen geometrik taşlar, GSAP ile üç renkli perde geçişi). **Klasik**: Satranç Kitabı, Gece Turnuvası, Mermer ve Pirinç, Satranç Saati, Kulüp Salonu. Tüm temalarda: tema değiştirince yeni tema seçilen satırdan dairesel dalgayla yayılır; taş hamlede hafifçe kalkarak kayar, alınan taş dönerek kaybolur; doğru hamlede karede halka dalgası, yanlış hamlede taş titrer; şah çekilen kare nabız gibi belirir; ders kartları gidilen yönden kayar; sonuç kartı yaylanarak açılır, yıldızlar tek tek yanar, kazanılan XP seviye göstergesine uçar; sayılar sayar, çubuklar dolar; ilk ekranın altındaki kartlar kaydırınca belirir. Telefonda menü animasyonlu bir çekmeceye dönüşür. Sistemde “hareketi azalt” açıksa animasyonlar kapanır. |
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

- **Animasyonlar** Bauhaus ve Kuantum Arena'da GSAP (3.12.5) kitaplığını internetten indirir; indirilemezse daha sade, tarayıcının kendi animasyonlarıyla çalışır. Diğer temalar yalnızca tarayıcının kendi animasyonlarını kullanır.
- **Tema değiştirme dalgası** tarayıcının View Transitions özelliğini kullanır (Chrome/Edge 111+, Safari 18+); desteklemeyen tarayıcıda tema animasyonsuz, hemen değişir.
- **Kuantum Sakin ve Kuantum Arena** arka planı WebGL ile çizilir ve three.js'i internetten indirir; indirilemezse düz koyu zemin kalır.
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
├── css/style.css       Tasarım (11 tema)
├── js/engine.js        Kural motoru, notasyon, mat arayıcı, yapay zekâ
├── js/kpk.js           Şah+Piyon–Şah çözücüsü
├── js/kxk.js           Şah+Vezir/Kale–Şah çözücüsü
├── js/curriculum.js    8 bölümün dersleri ve alıştırmaları
├── js/special.js       Özel Hamleler Atölyesi içeriği
├── js/progress.js      XP, seviye, puan, rozetler, kayıt
├── js/board.js         2B tahta ve ortak etkileşim
├── js/board3d.js       3B tahta (three.js)
├── js/motion.js        Temalar, menü animasyonu, sayfa geçişleri, kutlama (GSAP)
├── js/scene.js         Kuantum Arena / Kuantum Sakin arka plan sahnesi (WebGL)
├── js/trainer.js       Ders oynatıcı ve alıştırma kuralları
├── js/views.js         Ekranlar
├── js/app.js           Yönlendirme, ayarlar
├── tests/              Motor, oyunsonu ve içerik testleri
└── tools/build-single.mjs  Tek dosyalık sürüm üretici
```
