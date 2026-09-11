"""L2 — Malzeme tanımları / material definitions.

**Tasarım kararı.** Malzeme yalnızca **karakteristik** ve deneysel büyüklükleri
taşır: fck, fyk, birim hacim ağırlık. Tasarım dayanımları (fcd, fyd), çekme
dayanımı ve elastisite modülü **burada durmaz** — çünkü bunların her biri
yönetmeliğe göre farklı formülle türetilir::

    çekme dayanımı / tensile strength
        TS 500   fctk = 0.35·√fck
        EC2      fctm = 0.30·fck^(2/3)  →  fctk,0.05 = 0.7·fctm

    elastisite modülü / modulus of elasticity
        TS 500   Ec = 3250·√fck + 14000
        EC2      Ecm = 22·((fck+8)/10)^0.3  [GPa]

Aynı C30/37 betonu iki yönetmelikte farklı Ec verir. Bu değerleri malzemeye
gömmek, L4 çözücüsüne yönetmelik sızdırmaktır — mimarinin en sıkı korunan
sınırı budur (ADR-0003). Türetilmiş değerler ``codes`` sağlayıcılarından gelir.

**Design decision.** A material carries only **characteristic** and measured
quantities. Derived values (design strengths, tensile strength, modulus) are
computed differently by each code, so they come from a code provider, never from
the material itself. Embedding them here would leak code-specific logic into the
solver layer.

Formüller yön göstericidir ve resmî yönetmelik metninden teyit edilmelidir.
Formulas are indicative and must be verified against the official code text.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from .. import units as u

__all__ = [
    "CONCRETE_GRADES",
    "STEEL_GRADES",
    "Concrete",
    "ReinforcementSteel",
    "concrete",
    "steel",
]


@dataclass(frozen=True, slots=True)
class Concrete:
    """Beton sınıfı — karakteristik büyüklükler, SI (Pa, N/m³).

    Attributes:
        name: Sınıf adı, ör. ``"C30/37"``.
        fck: Karakteristik silindir basınç dayanımı [Pa].
        fck_cube: Karakteristik küp basınç dayanımı [Pa]. Sınıf adının ikinci
            sayısı; dayanım hesabında kullanılmaz, izlenebilirlik içindir.
        unit_weight: Betonarme birim hacim ağırlığı [N/m³]. Donatı dahil 25
            kN/m³ hem TS 500 hem EC pratiğinde olağan değerdir.
    """

    name: str
    fck: float
    fck_cube: float
    unit_weight: float = 25.0e3

    def __post_init__(self) -> None:
        if self.fck <= 0.0:
            raise ValueError(f"{self.name}: fck pozitif olmalı / must be positive")
        if self.fck_cube < self.fck:
            raise ValueError(
                f"{self.name}: küp dayanımı silindir dayanımından küçük olamaz / "
                "cube strength cannot be below cylinder strength"
            )

    @property
    def fcm(self) -> float:
        """Ortalama basınç dayanımı [Pa]. EC2: fcm = fck + 8 MPa."""
        return self.fck + 8.0e6


@dataclass(frozen=True, slots=True)
class ReinforcementSteel:
    """Donatı çeliği — karakteristik büyüklükler, SI (Pa).

    Attributes:
        name: Sınıf adı, ör. ``"B420C"``.
        fyk: Karakteristik akma dayanımı [Pa].
        ftk: Karakteristik kopma dayanımı [Pa].
        Es: Elastisite modülü [Pa]. TS 500 ve EC2 aynı değeri kullanır (200 GPa),
            bu yüzden türetilmiş değil, ölçülmüş bir sabit olarak burada durur.
        eps_uk: Karakteristik maksimum uzama [-].
        ribbed: Nervürlü mü? Kenetlenme boyu hesabını doğrudan etkiler.
    """

    name: str
    fyk: float
    ftk: float
    Es: float = 200.0e9
    eps_uk: float = 0.05
    ribbed: bool = True

    def __post_init__(self) -> None:
        if self.fyk <= 0.0:
            raise ValueError(f"{self.name}: fyk pozitif olmalı / must be positive")
        if self.ftk < self.fyk:
            raise ValueError(
                f"{self.name}: kopma dayanımı akma dayanımından küçük olamaz / "
                "ultimate strength cannot be below yield strength"
            )

    @property
    def eps_y(self) -> float:
        """Karakteristik akma şekildeğiştirmesi [-] (tasarım değeri değil)."""
        return self.fyk / self.Es


def _mpa(value: float) -> float:
    return u.to_si(value, "MPa", u.STRESS)


#: Beton sınıfları. C##/## gösterimi TS 500 ve EN 206'da ortaktır; ilk sayı
#: karakteristik silindir, ikincisi küp dayanımıdır [MPa].
#: TBDY 2018 betonarme binalarda asgari C25 şartı koyar (resmî metinden teyit edin).
CONCRETE_GRADES: Final[dict[str, Concrete]] = {
    name: Concrete(name, _mpa(cyl), _mpa(cube))
    for name, cyl, cube in [
        ("C16/20", 16.0, 20.0),
        ("C20/25", 20.0, 25.0),
        ("C25/30", 25.0, 30.0),
        ("C30/37", 30.0, 37.0),
        ("C35/45", 35.0, 45.0),
        ("C40/50", 40.0, 50.0),
        ("C45/55", 45.0, 55.0),
        ("C50/60", 50.0, 60.0),
    ]
}

#: Donatı çelikleri. S220 düz, B420C ve B500C nervürlüdür.
#: TBDY 2018 süneklik gereği nervürlü ve süneklik sınıfı belirtilmiş çelik ister.
STEEL_GRADES: Final[dict[str, ReinforcementSteel]] = {
    "S220": ReinforcementSteel("S220", _mpa(220.0), _mpa(340.0), ribbed=False, eps_uk=0.18),
    "B420C": ReinforcementSteel("B420C", _mpa(420.0), _mpa(500.0), eps_uk=0.075),
    "B500C": ReinforcementSteel("B500C", _mpa(500.0), _mpa(575.0), eps_uk=0.075),
}


def concrete(name: str) -> Concrete:
    """Beton sınıfını adıyla getir / look up a concrete grade by name."""
    try:
        return CONCRETE_GRADES[name]
    except KeyError:
        raise KeyError(
            f"bilinmeyen beton sınıfı / unknown concrete grade {name!r}; "
            f"tanımlı / defined: {', '.join(CONCRETE_GRADES)}"
        ) from None


def steel(name: str) -> ReinforcementSteel:
    """Donatı çeliğini adıyla getir / look up a reinforcement grade by name."""
    try:
        return STEEL_GRADES[name]
    except KeyError:
        raise KeyError(
            f"bilinmeyen çelik sınıfı / unknown steel grade {name!r}; "
            f"tanımlı / defined: {', '.join(STEEL_GRADES)}"
        ) from None
