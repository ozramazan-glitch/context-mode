"""TS 500:2000 malzeme modeli / material model.

Formüller yön göstericidir ve **resmî TS 500 metninden teyit edilmelidir**.
Madde numaraları kasten boş bırakıldı: ezberden madde numarası yazmak bu işte
kabul edilemez. Teyit edildikçe ``_CLAUSE_*`` sabitleri doldurulur.

Formulas are indicative and **must be verified against the official text**.
Clause numbers are deliberately left as placeholders rather than guessed.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from ..model.materials import Concrete, ReinforcementSteel
from .protocols import StressBlock
from .trace import Derivation, Term

__all__ = ["TS500Materials"]

_MPa = 1.0e6
_TBC = "(madde teyit edilecek / clause TBC)"


@dataclass(frozen=True, slots=True)
class TS500Materials:
    """TS 500 malzeme modeli. Malzeme katsayıları yönetmelikte sabittir."""

    gamma_c: float = 1.5
    gamma_s: float = 1.15
    code_name: str = "TS 500:2000"

    def fcd(self, c: Concrete, /) -> Derivation:
        value = c.fck / self.gamma_c
        return Derivation(
            self.code_name,
            _TBC,
            Term("f_cd", value, "MPa", "beton tasarım basınç dayanımı"),
            "f_cd = f_ck / gamma_mc",
            (
                Term("f_ck", c.fck, "MPa", f"{c.name} karakteristik silindir dayanımı"),
                Term("gamma_mc", self.gamma_c, "-", "beton malzeme katsayısı"),
            ),
        )

    def fctk(self, c: Concrete, /) -> Derivation:
        value = 0.35 * math.sqrt(c.fck / _MPa) * _MPa
        return Derivation(
            self.code_name,
            _TBC,
            Term("f_ctk", value, "MPa", "karakteristik eksenel çekme dayanımı"),
            "f_ctk = 0.35 * sqrt(f_ck)   [MPa]",
            (Term("f_ck", c.fck, "MPa"),),
            notes=("Formül MPa cinsinden tanımlıdır; SI'ya dönüşüm içeride yapılır.",),
        )

    def fctd(self, c: Concrete, /) -> Derivation:
        fctk = self.fctk(c)
        value = fctk.value / self.gamma_c
        return Derivation(
            self.code_name,
            _TBC,
            Term("f_ctd", value, "MPa", "tasarım eksenel çekme dayanımı"),
            "f_ctd = f_ctk / gamma_mc",
            (fctk.result, Term("gamma_mc", self.gamma_c, "-")),
        )

    def Ec(self, c: Concrete, /) -> Derivation:
        value = (3250.0 * math.sqrt(c.fck / _MPa) + 14000.0) * _MPa
        return Derivation(
            self.code_name,
            _TBC,
            Term("E_c", value, "GPa", "beton elastisite modülü"),
            "E_c = 3250 * sqrt(f_ck) + 14000   [MPa]",
            (Term("f_ck", c.fck, "MPa"),),
        )

    def fyd(self, s: ReinforcementSteel, /) -> Derivation:
        value = s.fyk / self.gamma_s
        return Derivation(
            self.code_name,
            _TBC,
            Term("f_yd", value, "MPa", "donatı tasarım akma dayanımı"),
            "f_yd = f_yk / gamma_ms",
            (
                Term("f_yk", s.fyk, "MPa", f"{s.name} karakteristik akma dayanımı"),
                Term("gamma_ms", self.gamma_s, "-", "çelik malzeme katsayısı"),
            ),
        )

    def eps_cu(self, c: Concrete, /) -> float:
        return 0.003

    def stress_block(self, c: Concrete, /) -> StressBlock:
        """Eşdeğer dikdörtgen blok: 0.85*f_cd yoğunluk, k1*c derinlik.

        k1 = 0.85, f_ck > 25 MPa için her MPa'da 0.006 azalır, alt sınır 0.70.
        """
        fck_mpa = c.fck / _MPa
        k1 = 0.85 if fck_mpa <= 25.0 else max(0.70, 0.85 - 0.006 * (fck_mpa - 25.0))
        return StressBlock(eta=0.85, lambda_=k1)
