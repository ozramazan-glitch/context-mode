# rc-cad — betonarme tasarım ve çizim yazılımı

> **Bu dizin geçici olarak buradadır.** `context-mode` bir MCP sunucusudur; bu
> uygulamayla hiçbir ortak yanı yoktur. İçerik kendi depolarına taşınacaktır —
> kaybolmaması için şimdilik burada duruyor. Ayrıntı: `docs/rc-cad/YOL-HARITASI.md`
> Bölüm 12, madde 1.
>
> **This directory is parked here temporarily.** It belongs in its own
> repositories; it lives here only so it is not lost.

## Ne var burada

| Yol | İçerik | Durum |
|---|---|---|
| `rcsolve-ref/` | **Hat A** — Python referans uygulaması (oracle) | Faz 0 devam ediyor |
| `docs/adr/` | Mimari karar kayıtları | 5 karar kayıtlı |
| `ci/` | Kendi deposuna taşındığında kullanılacak CI şablonu | hazır |

Hat B (Rust üretim çekirdeği) ve `rc-studio` (TypeScript arayüz) henüz başlamadı —
yol haritasına göre Faz 3B'de, sabit bir tarihle başlamalıdır.

## Çalıştırma

```bash
cd rcsolve-ref
pip install -e '.[dev]'
pytest                 # pythonpath pyproject.toml'da tanımlı
ruff check . && mypy   # biçim ve tip denetimi
```

## Faz 0 durumu

Yol haritası (`docs/rc-cad/YOL-HARITASI.md`) Bölüm 12'deki iş listesine göre:

| # | İş | Durum |
|---|---|---|
| 1 | Depo iskeleti, lisans, CI | **kısmi** — tek dizin; ayrı depolar ve CI bağlantısı taşınmayı bekliyor |
| 2 | ADR altyapısı + kararların kaydı | **bitti** — 5 ADR |
| 3 | Birim sistemi (L0) + testler | **bitti** |
| 4 | Model JSON şeması v1 + doğrulayıcı | **bitti** — şema + L2 dataclass'ları + uyum testleri |
| 5 | Yönetmelik sağlayıcı arayüzleri | **bitti** — `codes/protocols.py` |
| 6 | Ulusal Ek (NDP) veri katmanı | **bitti** — `codes/ec2.py` |
| 7 | Malzeme ve kesit kütüphanesi | **bitti** — 8 beton, 3 çelik, dikdörtgen + T kesit |
| 8 | Doğrulama koşucusu + golden altyapısı | **kısmi** — kapalı-form katmanı hazır; golden havuzu ve iki hat parite kapısı yok |
| 9 | İlk kapalı-form testler (başarısız olarak) | **bitti** — 5 `xfail(strict)` |
| 10 | Rust özdeğer denemesi (spike) | yapılmadı |
| 11 | Kural Kitabı oturumu #1 | yapılmadı |
| 12 | Eurocode ikinci uzmanı | yapılmadı |
| 13 | Faz 1 kabul kriteri | yapılmadı |

10-13 kod işi değildir: 10 Rust ortamı, 11-13 insan kararı ve insan zamanı gerektirir.
Özellikle 12 açık bir risktir — doğrulanmamış bir Eurocode uygulaması, olmayan bir
Eurocode uygulamasından daha tehlikelidir, çünkü kullanılır (ADR-0003).

### Doğrulama durumu

```
165 test geçiyor · 5 xfail(strict) — çözücü kapısı
ruff: temiz · mypy --strict: 21 dosya temiz
```

Beş `xfail(strict)` testi **kasıtlı boşluktur**: çözücü Faz 2-3'te geldiğinde
beklenmedik şekilde geçerler, paket kırılır ve işaretin kaldırılması zorunlu olur.
Boşluk sessizce unutulamaz.

Doğrulamanın altı katmanından (yol haritası Bölüm 7) şu an yalnızca **1. katman**
(kapalı-form) kuruludur. NAFEMS, golden havuz, iki hat paritesi, çapraz doğrulama
ve elle hesap katmanları yok.

## Uyarı

Bu kod **hiçbir gerçek projede kullanılamaz.** Çözücü yoktur, yönetmelik
denetimleri yoktur, hiçbir sonuç bir mühendis tarafından doğrulanmamıştır.

Somut olarak:

- **Madde numaraları yer tutucudur** (`(madde teyit edilecek)`). Ezberden madde
  numarası yazmak bu işte kabul edilemez; resmî metinden teyit edildikçe dolacak.
- **Formüller teyit edilmemiştir.** TS 500 ve EC2 malzeme bağıntıları standart
  kaynaklardan yazılmıştır, ancak resmî yönetmelik metniyle karşılaştırılmamıştır.
- **T kesit burulma sabiti yaklaşıktır** ve gerçek değerden düşüktür; burulmanın
  kritik olduğu bir elemanda yetersizdir.
- **Kiriş kıyasları Euler-Bernoulli'dir** — kayma şekildeğiştirmesi ihmal edilmiştir.
  Narin olmayan elemanlarda (L/h < 10) gerçek davranıştan sapar.
