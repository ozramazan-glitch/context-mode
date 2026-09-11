# ADR-0003 — Çözücü katmanı yönetmelik bilmez; yönetmelik sağlayıcı deseni

Durum: **kabul edildi** · 2026-09-10

## Bağlam

TBDY 2018 + TS 500 *ve* Eurocode 2 + 8 ilk günden desteklenecek. Doğru
yapılırsa ikinci yönetmelik eforun %60-80'i; yanlış yapılırsa ikinci yönetmelik
**ikinci bir üründür**.

## Karar

**L4 çözücüsü ham iç kuvvet üretir ve hiçbir yönetmelik bilmez.** Yönetmeliğe
bağımlı her şey `codes/protocols.py` arayüzlerinin arkasındadır: `MaterialModel`,
`LoadCombinator`, `SectionDesigner`, `DuctilityRules`.

Türetilmiş malzeme değerleri **malzemede durmaz.** `Concrete` yalnızca fck,
fck_cube ve birim hacim ağırlık taşır. Ec, fctk, fcd yönetmeliğe göre farklı
formülle türetilir; sağlayıcıdan gelir. Aynı C30/37 TS 500'de 31.8 GPa, EC2'de
32.8 GPa elastisite modülü verir.

**Eurocode iki katmanlıdır:** kural mantığı (kod) + Ulusal Ek parametreleri
(`NationalAnnex` verisi). NDP'leri koda gömmek her yeni ülkeyi bir kod
değişikliği yapardı.

**Soyutlama her yere zorlanmaz.** Düzensizlik denetimleri (TBDY A1-A3/B1-B3 ile
EC8 düzenlilik kriterleri), hesap yöntemi seçimi (BYS+DTS ile EC8
düzenlilik+periyot) ve performans değerlendirmesi kavramsal olarak farklıdır;
bunlar yönetmeliğe özel işlem hattı alır. Genel bir "tanrı arayüzü" bakımı
imkânsız kod üretir.

## Sonuçlar

**Kod incelemesinin en sıkı kuralı:** L4'e yönetmelik katsayısı sızmaması.

**Sürekli kanıt.** Aynı model iki yönetmelikle çözülür; iç kuvvetler aynı
çıkmalıdır. Çıkmıyorsa sınır delinmiştir. Bu, CI'da zorunlu bir denetimdir.

**Kadro sonucu.** Danışman mühendis TBDY/TS 500 tarafını doğrular; **Eurocode
tarafını doğrulayamaz.** İkinci bir uzman gerekir. Doğrulanmamış bir Eurocode
uygulaması, olmayan bir Eurocode uygulamasından daha tehlikelidir — kullanılır.

**Test sonucu.** Her golden test iki yönetmelikle koşar; havuz ikiye katlanır.
