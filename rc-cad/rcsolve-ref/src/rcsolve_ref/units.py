"""L0 — Birim sistemi / Unit system.

Çekirdek kuralı: içeride **her şey SI**. Dönüşüm yalnızca giriş/çıkış sınırında.
Core rule: everything inside is **SI**. Conversion happens only at the I/O boundary.

Kanonik SI birimleri / canonical SI units::

    uzunluk / length    m
    kütle   / mass      kg
    zaman   / time      s
    açı     / angle     rad
    kuvvet  / force     N     (kg·m/s²)
    gerilme / stress    Pa    (N/m²)
    moment  / moment    N·m

Açı ayrı bir boyut olarak izlenir. SI'da radyan boyutsuzdur, ancak bir yapı
programında `rad` ile birim şekildeğiştirmenin karışması gerçek bir hata
kaynağıdır; ayrı boyut bunu yakalar.

Angle is tracked as its own dimension. Radians are dimensionless in SI, but in a
structural program confusing `rad` with strain is a real source of error; a
separate dimension catches it.

Neden `pint` değil / why not `pint`: birim nesneleri sıcak sayısal döngülerde
dizi başına maliyet getirir. Buradaki yaklaşım sınırda dönüştürür, çekirdekte
çıplak ``float``/``ndarray`` kullanır — ADR-0002.
"""

from __future__ import annotations

import re
from typing import Final, NamedTuple

__all__ = [
    "ACCELERATION",
    "ANGLE",
    "AREA",
    "CURVATURE",
    "DENSITY",
    "DIMENSIONLESS",
    "FORCE",
    "LENGTH",
    "LINE_LOAD",
    "LINE_MOMENT",
    "MASS",
    "MOMENT",
    "ROTATIONAL_STIFFNESS",
    "SECOND_MOMENT_OF_AREA",
    "SECTION_MODULUS",
    "STRESS",
    "SUBGRADE_MODULUS",
    "TIME",
    "TRANSLATIONAL_STIFFNESS",
    "UNIT_WEIGHT",
    "Dimension",
    "DimensionError",
    "UnitSyntaxError",
    "UnknownUnitError",
    "dimension_of",
    "factor_of",
    "from_si",
    "known_units",
    "require",
    "to_si",
]


class Dimension(NamedTuple):
    """Boyut üsleri / dimension exponents: length, mass, time, angle."""

    L: int = 0
    M: int = 0
    T: int = 0
    A: int = 0

    def __mul__(self, other: Dimension) -> Dimension:  # type: ignore[override]
        return Dimension(self.L + other.L, self.M + other.M, self.T + other.T, self.A + other.A)

    def __truediv__(self, other: Dimension) -> Dimension:
        return Dimension(self.L - other.L, self.M - other.M, self.T - other.T, self.A - other.A)

    def __pow__(self, n: int) -> Dimension:
        return Dimension(self.L * n, self.M * n, self.T * n, self.A * n)

    def __str__(self) -> str:
        parts = [f"{sym}^{exp}" for sym, exp in zip("LMTA", self, strict=True) if exp]
        return "·".join(parts) if parts else "1"


# --- Adlandırılmış boyutlar / named dimensions ------------------------------

DIMENSIONLESS: Final = Dimension()
LENGTH: Final = Dimension(L=1)
AREA: Final = Dimension(L=2)
VOLUME: Final = Dimension(L=3)
SECTION_MODULUS: Final = Dimension(L=3)
SECOND_MOMENT_OF_AREA: Final = Dimension(L=4)
MASS: Final = Dimension(M=1)
TIME: Final = Dimension(T=1)
ANGLE: Final = Dimension(A=1)
ACCELERATION: Final = Dimension(L=1, T=-2)
FORCE: Final = Dimension(L=1, M=1, T=-2)
MOMENT: Final = Dimension(L=2, M=1, T=-2)
LINE_LOAD: Final = Dimension(M=1, T=-2)  # N/m
LINE_MOMENT: Final = Dimension(L=1, M=1, T=-2)  # N·m/m — FORCE ile aynı boyut
STRESS: Final = Dimension(L=-1, M=1, T=-2)  # Pa
DENSITY: Final = Dimension(L=-3, M=1)
UNIT_WEIGHT: Final = Dimension(L=-2, M=1, T=-2)  # N/m³
CURVATURE: Final = Dimension(L=-1)
TRANSLATIONAL_STIFFNESS: Final = Dimension(M=1, T=-2)  # N/m
ROTATIONAL_STIFFNESS: Final = Dimension(L=2, M=1, T=-2, A=-1)  # N·m/rad
SUBGRADE_MODULUS: Final = Dimension(L=-2, M=1, T=-2)  # N/m³ — zemin yatak katsayısı


