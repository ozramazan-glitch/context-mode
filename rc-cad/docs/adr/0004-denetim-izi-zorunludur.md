# ADR-0004 — Her denetim bir iz üretir

Durum: **kabul edildi** · 2026-09-10

## Bağlam

Bu programın çıktısını bir mühendis imzalayacak ve bir yapı denetim kuruluşu
inceleyecek. "Oran 0.87 < 1.0, UYGUN" bir inceleme belgesi değildir.

## Karar

Her türetilmiş değer bir `Derivation`, her talep/kapasite denetimi bir
`Verification` döndürür. Her ikisi de yönetmelik adını, madde referansını,
formülü ve adlandırılmış girdileri taşır. Rapor motoru (L8) yalnızca bu izleri
biçimlendirir; **hesap yapmaz.**

`TraceLog.passed`, denetim listesi boşken `False` döner: *"hiç kontrol etmedim"*
asla *"geçti"* değildir.

## Sonuçlar

**Sonradan eklenemez.** İz yapısı her denetimin çağrı biçimini belirler. Altı ay
sonra eklemek, tüm L5 katmanını yeniden yazmaktır. Bu yüzden Faz 0'dadır.

**Performans.** Sıcak döngülerde `Derivation` üretmek israftır. Kural: tasarım
kodu malzeme değerlerini denetim başında bir kez alır, iç döngüde `.value`
yeniden kullanılır.

**Hukuki sınır.** Madde **numarası** saklanır, madde **metni** asla. TS 500,
TBDY ve Eurocode metinleri telif korumalıdır; standart metnini kod tabanına
gömüp dağıtmak ihlaldir. `clause` alanı bir referanstır, alıntı değil.

**Şimdilik.** Madde numaraları `(madde teyit edilecek)` yer tutucusundadır.
Ezberden madde numarası yazmak bu işte kabul edilemez; resmî metinden teyit
edildikçe doldurulur.
