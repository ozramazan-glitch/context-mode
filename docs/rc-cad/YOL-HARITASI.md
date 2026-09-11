# Betonarme Tasarım ve Çizim Yazılımı — Yol Haritası

Sürüm: **v1.0 — kararlar kilitli** · Tarih: 2026-09-10

---

## 0. Kilitlenen kararlar

| # | Karar | Seçim |
|---|---|---|
| 1 | Kapsam | **Tam kapsam.** Çiz + çöz + tasarla + detaylandır + raporla. |
| 2 | Ekip / mühendislik bilgisi | Betonarme projelendirme tecrübesi **danışman/ekip üyesi** olarak mevcut, tam zamanlı değil. |
| 3 | Teknoloji | **İki hatlı.** Hat A: Python referans (oracle). Hat B: Rust üretim çekirdeği + TypeScript arayüz. |
| 4 | Yönetmelik | **TBDY 2018 + TS 500** *ve* **Eurocode 2 + Eurocode 8** — ilk günden çok-yönetmelikli. |

Bu dördü birlikte, masadaki **en pahalı** kombinasyondur. Rakamlar Bölüm 6'da. Kararlar bilinçli alındı; yol haritası bunları veri kabul edip en sağlam yürütme planını kuruyor.

---

## 1. Acımasız özet — revize rakamlar

Seçilen kapsamın gerçek maliyeti:

| Ölçü | Değer |
|---|---|
| Temel efor (yeniden yazım payı hariç) | **230-300 adam-haftası** |
| Gerçekçi efor (×1.5-2 belirsizlik çarpanı) | **350-500 adam-haftası ≈ 7-10 adam-yılı** |

Takvim süresi ekip büyüklüğüne göre — paralelleştirme hiçbir zaman doğrusal olmadığı için etkin çarpan gerçekçi tutuldu:

| Ekip | Etkin paralellik | Takvim süresi |
|---|---|---|
| 1 kişi | 1.0× | **7-10 yıl — uygulanabilir değil** |
| 2 kişi | 1.8× | 4-5.5 yıl |
| **5 kişi** | 3.5× | **2-2.9 yıl** |
| 8 kişi | 4.5× | 1.6-2.2 yıl (koordinasyon maliyeti artar) |

**Net sonuç: bu kapsam tek kişilik değildir.** Minimum kadro 4-5 kişi. Kadro kurulamıyorsa tek dürüst seçenek kapsamı kesmektir — Bölüm 11'de bırakılabilecek parçalar sıralı olarak listelendi.

Maliyeti üç karar birlikte yaratıyor:
- **Tam kapsam** → çizim (L7) ve detaylandırma (L6) katmanları giriyor; bunlar tek başına toplamın ~%35'i.
- **İki yönetmelik** → L5 katmanı %60-80, L6 katmanı %30-40 büyüyor, regresyon havuzu ikiye katlanıyor.
- **İki hat** → üretim çekirdeği, referans uygulamanın %40-60'ı kadar ek efor. Buna karşılık hata ayıklanabilirliği satın alıyorsunuz; bunun neden pazarlık konusu olmadığı Bölüm 5'te.

---

## 2. Terimler sözlüğü

Peşinen bildiğinizi varsaymadığım kısaltmalar:

