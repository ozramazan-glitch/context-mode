# YapıCAD

Betonarme **kalıp planı editörü** — Electron masaüstü uygulaması.
Aks sistemi, kolon/kiriş/perde/döşeme modelleme, çok katlı yapı ve 3B önizleme.

ideCAD'in *çalışma mantığını* örnek alır (şerit menü, aks sistemi, kat yöneticisi,
nokta yakalama, komut satırı). ideCAD ile hiçbir bağlantısı yoktur, onun dosya
biçimlerini okumaz/yazmaz.

---

## Kapsam — ne yapar, ne yapmaz

Bu bölümü atlamayın. Programın sınırı burada.

### Yapar

| Alan | Ayrıntı |
|---|---|
| Aks sistemi | Tekil düşey/yatay aks; açıklık listesinden (`6, 4, 6`) otomatik dizi; balon etiketleri; aks arası ölçü zincirleri |
| Elemanlar | Kolon (dikdörtgen / dairesel / dönmüş), kiriş, perde, döşeme (çokgen) |
| Yakalama | Aks kesişimi, uç nokta, orta nokta, dik izdüşüm, ızgara, orto (F8) — her biri ayrı açılıp kapanır |
| Düzenleme | Seçim (tekil / Shift / pencere), sürükleyerek taşıma, tutamakla düğüm düzenleme, kopyalama, ok tuşlarıyla ötele, 60 adımlık geri al/yinele |
| Katlar | Kat ekle/sil/çoğalt, elemanları üst kata kopyala, kümülatif kot hesabı, alt kat hayaleti |
| Görünüm | Kalıp planı / bölünmüş / 3B; koyu ve açık tema; katman aç-kapa; 1:N ölçek göstergesi |
| 3B | Katı model önizleme (döndür, kaydır, yakınlaştır), izometrik/üst/ön/sol açılar, tel kafes |
| Otomasyon | Aks kesişimlerine kolon, akslar boyunca kiriş, aks gözlerine döşeme |
| Çıktı | `.ycad` proje dosyası (düz JSON), metraj CSV, plan/3B PNG |
| Komut satırı | `kolon`, `kiris`, `30/60` (kesit), `500,300` (mutlak), `@200,0` (göreli), `yardim` |

### Yapmaz

- **Statik analiz yok.** Sonlu eleman çözümü, kesit tesiri, deplasman, mesnet reaksiyonu hesaplanmaz.
- **Yönetmelik kontrolü yok.** TBDY 2018 / TS 500 kontrolleri yapılmaz.
- **Donatı tasarımı yok.** Donatı çapı, aralığı, pilye, etriye, açılım üretilmez.
- **Yük tanımı yok.** Ölü/hareketli/kar/rüzgâr/deprem yükü girilemez.
- **Otomatik pafta üretimi yok.** Kalıp/donatı paftası, aplikasyon planı, DWG çıktısı yoktur.
- Malzeme seçimleri (C30/37, B420C) yalnızca **etiket** olarak saklanır, hiçbir hesaba girmez.
- Metraj **brüt geometridir**: kolon-kiriş-döşeme kesişimleri iki kez sayılır.

> **Bu programla ruhsata esas statik proje üretilemez.** Çıktıları eskiz/fikir
> aşaması ve kaba metraj tahmini içindir.

---

## Kurulum ve çalıştırma

```bash
cd apps/yapicad
npm install       # yalnızca electron
npm start
```

Linux'ta masaüstü oturumu olmadan (CI, konteyner) denemek için:

```bash
npm run start:linux-ci     # xvfb-run ile
```

### Kurulumsuz kullanım

Tüm çizim ve modelleme tarayıcıda da çalışır; tek fark, yerel dosya
diyalogları yerine indirme/dosya seçici kullanılmasıdır.

**Tek dosya (en kolay).** Her şeyi tek bir HTML'e gömer; çift tıklayınca açılır,
sunucu ve kurulum istemez:

```bash
npm run build:single       # dist/yapicad-tek-dosya.html  (~158 KB)
```

**Yerel sunucu.** Kaynak dosyalar üzerinde geliştirirken:

```bash
npm run serve              # http://localhost:8123
```

---

## Windows .exe üretme

```bash
npm install
npm run dist:win           # dist/release/ altına kurulum + taşınabilir .exe
```

Üretilenler:

| Çıktı | Ne işe yarar |
|---|---|
| `YapiCAD-Kurulum-0.1.0.exe` | NSIS kurulum sihirbazı; klasör seçtirir, kısayol oluşturur, kaldırıcı ekler |
| `YapiCAD-Tasinabilir-0.1.0.exe` | Tek dosya taşınabilir; kurulum yapmadan çalışır |
| `win-unpacked/YapiCAD.exe` | Açılmış klasör; exe + Electron çalışma zamanı yan yana |

**Bu komut Windows'ta doğrudan çalışır.** Linux'ta paketleme aşaması (`win-unpacked`,
gerçek `YapiCAD.exe`) Wine olmadan tamamlanır, ancak `.exe` sarmalayıcılarını
(NSIS kurulum ve taşınabilir) üreten son adım **Wine ister**:

```bash
sudo apt install wine64 wine32   # veya dağıtımınızın wine paketi
npm run dist:win
```