class UnitSyntaxError(ValueError):
    """Birim dizgesi ayrıştırılamadı / unit string could not be parsed."""


class UnknownUnitError(ValueError):
    """Birim kayıtlı değil / unit is not in the registry."""


class DimensionError(TypeError):
    """Boyut uyuşmazlığı / dimension mismatch."""


# --- Kayıt / registry -------------------------------------------------------
#
# Ön ek (prefix) mantığı bilinçli olarak YOK. Her birim açıkça listelenir.
# Sebep: bir yapı programında "mN" (milinewton) yazan birinin "MN" (meganewton)
# demek istemiş olma ihtimali, gerçekten milinewton demek istemesinden yüksektir.
# Sessizce 10⁹ kat hata yapmaktansa bilinmeyen birim hatası vermek yeğdir.
#
# No prefix logic, deliberately. Every unit is listed explicitly: in a structural
# program, someone typing "mN" more likely meant "MN" than millinewtons. Better an
# unknown-unit error than a silent factor of 10⁹.

_G: Final = 9.80665  # standart yerçekimi ivmesi / standard gravity, m/s²

_REGISTRY: Final[dict[str, tuple[Dimension, float]]] = {
    # boyutsuz / dimensionless
    "1": (DIMENSIONLESS, 1.0),
    "-": (DIMENSIONLESS, 1.0),
    "%": (DIMENSIONLESS, 0.01),
    # uzunluk / length
    "m": (LENGTH, 1.0),
    "mm": (LENGTH, 1e-3),
    "cm": (LENGTH, 1e-2),
    "dm": (LENGTH, 1e-1),
    "km": (LENGTH, 1e3),
    # kütle / mass
    "kg": (MASS, 1.0),
    "g": (MASS, 1e-3),
    "t": (MASS, 1e3),
    # zaman / time
    "s": (TIME, 1.0),
    "ms": (TIME, 1e-3),
    "min": (TIME, 60.0),
    "h": (TIME, 3600.0),
    # açı / angle
    "rad": (ANGLE, 1.0),
    "mrad": (ANGLE, 1e-3),
    "deg": (ANGLE, 3.141592653589793 / 180.0),
    # kuvvet / force
    "N": (FORCE, 1.0),
    "kN": (FORCE, 1e3),
    "MN": (FORCE, 1e6),
    # Türkiye pratiğinde hâlâ yaygın / still common in Turkish practice
    "kgf": (FORCE, _G),
    "tf": (FORCE, 1e3 * _G),
    # gerilme / stress
    "Pa": (STRESS, 1.0),
    "kPa": (STRESS, 1e3),
    "MPa": (STRESS, 1e6),
    "GPa": (STRESS, 1e9),
    "bar": (STRESS, 1e5),
}

_TOKEN_RE: Final = re.compile(r"^([A-Za-z%]+)(-?\d+)?$")
# Tek başına birim adı olan, harf içermeyen terimler / bare non-alphabetic unit names.
_BARE_NAMES: Final = frozenset({"1", "-"})


def known_units() -> tuple[str, ...]:
    """Kayıtlı taban birimler / registered base units."""
    return tuple(sorted(_REGISTRY))