| Terim | Açılım / anlam |
|---|---|
| **FEM** | Finite Element Method — Sonlu Elemanlar Yöntemi. Sürekli ortamı sonlu elemanlara bölüp denge denklemlerini matris olarak çözme. |
| **DOF** | Degree of Freedom — serbestlik derecesi. 3B çerçeve düğümünde 6 (3 öteleme + 3 dönme). |
| **Rijitlik matrisi** | `K·u = F` denklemindeki `K`. Yük-yerdeğiştirme ilişkisi. |
| **Seyrek (sparse) matris** | Elemanlarının çoğu sıfır olan matris. Yapısal `K` daima seyrektir. |
| **Kabuk (shell) elemanı** | Döşeme/perde için 2B eleman. Membran (düzlem içi) + plak (eğilme) davranışını birleştirir. |
| **MITC4** | Mixed Interpolation of Tensorial Components, 4 düğümlü. Kayma kilitlenmesine dayanıklı, endüstri standardı dörtgen kabuk formülasyonu. |
| **DKT** | Discrete Kirchhoff Triangle — üçgen plak eğilme elemanı. |
| **Drilling DOF** | Kabuğun kendi düzlemine dik eksen etrafındaki dönme serbestliği. Perde-kiriş uyumu için gerekli. |
| **Rijit diyafram** | Kattaki düğümlerin yatay düzlemde şekil değiştirmeden birlikte hareket etmesi varsayımı. |
| **P-Delta** | İkinci mertebe etki: düşey yükün yanal ötelenme üzerinde ürettiği ek moment. |
| **Modal analiz** | Doğal titreşim periyot ve modlarının özdeğer probleminden bulunması. |
| **CQC** | Complete Quadratic Combination — mod birleştirme. Yakın periyotlarda SRSS'den doğru. |
| **SRSS** | Square Root of Sum of Squares — karelerin toplamının karekökü. |
| **M-N etkileşim** | Kolon kesitinin eksenel kuvvet–moment kapasite sınır yüzeyi. |
| **Kapasite tasarımı** | Göçme mekanizmasını seçilen yerde zorlamak için kesme kuvvetini eleman moment kapasitesinden türetme. |
| **TS 500** | TS 500:2000 — Betonarme Yapıların Tasarım ve Yapım Kuralları (TSE). |
| **TS 498** | Yapı elemanlarının boyutlandırılmasında alınacak yüklerin hesap değerleri. |
| **TBDY 2018** | Türkiye Bina Deprem Yönetmeliği, 01.01.2019 yürürlükte. |
| **DTS** | Deprem Tasarım Sınıfı (TBDY). |
| **BYS** | Bina Yükseklik Sınıfı (TBDY). İzin verilen hesap yöntemini kısıtlar. |
| **ŞGDT** | Şekildeğiştirmeye Göre Değerlendirme ve Tasarım (TBDY Bölüm 5) — doğrusal olmayan yöntem. |
| **Sarılma bölgesi** | Kolon/kiriş uçlarında sık etriye ile sünekliğin arttırıldığı bölge. |
| **EC2** | Eurocode 2 — EN 1992-1-1, betonarme yapıların tasarımı. |
| **EC8** | Eurocode 8 — EN 1998-1, depreme dayanıklı tasarım. |
| **EN 1990** | Eurocode 0 — tasarım esasları, yük birleşimleri. |
| **EN 1991** | Eurocode 1 — yapı üzerindeki etkiler (yükler). |
| **NDP / Ulusal Ek** | Nationally Determined Parameter. Eurocode'un her ülkenin kendi belirlediği katsayıları. EC2/EC8 tek bir yönetmelik değildir. |
| **DCM / DCH** | Ductility Class Medium / High (EC8). Süneklik düzeyi sınıfları. |
| **q faktörü** | EC8 davranış katsayısı. TBDY'deki R'nin karşılığı ama birebir eşdeğeri değil. |
| **B-rep** | Boundary Representation — katıyı sınır yüzeyleriyle tanımlayan 3B model. |
| **2.5B** | Kat kat yığılmış düzlemsel geometri. Binalar için tam B-rep'e gerek bırakmaz. |
| **DXF** | Drawing Exchange Format. Belgelenmiş, açık çizim değişim formatı. |
| **DWG** | AutoCAD'in kapalı yerel formatı. ODA üyeliği (ücretli) gerektirir. |
| **ODA** | Open Design Alliance. DWG okuma/yazma kütüphanesi sağlar. |
| **IFC** | Industry Foundation Classes — buildingSMART'ın açık BIM veri modeli. |
| **BIM** | Building Information Modeling — yapı bilgi modellemesi. |
| **NAFEMS** | Uluslararası sonlu elemanlar doğrulama kuruluşu. Kıyas problemleri fiili standarttır. |
| **Golden test** | Çıktısı bir kez elle doğrulanıp kilitlenen, her değişiklikte birebir karşılaştırılan regresyon testi. |
| **Oracle** | Doğruluğuna güvenilen referans uygulama. Hızlı uygulama buna karşı kıyaslanır. |
| **WASM** | WebAssembly — Rust/C++ kodunu tarayıcıda native'e yakın hızda çalıştırma. |
| **FFI** | Foreign Function Interface — bir dilden başka dilde yazılmış kütüphaneyi çağırma. |
| **ADR** | Architecture Decision Record — mimari kararın gerekçesiyle yazılı kaydı. |
| **Tauri** | Rust arka uçlu, sistem web görünümü kullanan masaüstü uygulama çatısı. Electron'dan hafif. |

> Yönetmelik madde numaraları bu belgede **yön göstermek** için verildi. Kodlamadan önce her biri resmî metinden teyit edilmeli. Ezberden madde numarası yazmak bu işte kabul edilemez.

---

## 3. Mimari — katmanlar

Tek yönlü bağımlılık. Alt katman üstünü tanımaz.

```
L8  Rapor motoru          (statik hesap raporu, PDF/HTML, çok dilli + çok yönetmelikli)
L7  Çizim / CAD katmanı   (ekran, snap, undo, paftalar, DXF)
L6  Detaylandırma motoru  (donatı seçimi, kenetlenme, bindirme, metraj)   ── yönetmeliğe bağımlı
L5  Yönetmelik denetimi   (TBDY+TS 500 | EC8+EC2, madde izlemeli)         ── yönetmeliğe bağımlı
L4  Çözücü (FEM)          (eleman kütüphanesi, montaj, seyrek çözüm, modal) ── yönetmelikten BAĞIMSIZ
L3  Ağ üretici (mesher)   (döşeme/perde → kabuk ağı, rijit uç bölgeleri)
L2  Yapısal model         (düğüm, eleman, yük, kombinasyon, kat, diyafram)
L1  Geometri çekirdeği    (2.5B: nokta, çizgi, poligon, boolean)
L0  Birim sistemi         (tipli birimler, SI iç gösterim)
```