Wine yoksa `dist/release/win-unpacked/` klasörünü zipleyip dağıtabilirsiniz;
içindeki `YapiCAD.exe` çalışan Windows uygulamasıdır, yanındaki DLL'ler ve
`resources/` klasörüyle birlikte taşınması gerekir.

İmzalama yapılandırılmamıştır; imzasız exe'de Windows SmartScreen ilk
çalıştırmada uyarı gösterir ("Daha fazla bilgi" → "Yine de çalıştır").

Linux paketi için: `npm run dist:linux` (AppImage).

---

## Klavye

| Tuş | İş | Tuş | İş |
|---|---|---|---|
| `S` | Seç | `K` | Kolon |
| `B` | Kiriş | `P` | Perde |
| `D` | Döşeme | `M` | Ölçüm |
| `F` | Tümünü sığdır | `F8` | Orto aç/kapa |
| `F3` | Yakalamaları topluca aç/kapa | `Esc` | İptal |
| `Enter` | Çokgeni kapat | `Del` | Seçileni sil |
| `Ctrl+Z` / `Ctrl+Y` | Geri / İleri | `Ctrl+A` | Tümünü seç |
| `Boşluk` + sürükle | Kaydır | Tekerlek | İmleçte yakınlaş |
| Oklar | 5 cm ötele | `Shift`+Oklar | 50 cm ötele |

---

## Mimari

```
apps/yapicad/
├── main.js              Electron ana süreç: pencere, yerel menü, dosya diyalogları (IPC)
├── preload.js           contextBridge — renderer'a yalnızca 5 işlev açılır
├── assets/              Uygulama simgesi: icon.svg (kaynak), icon.ico (Windows), icon.png (Linux)
├── renderer/
│   ├── index.html       Şerit, paneller, durum çubuğu, SVG ikon seti
│   ├── css/app.css      Koyu/açık tema, CSS değişkenleriyle
│   └── js/
│       ├── core.js      Veri modeli, birimler, malzemeler, store + geri alma
│       ├── geom.js      Vektör matematiği, yakalama motoru, seçim testi
│       ├── view2d.js    Plan çizici (Canvas2D): ızgara, aks, ölçü, elemanlar
│       ├── view3d.js    3B çizici: prizma yüzleri, derinlik sıralaması, Lambert gölge
│       ├── tools2d.js   Araç durum makinesi, fare/klavye etkileşimi
│       ├── platform.js  Electron / tarayıcı dosya katmanı soyutlaması
│       ├── ui.js        Şerit, ağaç, kat listesi, özellikler, komut satırı
│       └── app.js       Başlatma
└── tools/serve.js       Tarayıcıda denemek için statik sunucu
```

### Tasarım kararları

**Tek birim: santimetre.** Modeldeki *her* uzunluk cm'dir — plan koordinatı da,
kesit ölçüsü de, kat yüksekliği de. Metre yalnızca ekrana yazarken üretilir
(`fmtM`). Karışık birim, bu tür programlarda en yaygın hata kaynağıdır; tek
birimle o sınıf hata baştan yok edilir.

**Geri alma anlık görüntüyle.** Her mutasyondan önce projenin derin kopyası
yığına atılır (en fazla 60 adım). Komut nesnesi/ters-işlem yazmaktan daha basit
ve bu ölçekte (binlerce eleman) bellek açısından sorunsuz.

**Bağımlılık yok.** Renderer saf tarayıcı API'si kullanır — çerçeve yok, WebGL
yok, derleme adımı yok. Dosyalar klasik `<script>` etiketiyle yüklenir; böylece
Electron'un `file://` protokolünde ES modül CORS sorununa takılmaz ve aynı kod
düz tarayıcıda da açılır.

**Node izolasyonu.** `contextIsolation: true`, `nodeIntegration: false`.
Renderer'da `require` ve `process` yoktur (test bunu doğrular); dosya işlemleri
yalnızca preload'daki beş IPC ucundan geçer.

### Bilinen sınırlar

- 3B görünüm **ressam algoritması** kullanır (yüzleri derinliğe göre sıralayıp
  çizer). Z-tampon olmadığı için birbirini kesen büyük yüzeylerde ara sıra
  yanlış sıralama görülebilir. Önizleme amaçlıdır.
- Eleman adları yoğun modellerde üst üste binebilir; *Görünüm → Eleman adları*
  ile kapatılabilir.
- Döşeme çokgenlerinde delik (boşluk) desteği yoktur.
- Kat kotları kümülatiftir; yalnızca en alt katın taban kotu elle girilebilir.

---

## Test

Otomatik doğrulama iki katmanda yapıldı:

1. **Renderer** — gerçek Chromium'da Playwright ile 23 kontrol: eleman
   yerleştirme, zincirleme kiriş, çokgen döşeme, seçim/silme, geri al-yinele,
   komut satırı (araç + kesit + mutlak/göreli koordinat), aks üretimi, otomatik
   yerleşim, kat çoğaltma ve kot hesabı, tema, ölçü zincirlerinin tuval içinde
   kalması, dar pencerede taşma olmaması.
2. **Electron** — `xvfb-run` altında gerçek uygulama: pencere açılışı, preload
   köprüsü, Node sızıntısı olmadığı, yerel menünün renderer'a IPC komutu
   ulaştırması, IPC ile diske gerçek dosya yazımı.

Test betikleri depoda tutulmuyor; yeniden üretmek için `tools/serve.js` +
Playwright yeterlidir.
