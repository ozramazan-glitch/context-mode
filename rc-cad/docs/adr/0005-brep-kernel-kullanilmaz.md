# ADR-0005 — Tam 3B B-rep geometri çekirdeği kullanılmaz; 2.5B yeterlidir

Durum: **kabul edildi** · 2026-09-10

## Bağlam

Bir CAD uygulamasının geometri çekirdeği seçmesi beklenir. OpenCASCADE akla
gelen ilk adaydır: olgun, güçlü, LGPL.

## Karar

**Tam 3B B-rep (sınır gösterimli katı modelleme) kullanılmaz.** Geometri 2.5B'dir:
2B poligon + kat yüksekliği ötelenmesi.

2B boolean işlemleri için hazır kütüphane kullanılır (Clipper2 / `shapely`).
Kendi poligon kesişimimizi yazmayız.

## Sonuçlar

**Gerekçe.** Binalar yığılmış katlardan oluşur. 2.5B betonarme binaların ~%95'ini
kapsar. OpenCASCADE'i projeye sokmak aylar yer, dik bir öğrenme eğrisi getirir
ve karşılığını vermez.

**Kabul edilen sınır.** Eğrisel yüzeyli kabuklar, eğik düzlemli rampalar ve
düzensiz üç boyutlu geometri bu modele girmez. Bu bilinçli bir kapsam kararıdır;
gerekirse ileride ayrı bir katman olarak ele alınır, bugünkü mimariyi
karmaşıklaştırarak değil.

**Reddedilen alternatif.** Kendi boolean/kesişim kodumuzu yazmak. Kenar
durumları (çakışan kenarlar, teğet temas, sayısal tolerans) bu problemin
tamamıdır ve olgun kütüphaneler onlarca yıldır bunları biriktirmiştir.