**Kritik sınır: L4 yönetmelik bilmez.** Çözücü ham iç kuvvet üretir. Yönetmeliğe bağımlı her şey L5 ve üstündedir. Bu sınırın delinmesi (ör. çözücünün içine TBDY yük katsayısı sızması) çok-yönetmelikli mimariyi öldürür. Kod incelemesinde bu tek kural en sıkı denetlenen madde olmalı.

### L0 — Birim sistemi

Yapısal yazılımdaki hataların en büyük tek sınıfı birim hatasıdır. kN/m ile N/mm karışması binayı yanlış boyutlandırır ve testten geçer.

- İçeride **her şey SI** (N, m, Pa, kg). Dönüşüm yalnızca giriş/çıkış sınırında.
- Birimler **tipe gömülü**: Python'da `pint`, Rust'ta `uom`, TypeScript'te branded type. "Değişken adına birim yazarım" yeterli değildir.
- Eurocode ile çalışmak bunu daha da kritik yapıyor: EC2 mm/N/MPa, TS 500 pratiği çoğu yerde cm/kN. İki yönetmelik iki birim kültürü demek.

### L1 — Geometri çekirdeği (2.5B, tam B-rep DEĞİL)

**Tam 3B B-rep kernel kullanmayın.** Binalar yığılmış katlardan oluşur; 2B poligon + kat yüksekliği ötelenmesi betonarme binaların ~%95'ini kapsar. OpenCASCADE'i projeye sokmak aylar yer ve karşılığını vermez.

- 2B boolean işlemleri için **hazır kütüphane**: Clipper2 (C++/Rust bağlaması), `shapely` (Python). Kendi poligon kesişiminizi yazmayın — kenar durumları bitirir.
- Gerekenler: nokta/çizgi/yay/poligon, offset, boolean, alan ve atalet momenti, üçgenleştirme.

### L2 — Yapısal model (tek doğru kaynak)

Analizden ve çizimden bağımsız, serileştirilebilir (JSON), **şema sürümlü** veri modeli:

`Node`, `FrameMember`, `ShellPanel`, `Support`, `Release`, `RigidOffset`, `Load`, `LoadCase`, `LoadCombination`, `Diaphragm`, `Storey`, `Material`, `Section`, `RebarLayout`

- Model **değişmez (immutable)** ve saf veri. Çözücü model alır, sonuç döner; modeli değiştirmez. Undo/redo, karşılaştırma ve test bedavaya gelir.
- Şema **tek kaynaktan** tanımlanır (JSON Schema), Python ve Rust tipleri buradan **üretilir**. Elle iki yerde tutmak, iki hattın sessizce ayrışması demektir.
- Modelde **yönetmelik alanı yoktur.** Yönetmelik bir *analiz parametresi*, model özelliği değil. Aynı model iki yönetmelikle çözülebilmelidir — bu zaten en güçlü doğrulama aracınız olacak.

### L3 — Ağ üretici

Sanılandan zor. Perde-kiriş, perde-döşeme, kolon-döşeme birleşimlerinde düğüm uyumu, ağ kalitesi ve rijit uç bölgeleri burada çözülür. Kötü ağ = sessizce yanlış sonuç.

### L4 — Çözücü (yönetmelikten bağımsız)

Eleman kütüphanesi, bu sırayla:
1. **3B çerçeve elemanı** — 12 DOF, rijit uç bölgeli, kayma şekildeğiştirmesi opsiyonlu (Timoshenko).
2. **Kabuk elemanı** — MITC4 (dörtgen) + DKT (üçgen), drilling DOF ile.

Sayısal altyapı — **kendiniz yazmayın**:
- Seyrek doğrudan çözücü: `scipy.sparse.linalg` (Hat A), SuiteSparse/CHOLMOD veya `faer` (Hat B).
- Özdeğer: `scipy.sparse.linalg.eigsh` shift-invert (Hat A); Hat B'de bu **Rust'ın zayıf noktası** — ARPACK veya Spectra'ya FFI ile bağlanmayı baştan planlayın, kendi altuzay iterasyonunuzu yazmayı son çare sayın.

Analiz tipleri, faz sırasıyla: doğrusal statik → rijit diyafram kısıtı → P-Delta → modal → tepki spektrumu + CQC → *(çok sonra)* itme analizi / ŞGDT.

### L5 — Yönetmelik denetimi

Ürünün asıl değeri burada. Mimarisi Bölüm 4'te ayrıca ele alındı.

**Zorunlu tasarım kuralı: her denetim bir iz (trace) üretir** — madde referansı, girdi değerleri, uygulanan formül, ara sonuçlar, oran, geçti/kaldı. Bu iz doğrudan rapora akar. Bir mühendisin imzalayacağı programda "0.87 < 1.0 OK" yetmez; nereden geldiği görünmeli. **Bunu sonradan eklemek imkânsıza yakındır — ilk günden mimariye koyun.**

### L6 — Detaylandırma motoru

