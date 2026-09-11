"""Doğrulama katmanı 1 — kapalı-form çözümler / closed-form reference solutions.

Bunlar çözücünün karşısına konacak **analitik gerçeklerdir**. Elastik kiriş
teorisinden gelirler, yaklaşık değildirler, ve çözücü bunlara 1e-9 mertebesinde
uymak zorundadır. Bir sonlu eleman uygulamasının bu problemleri geçememesi,
uygulamanın kullanılamaz olduğu anlamına gelir.

These are the **analytical truths** the solver is measured against. They come
from elastic beam theory, they are not approximations, and the solver must match
them to about 1e-9. A finite element implementation that cannot reproduce them
is unusable.

Tüm büyüklükler SI'dır (m, N, Pa). İşaret kabulü: yerdeğiştirme yük yönünde
pozitif, moment büyüklük olarak verilir.

Varsayımlar / assumptions:
  * Euler-Bernoulli kirişi — kayma şekildeğiştirmesi ihmal edilmiştir.
    Narin olmayan elemanlarda (L/h < 10) gerçek davranıştan sapar; Timoshenko
    kıyasları ayrıca eklenecektir (Faz 2).
  * Doğrusal elastik malzeme, küçük yerdeğiştirme.
  * Sabit kesit boyunca EI.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

__all__ = [
    "BeamResult",
    "axial_bar",
    "cantilever_point_load",
    "cantilever_udl",
    "fixed_fixed_udl",
    "propped_cantilever_udl",
    "rigid_beam_portal_sway",
    "sdof_period",
    "simply_supported_point_load_midspan",
    "simply_supported_udl",
    "torsion_bar",
]


@dataclass(frozen=True, slots=True)
class BeamResult:
    """Kapalı-form kiriş sonucu, SI.

    Attributes:
        deflection: İlgilenilen noktadaki düşey yerdeğiştirme büyüklüğü [m].
        rotation: İlgilenilen noktadaki dönme büyüklüğü [rad].
        moment_max: Maksimum eğilme momenti büyüklüğü [N·m].
        reaction_left: Sol mesnet düşey tepkisi [N].
        reaction_right: Sağ mesnet düşey tepkisi [N].
        moment_left: Sol mesnet ankastrelik momenti büyüklüğü [N·m].
        moment_right: Sağ mesnet ankastrelik momenti büyüklüğü [N·m].
    """

    deflection: float
    rotation: float
    moment_max: float
    reaction_left: float
    reaction_right: float
    moment_left: float = 0.0
    moment_right: float = 0.0

    @property
    def total_reaction(self) -> float:
        return self.reaction_left + self.reaction_right


def _check(length: float, EI: float) -> None:
    if length <= 0.0:
        raise ValueError("açıklık pozitif olmalı / span must be positive")
    if EI <= 0.0:
        raise ValueError("EI pozitif olmalı / flexural stiffness must be positive")


def cantilever_point_load(P: float, L: float, EI: float) -> BeamResult:
    """Ankastre konsol, uçta tekil yük P.

    delta = P·L³/(3·EI),  theta = P·L²/(2·EI),  M_ankastre = P·L
    """
    _check(L, EI)
    return BeamResult(
        deflection=P * L**3 / (3.0 * EI),
        rotation=P * L**2 / (2.0 * EI),
        moment_max=abs(P * L),
        reaction_left=P,
        reaction_right=0.0,
        moment_left=abs(P * L),
    )


def cantilever_udl(w: float, L: float, EI: float) -> BeamResult:
    """Ankastre konsol, düzgün yayılı yük w.

    delta = w·L⁴/(8·EI),  theta = w·L³/(6·EI),  M_ankastre = w·L²/2
    """
    _check(L, EI)
    return BeamResult(
        deflection=w * L**4 / (8.0 * EI),
        rotation=w * L**3 / (6.0 * EI),
        moment_max=abs(w * L**2 / 2.0),
        reaction_left=w * L,
        reaction_right=0.0,
        moment_left=abs(w * L**2 / 2.0),
    )


def simply_supported_point_load_midspan(P: float, L: float, EI: float) -> BeamResult:
    """Basit mesnetli kiriş, açıklık ortasında tekil yük P.

    delta_orta = P·L³/(48·EI),  M_orta = P·L/4,  R = P/2
    """
    _check(L, EI)
    return BeamResult(
        deflection=P * L**3 / (48.0 * EI),
        rotation=P * L**2 / (16.0 * EI),  # mesnetteki dönme
        moment_max=abs(P * L / 4.0),
        reaction_left=P / 2.0,
        reaction_right=P / 2.0,
    )


def simply_supported_udl(w: float, L: float, EI: float) -> BeamResult:
    """Basit mesnetli kiriş, düzgün yayılı yük w.

    delta_orta = 5·w·L⁴/(384·EI),  M_orta = w·L²/8,  R = w·L/2
    """
    _check(L, EI)
    return BeamResult(
        deflection=5.0 * w * L**4 / (384.0 * EI),
        rotation=w * L**3 / (24.0 * EI),  # mesnetteki dönme
        moment_max=abs(w * L**2 / 8.0),
        reaction_left=w * L / 2.0,
        reaction_right=w * L / 2.0,
    )


def propped_cantilever_udl(w: float, L: float, EI: float) -> BeamResult:
    """Bir ucu ankastre bir ucu sabit mesnetli kiriş, düzgün yayılı yük w.

    M_ankastre = w·L²/8,  R_ankastre = 5·w·L/8,  R_mesnet = 3·w·L/8
    delta_max = w·L⁴/(185·EI), x = 0.5785·L civarında.

    Hiperstatik bir sistem: çözücünün yalnızca denge değil, uygunluk
    (compatibility) denklemlerini de doğru kurduğunu sınar.
    """
    _check(L, EI)
    return BeamResult(
        deflection=w * L**4 / (185.0 * EI),
        rotation=0.0,  # ankastre uçta
        moment_max=abs(w * L**2 / 8.0),
        reaction_left=5.0 * w * L / 8.0,
        reaction_right=3.0 * w * L / 8.0,
        moment_left=abs(w * L**2 / 8.0),
    )


def fixed_fixed_udl(w: float, L: float, EI: float) -> BeamResult:
    """İki ucu ankastre kiriş, düzgün yayılı yük w.

    M_uc = w·L²/12,  M_orta = w·L²/24,  delta_orta = w·L⁴/(384·EI)
    """
    _check(L, EI)
    end_moment = abs(w * L**2 / 12.0)
    return BeamResult(
        deflection=w * L**4 / (384.0 * EI),
        rotation=0.0,
        moment_max=end_moment,
        reaction_left=w * L / 2.0,
        reaction_right=w * L / 2.0,
        moment_left=end_moment,
        moment_right=end_moment,
    )


def axial_bar(N: float, L: float, EA: float) -> float:
    """Eksenel yüklü çubuğun uzaması [m]: delta = N·L/(E·A)."""
    if L <= 0.0 or EA <= 0.0:
        raise ValueError("L ve EA pozitif olmalı / L and EA must be positive")
    return N * L / EA


def torsion_bar(T: float, L: float, GJ: float) -> float:
    """Burulma yüklü çubuğun dönmesi [rad]: phi = T·L/(G·J)."""
    if L <= 0.0 or GJ <= 0.0:
        raise ValueError("L ve GJ pozitif olmalı / L and GJ must be positive")
    return T * L / GJ


def rigid_beam_portal_sway(H: float, height: float, EI_column: float) -> tuple[float, float]:
    """Rijit kirişli tek katlı tek açıklıklı çerçeve, ankastre kolon tabanları.

    Kiriş sonsuz rijit varsayıldığından kolon üstleri dönemez; her kolon
    ötelenmeli ankastre-ankastre davranır::

        Delta = H·h³/(24·EI),   M_kolon = H·h/4  (üstte ve tabanda)

    Bu kıyas, kiriş formüllerinin sınamadığı üç şeyi sınar: yanal ötelenme,
    eleman rijitliklerinin paralel toplanması ve dönme kısıtı.

    Returns:
        ``(yatay ötelenme [m], kolon uç momenti büyüklüğü [N·m])``
    """
    if height <= 0.0 or EI_column <= 0.0:
        raise ValueError("yükseklik ve EI pozitif olmalı / height and EI must be positive")
    sway = H * height**3 / (24.0 * EI_column)
    column_moment = abs(H * height / 4.0)
    return sway, column_moment


def sdof_period(mass: float, stiffness: float) -> float:
    """Tek serbestlik dereceli sistemin doğal periyodu [s]: T = 2·pi·sqrt(m/k).

    Modal çözücünün ilk sınavı budur; geçemiyorsa özdeğer kurulumu yanlıştır.
    """
    if mass <= 0.0 or stiffness <= 0.0:
        raise ValueError("kütle ve rijitlik pozitif olmalı / mass and stiffness must be positive")
    return 2.0 * math.pi * math.sqrt(mass / stiffness)
