"""L2 — Kesit geometrisi / section geometry.

Yalnızca **geometrik** özellikler: alan, atalet momentleri, burulma sabiti.
Malzeme ve donatı burada yoktur; kesit bir şekildir. Bu ayrım, aynı kesitin iki
yönetmelikte ve farklı malzemelerle kullanılabilmesini sağlar.

Only **geometric** properties. Material and reinforcement live elsewhere: a
section is a shape.

Eksen kabulü / axis convention: yerel y kuvvetli eksen (eğilme h yönünde),
yerel z zayıf eksendir.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

__all__ = ["Rectangular", "Section", "TSection"]


@runtime_checkable
class Section(Protocol):
    """Çerçeve elemanının ihtiyaç duyduğu kesit büyüklükleri, SI."""

    # Salt-okunur property olarak tanımlı: uygulamalar dondurulmuş (frozen)
    # dataclass'tır, yani alanları değiştirilemez. Protokolde düz öznitelik
    # yazmak "atanabilir" anlamına gelir ve dondurulmuş sınıflar uymaz.
    # Declared as a read-only property: implementations are frozen dataclasses,
    # and a plain attribute in a Protocol means "settable", which they are not.
    @property
    def name(self) -> str:
        """Kesit adı."""
        ...

    @property
    def area(self) -> float:
        """Kesit alanı [m²]."""
        ...

    @property
    def Iy(self) -> float:
        """Kuvvetli eksen atalet momenti [m⁴]."""
        ...

    @property
    def Iz(self) -> float:
        """Zayıf eksen atalet momenti [m⁴]."""
        ...

    @property
    def J(self) -> float:
        """Burulma sabiti [m⁴]."""
        ...

    @property
    def depth(self) -> float:
        """Toplam yükseklik [m]."""
        ...


def _rectangle_torsion_constant(long_side: float, short_side: float) -> float:
    """Dolu dikdörtgenin burulma sabiti (Saint-Venant).

    J = a·b³·[1/3 − 0.21·(b/a)·(1 − b⁴/(12·a⁴))],  a >= b

    Bu bir **seri açılımının kapalı yaklaşımıdır**, tam çözüm değildir; mühendislik
    doğruluğu için yeterlidir ve standart el kitaplarında bu hâliyle verilir.
    """
    a, b = max(long_side, short_side), min(long_side, short_side)
    return a * b**3 * (1.0 / 3.0 - 0.21 * (b / a) * (1.0 - b**4 / (12.0 * a**4)))


@dataclass(frozen=True, slots=True)
class Rectangular:
    """Dikdörtgen kesit. ``width`` yerel z, ``height`` yerel y yönündedir [m]."""

    name: str
    width: float
    height: float

    def __post_init__(self) -> None:
        if self.width <= 0.0 or self.height <= 0.0:
            raise ValueError(f"{self.name}: kesit boyutları pozitif olmalı / must be positive")

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def Iy(self) -> float:
        return self.width * self.height**3 / 12.0

    @property
    def Iz(self) -> float:
        return self.height * self.width**3 / 12.0

    @property
    def J(self) -> float:
        return _rectangle_torsion_constant(self.height, self.width)

    @property
    def depth(self) -> float:
        return self.height


@dataclass(frozen=True, slots=True)
class TSection:
    """T kesit — tablalı kiriş.

    Attributes:
        web_width: Gövde genişliği b_w [m].
        height: Toplam yükseklik h [m].
        flange_width: Tabla genişliği b_f [m].
        flange_thickness: Tabla kalınlığı h_f [m].

    Tabla gövdeye göre simetrik kabul edilir. Asimetrik tablalar ve L kesitler
    henüz desteklenmiyor — uydurulmuş bir formülle yaklaşmaktansa kapsam dışı.
    """

    name: str
    web_width: float
    height: float
    flange_width: float
    flange_thickness: float

    def __post_init__(self) -> None:
        if min(self.web_width, self.height, self.flange_width, self.flange_thickness) <= 0.0:
            raise ValueError(f"{self.name}: kesit boyutları pozitif olmalı / must be positive")
        if self.flange_thickness >= self.height:
            raise ValueError(
                f"{self.name}: tabla kalınlığı toplam yükseklikten küçük olmalı / "
                "flange must be thinner than the total depth"
            )
        if self.flange_width < self.web_width:
            raise ValueError(
                f"{self.name}: tabla gövdeden dar olamaz / flange cannot be narrower than the web"
            )

    @property
    def _web_height(self) -> float:
        return self.height - self.flange_thickness

    @property
    def area(self) -> float:
        return self.flange_width * self.flange_thickness + self.web_width * self._web_height

    @property
    def centroid_from_top(self) -> float:
        """Ağırlık merkezinin üst liften uzaklığı [m]."""
        flange_a = self.flange_width * self.flange_thickness
        web_a = self.web_width * self._web_height
        flange_moment = flange_a * self.flange_thickness / 2.0
        web_moment = web_a * (self.flange_thickness + self._web_height / 2.0)
        return (flange_moment + web_moment) / self.area

    @property
    def Iy(self) -> float:
        """Kuvvetli eksen ataleti, Steiner (paralel eksen) teoremiyle."""
        c = self.centroid_from_top
        flange_a = self.flange_width * self.flange_thickness
        web_a = self.web_width * self._web_height
        flange_i = self.flange_width * self.flange_thickness**3 / 12.0
        web_i = self.web_width * self._web_height**3 / 12.0
        flange_arm = c - self.flange_thickness / 2.0
        web_arm = (self.flange_thickness + self._web_height / 2.0) - c
        return flange_i + flange_a * flange_arm**2 + web_i + web_a * web_arm**2

    @property
    def Iz(self) -> float:
        """Zayıf eksen ataleti. Tabla gövdeye göre simetrik olduğundan Steiner terimi yok."""
        return (
            self.flange_thickness * self.flange_width**3 / 12.0
            + self._web_height * self.web_width**3 / 12.0
        )

    @property
    def J(self) -> float:
        """Açık ince cidarlı kesit yaklaşımı: dikdörtgenlerin toplamı.

        Gerçek J'den düşüktür (birleşim bölgesi katkısı ihmal edilir); güvenli
        tarafta kalır. Burulma kritik bir elemanda bu yaklaşım yetersizdir.
        """
        return _rectangle_torsion_constant(
            self.flange_width, self.flange_thickness
        ) + _rectangle_torsion_constant(self._web_height, self.web_width)

    @property
    def depth(self) -> float:
        return self.height
