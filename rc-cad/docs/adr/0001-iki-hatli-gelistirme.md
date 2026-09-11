# ADR-0001 — İki hatlı geliştirme: Python referans, ardından üretim çekirdeği

Durum: **kabul edildi** · 2026-09-10

## Bağlam

7-10 adam-yıllık bir sayısal yazılım yazılacak. Sayısal kodda bir sonuç yanlış
çıktığında üç aday vardır: formül yanlış, sayısal kurulum yanlış, ya da
optimizasyon bozmuş. Tek kod tabanında bu üçü ayrıştırılamaz.

## Karar

İki hat yürütülür:

- **Hat A — `rcsolve-ref` (Python).** Arayüz yok, performans çalışması yok.
  Kod okunabilir, formüller ders kitabındaki hâline birebir benzer. Kalıcı
  *oracle*: doğruluğuna güvenilen referans.
- **Hat B — `rcsolve` (Rust) + `rc-studio` (TypeScript/Tauri).** Üretim.

Aralarındaki sözleşme:

1. Ortak JSON şeması tek kaynaktan; tipler üretilir, elle yazılmaz.
2. Ortak kıyas havuzu, her iki hat tarafından koşulur.
3. CI kapısı: yerdeğiştirme 1e-8, iç kuvvet 1e-6, periyot 1e-6 bağıl tolerans.
   Uyuşmazlık derlemeyi kırar.
4. **Hat B, Hat A'da olmayan özelliği yayınlamaz.** Hat A daima 3-6 ay önde.

## Sonuçlar

**Bedel.** İkinci kod tabanı, ~%40-60 ek efor, **ve en az iki kişi.** Tek kişi
iki hattı sürdüremez — ikinci hat hiç başlamaz. Bu risk yol haritası Bölüm 9,
madde 5'te kayıtlıdır ve karşı önlemi Faz 3B'ye sabit tarih vermektir.

**Karşılık.** Yanlış sonucun kaynağını ayırt edebilmek.

**Reddedilen alternatif.** Tek hat "hem hızlı hem doğru". Bu ölçekte hata
ayıklanamayan bir kod tabanı üretir.

**Kadro yetmezse.** Hat B kesilebilir (yol haritası Bölüm 11, sıra 3); Hat A
Python + PySide6 ile yayınlanır, performans tavanı düşer. Hat A asla kesilmez.