Donatı çapı/adet seçimi, pilye ve kesme noktaları, kenetlenme boyu, bindirme boyu, etriye aralık geçişleri, demir büküm listesi.

Kısıt sağlama + optimizasyon problemi, üstüne yoğun "büro pratiği" katmanı. **Herkes bunu hafife alır.** Aynı hesap sonucundan iki büro iki farklı donatı çizer ve ikisi de doğrudur. Yapılandırılabilir olmak zorunda. Danışman mühendisin en çok gerekeceği katman burası — Bölüm 8'e bakın.

### L7 — Çizim / CAD katmanı

- Ekran: 2B için Canvas2D, 3B için WebGL (Three.js). Tauri içinde web görünümü kullanıldığı için bu doğal seçim.
- Etkileşim: yakalama (endpoint / midpoint / kesişim / dik / ızgara), ortogonal kilit, komut satırı.
- **Undo/redo: komut deseni (command pattern), ilk günden.** Sonradan eklemek yeniden yazmak demektir.
- Pafta düzeni, ölçülendirme, tarama, yazı stilleri.
- **DXF dışa aktarım** ile başlayın. **DWG'yi erteleyin** — ODA lisansı ücretli, ilk sürümde değmez.
- Kademelendirme: önce *otomatik üretilmiş, düzenlenemeyen* çizim (Faz 10a), sonra etkileşimli editör (Faz 10b). Faz 10a tek başına kullanıcının %70'ini memnun eder ve eforun %30'udur.

### L8 — Rapor motoru

HTML→PDF (Chromium/Playwright) veya LaTeX. **L5'in ürettiği izlerin biçimlendirilmesinden ibaret olmalı — rapor katmanı hesap yapmamalı.** İki yönetmelik + iki dil (TR/EN) kombinasyonu şablon altyapısını baştan çok dilli kurmayı gerektirir.

---

## 4. Çok yönetmelikli mimari (TBDY+TS 500 ‖ EC8+EC2)

Kararın en ağır teknik sonucu bu. Doğru yapılırsa ikinci yönetmelik eforun %60-80'i; yanlış yapılırsa ikinci yönetmelik **ikinci bir ürün** olur.

### Yapılmaması gereken

Kod içine dağılmış `if (yonetmelik == "TBDY") ... else ...` dalları. Bu, altı ay sonra hiçbir denetimin hangi yönetmelikte ne yaptığını bilinemez hâle getirir ve üçüncü yönetmeliği (ACI) imkânsız kılar.

### Yapılması gereken — Yönetmelik Sağlayıcısı deseni

L4 ham iç kuvvet üretir. Yönetmeliğe bağımlı her şey arayüz arkasına alınır; her yönetmelik bir uygulama seti + bir katsayı veri dosyasıdır:

