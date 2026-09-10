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

### Windows'ta (önerilen — tam pipeline çalışır)

**Tek ön koşul: [Node.js](https://nodejs.org) 18 veya üstü.** Visual Studio,
Python, Wine gerekmez (projede yerel/native modül yok). Node.js kurulu değilse
`npm` komutu tanınmaz ve hiçbir adım çalışmaz.

Kurulum:

```bat
winget install OpenJS.NodeJS.LTS
```

veya <https://nodejs.org> → **LTS** → `.msi`. **Kurulumdan sonra komut
penceresini kapatıp yeniden açın** — `PATH` yalnızca yeni pencerelerde geçerli olur.

**En kolay yol:** `tools\exe-olustur.bat` dosyasına çift tıklayın. Doğru klasörü
kendi bulur, Node.js'i kontrol eder, bağımlılıkları kurar, paketler ve çıktı
klasörünü açar.

**Elle yapmak isterseniz** — `package.json`'un bulunduğu klasörde (`main.js`
ile aynı yerde), `cmd` veya PowerShell'de:

```bat
npm install
npm run dist:win
```

> `cd yapicad` yazmanız gerekmez; zip'i açtığınızda zaten o klasörün
> içindesinizdir. Emin olmak için `dir` çıktısında `package.json` görünmeli.

İlk `npm install` Electron çalışma zamanını indirir (~100 MB), birkaç dakika
sürer; en az 1,5 GB boş disk alanı gerekir. `dist:win` sonunda `dist\release\`
klasöründe:

| Çıktı | Ne işe yarar |
|---|---|
| `YapiCAD-Kurulum-0.1.0.exe` | Kurulum sihirbazı; klasör seçtirir, Başlat menüsü ve masaüstü kısayolu ekler, kaldırıcı bırakır. Yönetici hakkı istemez (kullanıcı bazlı kurulum). |
| `YapiCAD-Tasinabilir-0.1.0.exe` | Tek dosya taşınabilir sürüm; kurulmaz, çift tıklayınca çalışır. USB'ye atılabilir. |
| `win-unpacked\YapiCAD.exe` | Açılmış klasör: exe + DLL'ler + `resources\`. Dağıtırken **klasörün tamamı** taşınmalı. |

Sadece taşınabilir exe yeterliyse: `npm run dist:win-portable`.

**İmzalama yok.** İmzasız exe'de Windows SmartScreen ilk çalıştırmada
"Bilinmeyen yayımcı" uyarısı verir: *Daha fazla bilgi → Yine de çalıştır*.
Bu, kod imzalama sertifikası satın alınmadıkça kaçınılmazdır.

### Linux'ta Windows exe'si üretme

Paketleme aşaması (`win-unpacked` ve içindeki gerçek `YapiCAD.exe`) Wine
olmadan tamamlanır:

```bash
npm run dist:win -- --dir     # yalnızca win-unpacked/
```

Ancak `.exe` sarmalayıcıları (NSIS kurulum ve taşınabilir) **Wine ister**.
Yalnız `wine64` yetmez, tam paket gerekir:

```bash
sudo apt install wine wine64 wine32   # dağıtımınıza göre değişir
npm run dist:win
```

Wine kuramıyorsanız `dist/release/win-unpacked/` klasörünü ziplemek de
çalışan bir dağıtımdır (~110 MB).

### Linux paketi

```bash
npm run dist:linux         # AppImage
```

macOS paketi için ayrı bir hedef tanımlanmadı; `.dmg` üretmek Apple'ın
araç zinciri gereği macOS makinesi ister.

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
