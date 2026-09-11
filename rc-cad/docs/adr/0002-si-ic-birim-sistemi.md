# ADR-0002 — Çekirdekte SI, sınırda dönüşüm; `pint` kullanılmaz

Durum: **kabul edildi** · 2026-09-10

## Bağlam

Yapısal yazılımdaki hataların en büyük tek sınıfı birim hatasıdır: kN/m ile N/mm
karışır, program çalışır, sayı 1000 kat yanlıştır ve testten geçer. İki
yönetmelik desteklemek bunu ağırlaştırıyor — EC2 mm/N/MPa, TS 500 pratiği çoğu
yerde cm/kN kültüründe.

## Karar

1. **Çekirdekte her şey SI** (m, kg, s, rad, N, Pa). Çıplak `float`/`ndarray`.
2. **Dönüşüm yalnızca giriş/çıkış sınırında**, `units.to_si` / `units.from_si`.
3. **Boyut kapısı zorunlu.** Sınırdaki her okuma `units.require(birim, boyut)`
   üzerinden geçer; uyuşmazlık `DimensionError` ile reddedilir.
4. **Açı ayrı bir boyuttur.** SI'da radyan boyutsuzdur, ama `rad` ile birim
   şekildeğiştirmenin karışması gerçek bir hatadır; ayrı boyut bunu yakalar.
5. **Ön ek (prefix) mantığı yoktur.** Her birim açıkça kayıtlıdır. `mN` yazan
   birinin `MN` demek istemiş olma ihtimali yüksektir; sessizce 10⁹ kat hata
   yapmaktansa bilinmeyen birim hatası vermek yeğdir.

## Sonuçlar

**Neden `pint` değil.** Birim nesneleri sıcak sayısal döngülerde dizi başına
maliyet getirir. Lif integrasyonu ve seyrek montaj bu döngülerin ta kendisidir.

**Bilinen sınır.** Boyut analizi N·m/m ile N'u ayıramaz — ikisi de L·M·T⁻².
Çizgisel moment ile kuvvetin karışması bu kapıdan geçer; ayrımı adlandırma ve
tip disiplini sağlar. Bu sınır `test_units.py` içinde açıkça test edilmiştir ki
sonradan "kapı her şeyi yakalar" sanılmasın.