| Arayüz | Sorumluluk | TBDY/TS 500 | EC8/EC2 |
|---|---|---|---|
| `IMaterialModel` | Tasarım dayanımları, malzeme katsayıları, gerilme bloğu | TS 500 | EC2 (γc, γs Ulusal Ek'ten) |
| `ILoadCombinator` | Yük birleşim üretici | TS 500 | EN 1990 (ψ katsayıları) |
| `ILoadDefinitions` | Karakteristik yükler | TS 498 | EN 1991 |
| `ISeismicHazard` | Tasarım spektrumu | Ss, S1, zemin sınıfı ZA-ZF | ag, S, spektrum tip 1/2 |
| `IBehaviourFactor` | Davranış katsayısı | R, D, I | q, DCM/DCH |
| `ISectionDesigner` | Eğilme / eksenel / kesme kapasitesi | TS 500 | EC2 |
| `IDuctilityRules` | Sarılma, min/maks donatı, kapasite tasarımı | TBDY Bölüm 7 | EC8 §5 |
| `IDetailingRules` | Kenetlenme, bindirme, etriye aralığı | TS 500 + TBDY | EC2 §8 + EC8 |
| `IDriftLimits` | Göreli kat ötelemesi sınırları | TBDY Bölüm 4 | EC8 hasar sınırlama |

### Soyutlamanın sızdığı yerler — dürüst olmak gerekirse

Her şeyi tek arayüze zorlamak hata olur. Bu üçü **kavramsal olarak farklı**, ortak arayüz uydurmak yerine yönetmelik başına ayrı işlem hattı (pipeline) kurun:

1. **Düzensizlik denetimleri.** TBDY'nin A1 burulma düzensizliği katsayısı ile EC8'in plan düzenliliği kriterleri aynı şeyin iki versiyonu değil, farklı kavramlar. Ortak arayüz burada zorlama olur.
2. **Hesap yöntemi seçimi.** TBDY'de BYS + DTS izin verilen yöntemi belirler; EC8'de düzenlilik + periyot belirler. Karar ağaçları farklı.
3. **Performans/değerlendirme yaklaşımı.** TBDY Bölüm 5 (ŞGDT) ile EC8 Part 3 farklı felsefeler. Bu faz zaten çok geride — ama şimdiden ortak arayüz uydurmayın.

Kural: **şekli uyuşan yerde arayüz, uyuşmayan yerde yönetmeliğe özel hat.** Genel bir "tanrı arayüzü" bakımı imkânsız kod üretir.

### Ulusal Ek (NDP) boyutu — gözden kaçan katman

**EC2/EC8 tek bir yönetmelik değildir.** EN 1992-1-1 ve EN 1998-1, her ülkenin kendi belirlediği parametreler (NDP) içerir: malzeme katsayıları, minimum donatı oranları, sınır değerler. Türkiye, Almanya, İngiltere farklı değerler kullanır.

Sonuç: Eurocode sağlayıcısı **iki katmanlı** olmalı — kural mantığı (kod) + ülke parametreleri (veri dosyası). NDP'leri koda gömerseniz her yeni ülke bir kod değişikliği olur. Veri dosyası olursa yeni ülke bir YAML dosyasıdır.

### Test sonucu

Her golden test **iki yönetmelik altında** koşar. Regresyon havuzu ikiye katlanır. Buna karşılık büyük bir hediye alıyorsunuz: **aynı modelin iki yönetmelikle çözülmesi, L4'e yönetmelik sızmadığının sürekli kanıtıdır.** İki sonuç aynı iç kuvvetleri veriyorsa çözücü temizdir. Bunu CI'da zorunlu bir denetim yapın.

### Kadro sonucu — atlanmaması gereken

Danışman mühendisiniz TBDY/TS 500 tarafını doğrulayabilir. **Eurocode tarafını doğrulayamaz.** EC2/EC8 uygulamasını inceleyecek ikinci bir uzman gerekir. Bu bir tercih değil: doğrulanmamış bir Eurocode uygulaması, olmayan bir Eurocode uygulamasından **daha tehlikelidir** — çünkü kullanılır.

---

## 5. İki hatlı geliştirme — kilitli tasarım

### Hat A — `rcsolve-ref` (Python)

- `numpy` + `scipy.sparse` + `scipy.sparse.linalg`
- Arayüz yok, CAD yok, performans çalışması yok
- CLI sözleşmesi: `rcsolve-ref solve model.json --code TBDY2018 -o results.json`
- Amaç: **mühendisliğin doğru olduğunu kanıtlamak.** Kod okunabilir, formüller ders kitabındaki hâline birebir benzer olmalı — zekice ama okunmaz optimizasyon burada yasaktır.
- **Asla silinmez.** Kalıcı oracle olarak CI'da yaşar.

### Hat B — `rcsolve` (Rust) + `rc-studio` (TypeScript/Tauri)

- Rust: `faer` (yoğun/seyrek lineer cebir), `nalgebra`; seyrek Cholesky
- **Özdeğer çözücü Rust'ın zayıf noktası.** ARPACK veya Spectra'ya FFI bağlaması baştan planlanmalı. Bunu keşfetmek için Faz 3B'yi beklemeyin — Faz 0'da 3 günlük bir deneme (spike) ile doğrulayın.
- Native kütüphane + WASM olarak derlenir
- Arayüz: Tauri (Rust arka uç doğal uyumlu, Electron'dan hafif)

### İki hat arasındaki sözleşme

1. **Ortak JSON şeması**, tek kaynaktan; Python ve Rust tipleri üretilir, elle yazılmaz.
2. **Ortak kıyas havuzu** (`benchmarks/`), her iki hat tarafından koşulur.
3. **CI kapısı:** her kıyas her iki hattan geçer, tolerans dahilinde uyuşmalıdır — yerdeğiştirme 1e-8 bağıl, iç kuvvet 1e-6, periyot 1e-6. Uyuşmazlık derlemeyi kırar.
4. **Demir kural: Hat B, Hat A'da olmayan bir özelliği yayınlamaz.** Hat A daima 3-6 ay önde.

### Bu kararın maliyeti ve karşılığı

Maliyet: ikinci kod tabanı, ~%40-60 ek efor, **ve en az iki kişi** — tek kişi iki hattı sürdüremez, ikinci hat hiç başlamaz.

Karşılık: bir sonuç yanlış çıktığında sorunun formülde mi, sayısal kurulumda mı, optimizasyonda mı olduğunu **ayırt edebilmek.** Tek hatta "hem hızlı hem doğru" yazmaya çalışmak, hata ayıklanamayan bir kod tabanı üretir. 7-10 adam-yıllık bir projede bu, pazarlık konusu değildir.

---

## 6. Faz planı

Tahminler **adam-haftası** cinsinden (takvim değil). Ekibe bölünmesi Bölüm 1'deki tabloya göre.

| Faz | İçerik | Efor | Bağımlılık |
|---|---|---|---|
| **0** | Kararlar, iki repo, birim sistemi, model şeması, **yönetmelik sağlayıcı arayüzleri**, doğrulama altyapısı + CI, Rust özdeğer denemesi | 5-6 | — |
| **1** | **Dikey dilim: tek kiriş.** JSON → çöz → TS 500 **ve** EC2 tasarla → DXF kesit → HTML rapor | 6-8 | 0 |
| **2** | 2B düzlem çerçeve çözücü + kapalı-form doğrulama (Hat A) | 4-6 | 1 |
| **3** | 3B çerçeve + rijit diyafram + P-Delta (Hat A) | 8-10 | 2 |
| **3B** | **Hat B başlangıcı:** Rust çekirdek, Faz 1-3 paritesi, CI kapısı | 10-14 | 3 · *paralel yürür* |
| **4** | Yük motoru: TS 498 + EN 1991, TS 500 + EN 1990 kombinasyonları | 5-7 | 3 |
| **5a** | Deprem — TBDY: eşdeğer deprem yükü, modal, spektrum, CQC, A/B düzensizlikleri | 10-14 | 4 |
| **5b** | Deprem — EC8: spektrum tip 1/2, q faktörü, düzenlilik kriterleri | 6-9 | 5a |
| **6** | Kesit tasarımı: M-N yüzeyi, iki eksenli eğilme, kesme — TS 500 **+** EC2 | 18-24 | 4 |
| **7** | Kabuk elemanlar: döşeme + perde, NAFEMS doğrulaması | 12-16 | 3 |
| **8** | Temeller: tekil, sürekli, radye, zemin yayı | 8-12 | 7 |
| **9** | Donatı detaylandırma: TBDY B.7 **+** EC8 DCM/DCH, metraj | 22-28 | 6 |
| **10a** | Otomatik çizim üretimi + DXF (etkileşimsiz) | 8-10 | 9 |
| **10b** | Etkileşimli CAD editörü: snap, undo, pafta, düzenleme | 14-20 | 10a |
| **11** | Rapor motoru: çok yönetmelikli, çok dilli | 8-10 | 5b, 6 |
| **12** | Sertleştirme, performans, 20 TR + 20 EC gerçek proje saha testi | 16-24 | tümü |

**Toplam: 161-218 adam-haftası temel efor.** Yeniden yazım ve keşfedilmemiş karmaşıklık için ×1.5-2 → **~350-500 adam-haftası ≈ 7-10 adam-yılı.**

### Kritik yol

`0 → 1 → 2 → 3 → 4 → 6 → 9 → 10a → 10b → 12`

Faz 6 (kesit tasarımı) ve Faz 9 (detaylandırma) birlikte toplam eforun ~%25'i ve kritik yolda. **Bunlar en çok danışman mühendis gerektiren fazlar** — Bölüm 8'deki çalışma modeli buna göre kuruldu.

Paralelleştirilebilenler: Faz 7 (kabuk) Faz 4'ten sonra bağımsız; Faz 3B sürekli paralel; Faz 11 (rapor) Faz 5b/6 sonrası bağımsız.

### Faz 1 neden kapı

Faz 1 — "tek kiriş, uçtan uca, iki yönetmelikle" — projenin **gidiş/kalış kapısı.** İçinde her katmandan bir parça var ve çok-yönetmelikli mimarinin çalışıp çalışmadığını ilk kez kanıtlıyor. **8 haftada bitmiyorsa mimari yanlıştır** — bunu 8. haftada öğrenmek, 2. yılda öğrenmekten iyidir. Faz 1 sonunda bilinçli bir devam/durdur kararı verin.

---

## 7. Doğrulama stratejisi — projenin yaşam sigortası

İsteğe bağlı değil. **Doğrulama altyapısı Faz 0'da, ilk özellikten önce kurulur.**

**Katman 1 — Kapalı-form kıyaslar.** Konsol kiriş, basit mesnetli kiriş, ankastre çerçeve, tek serbestlik dereceli sistem periyodu. Analitik çözümle 1e-9 mertebesinde uyuşmalı. Birim testtir, saniyeler sürer, her commit'te koşar.

**Katman 2 — NAFEMS kıyas problemleri.** Kabuk ve plak elemanları için fiili endüstri standardı. **Kabuk elemanı NAFEMS'ten geçmeden üretime giremez.**

**Katman 3 — Golden regresyon havuzu.** 30-50 model dosyası × 2 yönetmelik. Sonuçlar bir kez elle doğrulanıp kilitlenir; her commit'te karşılaştırılır. Bir sayı değişirse derleme kırılır.

**Katman 4 — İki hat parite denetimi.** Her kıyas Hat A ve Hat B'den geçer, tolerans dahilinde uyuşur. (Bölüm 5)

**Katman 5 — Çapraz doğrulama.** 20 TR projesi ideCAD/ETABS ile, 20 EC projesi bir Eurocode aracı ile. **Farkların her biri açıklanır** — "yakın" yeterli değil, sapmanın sebebi bilinmeli.

**Katman 6 — Elle hesap doğrulaması.** Ders kitabı çözümlü örnekleri test vakası olarak koyun (TBDY tarafı için Türkçe standart betonarme kaynakları, EC tarafı için EC2/EC8 worked examples). **Yönetmelik denetim katmanının doğruluğu buradan gelir, FEM'den değil** — FEM doğru iç kuvvet verirken yönetmelik denetimi tamamen yanlış olabilir.

---

## 8. Danışman mühendisle çalışma modeli

Karar 2: mühendislik bilgisi ekipte var ama **tam zamanlı değil.** Bu, yol haritasının önceliklerini değiştiriyor.

**Temel risk:** danışmanın müsait olmadığı bir dönemde Faz 6 veya Faz 9'a girmek. Bu fazlar mühendislik kararı olmadan ilerleyemez; ilerlerse yanlış ilerler ve yanlış olduğu aylar sonra anlaşılır.

**Karşı önlem — bilgiyi öne çekmek:**

1. **Faz 0'da "Kural Kitabı" oturumları.** Danışmanla 4-6 oturum, çıktı yazılı bir kural dokümanı: hangi durumda hangi donatı, hangi büro konvansiyonu, hangi pratik kısıtlar. Bu doküman Faz 9'un girdisidir ve Faz 9'a gelene kadar hazır olmalıdır. **Faz 9'da bilgi toplamaya başlarsanız geç kalmışsınızdır.**
2. **Kabul kriterlerini danışman yazar.** Her fazın "bitti" tanımını geliştirici değil mühendis yazsın. Bu, danışman zamanının en verimli kullanımıdır — az saat, yüksek etki.
3. **Doğrulama seansları takvime bağlanır.** Faz 1, 5a, 6, 9 bitişlerinde birer tam gün. Ad-hoc "müsait misin?" modeli bu ölçekte çalışmaz.
4. **Golden test'leri danışman onaylar.** Bir golden test'in beklenen değeri mühendis imzası olmadan kilitlenmez. Yanlış kilitlenmiş bir golden test, hatayı kalıcılaştırır — testler sizi korumak yerine yanlışı savunur hâle gelir.
5. **Eurocode için ikinci uzman.** (Bölüm 4) Bu kişiyi Faz 1'den önce bulun; Faz 1 zaten EC2 içeriyor.

---

## 9. En büyük 6 risk

1. **Doğruluk illüzyonu.** Program çalışır, sayı üretir, sayı yanlıştır. Test yoksa fark edilmez. → Bölüm 7'deki altı katmanlı doğrulama, ilk günden.
2. **Detaylandırmanın hafife alınması (L6/Faz 9).** Kod yazma değil, büro pratiği kodifikasyonu. İki yönetmelikle 28 haftaya kadar çıkar ve kritik yolda. → Bölüm 8'deki Kural Kitabı oturumları.
3. **Çok yönetmelikliliğin sızması.** L4'e yönetmelik girer, mimari çöker, EC uygulaması ikinci ürün olur. → L4 sınırını kod incelemesinde en sıkı denetlenen kural yapın; iki yönetmelikli parite testi bunu sürekli kanıtlar.
4. **CAD katmanının dipsiz kuyu olması (L7).** "Sadece çizim" diye başlanır, snap/ölçülendirme/pafta/yazdırma derken bir yıl gider. → Faz 10a/10b ayrımına sadık kalın; 10a yayınlanır, 10b sonra gelir.
5. **İkinci hattın hiç başlamaması.** Kadro yetmezse Hat B ertelenir, ertelenir, ölür; Python prototip üretime zorlanır. → Hat B'nin başlangıcı (Faz 3B) takvimde sabit tarih olmalı, "sıra gelince" değil.
6. **Güven / pazar direnci.** Yapı denetim ve meslektaşlar tanımadıkları bir programın çıktısına şüpheyle bakar. Teknik değil ticari problem, kodla çözülmez. → Çapraz doğrulama raporlarını kamuya açık yayımlayın, kıyas dosyalarını paylaşın.

---

## 10. Hukuki ve ticari uyarılar

Tavsiye niteliğindedir, hukuki görüş değildir; avukatla teyit edin.

- **Sorumluluk.** Yazılımınızın ürettiği yanlış tasarımdan bina hasar görürse maruz kalırsınız. Kullanıcı sözleşmesi (EULA), sorumluluk sınırlaması ve mesleki sorumluluk sigortası konuşulmalı. "Nihai sorumluluk imzalayan mühendistedir" ifadesi tek başına yeterli koruma sağlamayabilir.
- **TS 500, TBDY 2018 ve Eurocode metinleri telif korumalıdır.** Kuralları *uygulayabilirsiniz* (yöntem ve olgular telifle korunmaz), ancak standart metnini kod tabanına gömüp dağıtamazsınız. TSE ve CEN standartları satın alınır. Rapor çıktısında madde **numarası** referansı sorun değil; madde **metnini** kopyalamak sorundur.
- **Eurocode ayrıca ulusal düzenlemeye tabidir.** Her ülkenin Ulusal Eki ayrı bir belgedir ve ayrı satın alınır. Desteklediğiniz her ülke için bu maliyet tekrarlanır.
- **DWG** kapalı formattır; ODA üyeliği (ücretli) gerekir. **DXF** belgelenmiş ve serbesttir — onunla başlayın.
- **IFC** açıktır (buildingSMART). `IfcOpenShell` LGPL — dinamik bağlama koşullarına dikkat.
- **Türkiye'de yapı ruhsatı için kullanılan hesap yazılımının devlet tarafından sertifikalandırılması söz konusu değil** (bildiğim kadarıyla; teyit edilmeli). Hesabı imzalayan mühendis sorumludur. Pazara girişi kolaylaştırır ama güven problemini çözmez.

---

## 11. Kapsam kesme sırası — kadro yetmezse

Kadro 4-5 kişiye ulaşmıyorsa kapsam kesilmelidir. Kesme sırası, en az değer kaybıyla en çok efor kazandıran sıradadır:

| Sıra | Kesilen | Kazanç | Kayıp |
|---|---|---|---|
| 1 | **Faz 10b** (etkileşimli CAD editörü) | 14-20 hafta | Kullanıcı çizimi AutoCAD'de düzenler. Çoğu büro zaten böyle çalışıyor. |
| 2 | **Faz 5b + EC2 tarafı** (Eurocode tamamen) | 40-55 hafta | Avrupa pazarı ertelenir. Mimari soyutlama kalır, sonra eklenir. |
| 3 | **Hat B** (Rust üretim çekirdeği) | ~%40 | Python + PySide6 ile yayınlanır. Performans tavanı düşer. |
| 4 | **Faz 8** (temeller) | 8-12 hafta | Temel hesabı harici araçta yapılır. |
| 5 | **Faz 7** (kabuk: döşeme/perde) | 12-16 hafta | Sadece çerçeve sistemler. Ciddi kapsam daralması. |

1 ve 2'yi kesmek projeyi **2 kişiyle 2-2.5 yılda** yapılabilir hâle getirir ve mimariyi bozmaz. Bu, kadro kurulamazsa önereceğim yol.

---

## 12. Faz 0 — ilk 6 haftanın somut iş listesi

1. **Yeni repo(lar).** `rcsolve-ref` (Python), `rcsolve` (Rust), `rc-studio` (TS), `rc-benchmarks` (ortak kıyas havuzu). Lisans, `CONTRIBUTING`, CI hattı. **Bu iş `context-mode` reposunda yaşayamaz.**
2. **ADR altyapısı** ve Bölüm 0'daki dört kararın gerekçeli yazılı kaydı.
3. **Birim sistemi** + tip tanımları (Python `pint`, Rust `uom`) + dönüşüm testleri.
4. **Model JSON şeması v1** + doğrulayıcı + sürüm göçü altyapısı + Python/Rust tip üretimi.
5. **Yönetmelik sağlayıcı arayüzleri** (Bölüm 4 tablosu) — henüz boş uygulamalarla. Arayüzü önce tasarlayın, ilk yönetmeliği sonra doldurun.
6. **NDP veri dosyası şeması** (Eurocode Ulusal Ek parametreleri).
7. **Malzeme kütüphanesi:** C20/25…C50/60, B420C/S420 (TS 500 tasarım dayanımları) ve EC2 karşılıkları; kesit kütüphanesi.
8. **Doğrulama koşucusu:** `benchmarks/` yapısı, kapalı-form testler, golden test altyapısı, iki hat parite kapısı — CI'da zorunlu.
9. **İlk kapalı-form testler** (konsol kiriş, basit mesnetli kiriş, ankastre çerçeve) — çözücü henüz yokken **başarısız** olarak yazılır.
10. **Rust özdeğer denemesi (spike, 3 gün).** ARPACK/Spectra FFI bağlaması çalışıyor mu? Bunu Faz 3B'de keşfetmek geç.
11. **Kural Kitabı oturumu #1** danışman mühendisle (Bölüm 8).
12. **Eurocode ikinci uzmanının bulunması.**
13. **Faz 1 kabul kriteri** — tek sayfa, danışman mühendis tarafından yazılmış.

---

## Ek: yapay zekâ desteğinin gerçek sınırı

Claude Code gibi araçlar iskelet kodu, veri sınıflarını, ayrıştırıcıları, test koşucularını, DXF yazıcısını, şema üreticilerini hızlandırır. Kazanç gerçek ve büyük — özellikle bu projedeki çok sayıda tekrarlı yapıda (iki yönetmelik × çok sayıda denetim).

Hızlandırmadığı iki şey var, ve zorluğun tamamı orada:

1. **Mühendislik doğruluğunun kanıtlanması.** Kodun derlenmesi ile sonucun doğru olması ayrı şeylerdir. Bir yönetmelik maddesinin doğru yorumlandığını ancak bir mühendis söyleyebilir.
2. **Detaylandırma pratiğinin kodifikasyonu.** Bu bilgi yazılı değil, tecrübede.

**Risk:** iskelet kodun hızla ilerlemesi *ilerleme illüzyonu* yaratır. Üç ayda 40.000 satır kod ve çalışan bir arayüz olur, doğrulanmış tek bir sonuç olmaz. Bölüm 7'deki doğrulama disiplini bunun tek panzehiridir.
