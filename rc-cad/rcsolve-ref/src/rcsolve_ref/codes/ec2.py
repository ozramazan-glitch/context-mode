"""EN 1992-1-1 (Eurocode 2) malzeme modeli / material model.

**Eurocode tek bir yönetmelik değildir.** Malzeme katsayıları ve ``alpha_cc``
gibi büyüklükler Ulusal Ek (National Annex, NA) ile belirlenir; ülkeden ülkeye
değişir. Bu yüzden kural mantığı (bu dosya) ile ülke parametreleri
(:class:`NationalAnnex`) ayrılmıştır. NDP'leri koda gömmek, her yeni ülkeyi bir
kod değişikliği yapardı; veri olarak tutmak bir dosya yapar.

**Eurocode is not a single code.** Nationally Determined Parameters (NDPs) vary
by country, so rule logic lives here and country parameters live in a data
object. Only the EN recommended set is shipped: a real National Annex must be
transcribed from its own official document, not guessed.

Formüller ve madde numaraları resmî metinden teyit edilmelidir.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from ..model.materials import Concrete, ReinforcementSteel
from .protocols import StressBlock
from .trace import Derivation, Term

__all__ = ["EN_RECOMMENDED", "EC2Materials", "NationalAnnex"]

_MPa = 1.0e6
_TBC = "(madde teyit edilecek / clause TBC)"


@dataclass(frozen=True, slots=True)
class NationalAnnex:
    """Ulusal Ek parametreleri / Nationally Determined Parameters.

    Buradaki her alan bir ülkenin kendi Ulusal Ek belgesinde değiştirebileceği
    bir büyüklüktür. Yeni bir ülke eklemek, o ülkenin resmî NA belgesinden
    değerleri aktarmaktır — tahmin etmek değil.
    """

    country: str
    alpha_cc: float
    alpha_ct: float
    gamma_c: float
    gamma_s: float


#: EN 1992-1-1'in kendi tavsiye ettiği değerler. Birçok ülke ``alpha_cc`` için
#: 0.85 kullanır; hangi ülkenin ne kullandığı o ülkenin NA belgesinden alınmalı,
#: buradan varsayılmamalıdır.
EN_RECOMMENDED: Final = NationalAnnex(
    country="EN recommended", alpha_cc=1.0, alpha_ct=1.0, gamma_c=1.5, gamma_s=1.15
)


@dataclass(frozen=True, slots=True)
class EC2Materials:
    """EC2 malzeme modeli. Ulusal Ek parametreleri dışarıdan verilir."""

    na: NationalAnnex = EN_RECOMMENDED
    code_name: str = "EN 1992-1-1"

    @property
    def _ref(self) -> str:
        return f"{self.code_name} [NA: {self.na.country}]"

    def fcd(self, c: Concrete, /) -> Derivation:
        value = self.na.alpha_cc * c.fck / self.na.gamma_c
        return Derivation(
            self._ref,
            _TBC,
            Term("f_cd", value, "MPa", "design compressive strength"),
            "f_cd = alpha_cc * f_ck / gamma_C",
            (
                Term("f_ck", c.fck, "MPa", f"{c.name} characteristic cylinder strength"),
                Term("alpha_cc", self.na.alpha_cc, "-", "NDP — long-term/loading effects"),
                Term("gamma_C", self.na.gamma_c, "-", "NDP — partial factor for concrete"),
            ),
        )

    def fctm(self, c: Concrete, /) -> Derivation:
        """Ortalama eksenel çekme dayanımı; <= C50/60 için geçerli."""
        fck_mpa = c.fck / _MPa
        if fck_mpa > 50.0:
            raise NotImplementedError(
                "f_ctm formülü C50/60 üzeri için farklıdır; yüksek dayanımlı beton "
                "henüz desteklenmiyor / the formula differs above C50/60"
            )
        value = 0.30 * fck_mpa ** (2.0 / 3.0) * _MPa
        return Derivation(
            self._ref,
            _TBC,
            Term("f_ctm", value, "MPa", "mean axial tensile strength"),
            "f_ctm = 0.30 * f_ck^(2/3)   [MPa],  f_ck <= 50 MPa",
            (Term("f_ck", c.fck, "MPa"),),
        )

    def fctk(self, c: Concrete, /) -> Derivation:
        """5% fraktil karakteristik çekme dayanımı, f_ctk,0.05."""
        fctm = self.fctm(c)
        value = 0.7 * fctm.value
        return Derivation(
            self._ref,
            _TBC,
            Term("f_ctk_0.05", value, "MPa", "characteristic tensile strength, 5% fractile"),
            "f_ctk,0.05 = 0.7 * f_ctm",
            (fctm.result,),
        )

    def fctd(self, c: Concrete, /) -> Derivation:
        fctk = self.fctk(c)
        value = self.na.alpha_ct * fctk.value / self.na.gamma_c
        return Derivation(
            self._ref,
            _TBC,
            Term("f_ctd", value, "MPa", "design tensile strength"),
            "f_ctd = alpha_ct * f_ctk,0.05 / gamma_C",
            (
                fctk.result,
                Term("alpha_ct", self.na.alpha_ct, "-", "NDP"),
                Term("gamma_C", self.na.gamma_c, "-", "NDP"),
            ),
        )

    def Ec(self, c: Concrete, /) -> Derivation:
        """Sekant elastisite modülü E_cm."""
        value = 22.0 * (c.fcm / _MPa / 10.0) ** 0.3 * 1.0e9
        return Derivation(
            self._ref,
            _TBC,
            Term("E_cm", value, "GPa", "secant modulus of elasticity"),
            "E_cm = 22 * (f_cm/10)^0.3   [GPa]",
            (
                Term("f_cm", c.fcm, "MPa", "mean compressive strength = f_ck + 8 MPa"),
            ),
        )

    def fyd(self, s: ReinforcementSteel, /) -> Derivation:
        value = s.fyk / self.na.gamma_s
        return Derivation(
            self._ref,
            _TBC,
            Term("f_yd", value, "MPa", "design yield strength of reinforcement"),
            "f_yd = f_yk / gamma_S",
            (
                Term("f_yk", s.fyk, "MPa", f"{s.name} characteristic yield strength"),
                Term("gamma_S", self.na.gamma_s, "-", "NDP — partial factor for steel"),
            ),
        )

    def eps_cu(self, c: Concrete, /) -> float:
        """eps_cu3, bilineer/dikdörtgen blok için; <= C50/60 sabit 0.0035."""
        if c.fck / _MPa > 50.0:
            raise NotImplementedError("eps_cu3 C50/60 üzeri için f_ck'ya bağlıdır")
        return 0.0035

    def stress_block(self, c: Concrete, /) -> StressBlock:
        """<= C50/60 için lambda = 0.8, eta = 1.0."""
        if c.fck / _MPa > 50.0:
            raise NotImplementedError("lambda ve eta C50/60 üzeri için f_ck'ya bağlıdır")
        return StressBlock(eta=1.0, lambda_=0.8)