def _parse(unit: str) -> tuple[Dimension, float]:
    """``"kN/m2"`` → (boyut, SI'ya çarpan) / (dimension, factor to SI)."""
    if not isinstance(unit, str):
        raise UnitSyntaxError(f"birim bir dizge olmalı / unit must be a string: {unit!r}")

    text = unit.strip().replace("·", "*").replace("^", "")
    # Operatör çevresindeki boşluk anlamsız; kalan boşluk ise çarpmadır:
    # "N m" = N·m, mühendislik notasyonunun olağan okunuşu.
    # Whitespace around an operator is noise; remaining whitespace means
    # multiplication: "N m" is N·m, the usual engineering reading.
    text = re.sub(r"\s*([*/])\s*", r"\1", text)
    text = re.sub(r"\s+", "*", text)
    if not text:
        raise UnitSyntaxError("birim dizgesi boş / empty unit string")

    dim = DIMENSIONLESS
    factor = 1.0
    sign = 1
    token = ""
    # Bölme işareti YALNIZCA kendisinden sonraki tek terime uygulanır:
    # "kg/m/s" = kg·m⁻¹·s⁻¹, matematiksel soldan-sağa okuma ile tutarlı.
    # A slash applies to the single following term only, matching the usual
    # left-to-right reading: "kg/m/s" is kg·m⁻¹·s⁻¹.
    for char in text + "*":
        if char in "*/":
            if not token:
                raise UnitSyntaxError(f"'{unit}' içinde boş terim / empty term in '{unit}'")
            sub_dim, sub_factor = _parse_token(token, unit)
            dim = dim * (sub_dim**sign) if sign > 0 else dim / sub_dim
            factor = factor * sub_factor if sign > 0 else factor / sub_factor
            token = ""
            sign = -1 if char == "/" else 1
        else:
            token += char
    return dim, factor


def _parse_token(token: str, whole: str) -> tuple[Dimension, float]:
    if token in _BARE_NAMES:
        return _REGISTRY[token]
    match = _TOKEN_RE.match(token)
    if match is None:
        raise UnitSyntaxError(f"'{whole}' içinde çözümlenemeyen terim / bad term {token!r}")
    name, exponent_text = match.group(1), match.group(2)
    if name not in _REGISTRY:
        raise UnknownUnitError(
            f"bilinmeyen birim / unknown unit {name!r} (in {whole!r}); "
            f"kayıtlı / registered: {', '.join(known_units())}"
        )
    base_dim, base_factor = _REGISTRY[name]
    exponent = int(exponent_text) if exponent_text else 1
    return base_dim**exponent, base_factor**exponent


def dimension_of(unit: str) -> Dimension:
    """Birimin boyutu / the dimension of a unit string."""
    return _parse(unit)[0]


def factor_of(unit: str) -> float:
    """1 birimin SI karşılığı / the SI value of one of this unit."""
    return _parse(unit)[1]


def require(unit: str, expected: Dimension, *, what: str = "value") -> float:
    """Boyutu doğrula, SI çarpanını döndür / validate the dimension, return the SI factor.

    Sınırdaki her okumanın geçmesi gereken kapı budur.
    This is the gate every boundary read must pass.
    """
    dim, factor = _parse(unit)
    if dim != expected:
        raise DimensionError(
            f"{what}: {unit!r} boyutu {dim}, beklenen {expected} / "
            f"has dimension {dim}, expected {expected}"
        )
    return factor


def to_si(
    value: float, unit: str, expected: Dimension | None = None, *, what: str = "value"
) -> float:
    """Giriş sınırı: verilen birimden SI'ya / input boundary: given unit to SI."""
    factor = require(unit, expected, what=what) if expected is not None else factor_of(unit)
    return value * factor


def from_si(
    value_si: float, unit: str, expected: Dimension | None = None, *, what: str = "value"
) -> float:
    """Çıkış sınırı: SI'dan verilen birime / output boundary: SI to the given unit."""
    factor = require(unit, expected, what=what) if expected is not None else factor_of(unit)
    return value_si / factor
