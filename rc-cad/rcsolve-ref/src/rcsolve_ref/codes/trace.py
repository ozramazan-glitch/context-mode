"""L5 — Denetim izi / audit trail.

**Bu modül pazarlık konusu değildir.** Bir mühendisin imzalayacağı programda
"oran 0.87 < 1.0, UYGUN" yetmez: sayının hangi maddeden, hangi formülden, hangi
girdilerden geldiği görünmelidir. İz yapısı sonradan eklenemez — her denetimin
çağrı biçimini belirlediği için en baştan var olmalıdır (ADR-0004).

**This module is not optional.** In a program an engineer signs, "ratio 0.87 <
1.0, OK" is not enough: the clause, the formula and the inputs behind the number
must be visible. The trace structure cannot be retrofitted — it dictates how
every check is called, so it has to exist from the start.

.. warning::
   Madde **numarası** saklanır, madde **metni** asla. TS 500, TBDY ve Eurocode
   metinleri telif korumalıdır; standart metnini kod tabanına gömüp dağıtmak
   ihlaldir. ``clause`` alanı bir referanstır, alıntı değil.

   Store the clause **number**, never the clause **text**. The standards are
   copyrighted; ``clause`` is a reference, not a quotation.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .. import units as u

__all__ = ["Derivation", "Term", "TraceLog", "Verification"]


@dataclass(frozen=True, slots=True)
class Term:
    """İzlenen tek bir büyüklük / a single traced quantity.

    Attributes:
        symbol: Yönetmelikteki sembol, ör. ``"f_ck"``. Rapor bunu gösterir.
        value: SI değeri. Çekirdekte taşınan tek sayısal gerçek budur.
        unit: Raporda gösterilecek birim, ör. ``"MPa"``. Yalnızca sunum içindir.
        description: Kısa açıklama.
    """

    symbol: str
    value: float
    unit: str
    description: str = ""

    @property
    def display(self) -> float:
        """Gösterim birimindeki değer / the value in the display unit."""
        return u.from_si(self.value, self.unit)

    def __str__(self) -> str:
        return f"{self.symbol} = {self.display:.4g} {self.unit}"


@dataclass(frozen=True, slots=True)
class Derivation:
    """Türetilmiş bir değer ve nasıl elde edildiği / a derived value and its provenance.

    ``float`` yerine bunu döndürmek, rapora giden zincirin kopmamasını sağlar.
    Sıcak döngülerde ``.value`` bir kez alınıp yeniden kullanılmalıdır.
    """

    code: str
    clause: str
    result: Term
    formula: str
    inputs: tuple[Term, ...] = ()
    notes: tuple[str, ...] = ()

    @property
    def value(self) -> float:
        """SI değeri / the SI value."""
        return self.result.value

    def __float__(self) -> float:
        return self.result.value

    def __str__(self) -> str:
        return f"[{self.code} {self.clause}] {self.result}  ({self.formula})"


@dataclass(frozen=True, slots=True)
class Verification:
    """Talep/kapasite denetimi / a demand-versus-capacity check.

    Attributes:
        demand: Etki, E_d.
        capacity: Dayanım, R_d.
        limit: İzin verilen üst oran. Neredeyse daima 1.0, ama bazı maddeler
            (ör. kapasite tasarımında kolon-kiriş moment oranı) başka bir eşik
            kullanır; o yüzden sabit değil, alan.
    """

    code: str
    clause: str
    title: str
    demand: Term
    capacity: Term
    limit: float = 1.0
    derivations: tuple[Derivation, ...] = ()
    notes: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if self.demand.unit != self.capacity.unit:
            raise ValueError(
                f"{self.title}: talep ve kapasite aynı birimde raporlanmalı / "
                f"demand and capacity must report in the same unit "
                f"({self.demand.unit} vs {self.capacity.unit})"
            )

    @property
    def utilisation(self) -> float:
        """Kullanım oranı E_d/R_d. Kapasite sıfırsa sonsuz — sessiz sıfır bölme yok."""
        if self.capacity.value == 0.0:
            return 0.0 if self.demand.value == 0.0 else float("inf")
        return self.demand.value / self.capacity.value

    @property
    def passed(self) -> bool:
        return self.utilisation <= self.limit

    def __str__(self) -> str:
        mark = "UYGUN" if self.passed else "YETERSİZ"
        return (
            f"[{self.code} {self.clause}] {self.title}: "
            f"{self.demand} / {self.capacity} = {self.utilisation:.3f} "
            f"<= {self.limit:g} → {mark}"
        )


@dataclass(slots=True)
class TraceLog:
    """Bir tasarım işinin tüm izi / the complete trace of one design run.

    Rapor motoru (L8) yalnızca bunu okur ve biçimlendirir; hesap yapmaz.
    """

    derivations: list[Derivation] = field(default_factory=list)
    verifications: list[Verification] = field(default_factory=list)

    def add(self, item: Derivation | Verification) -> Derivation | Verification:
        """İzi kaydet ve aynen döndür / record and pass through."""
        if isinstance(item, Derivation):
            self.derivations.append(item)
        else:
            self.verifications.append(item)
        return item

    @property
    def governing(self) -> Verification | None:
        """En yüksek kullanım oranlı denetim / the check with the highest utilisation."""
        return max(self.verifications, key=lambda v: v.utilisation, default=None)

    @property
    def passed(self) -> bool:
        """Denetim yoksa ``False``: 'hiç kontrol etmedim' asla 'geçti' değildir.

        No checks means ``False``: "I checked nothing" is never "it passed".
        """
        return bool(self.verifications) and all(v.passed for v in self.verifications)

    @property
    def failures(self) -> tuple[Verification, ...]:
        return tuple(v for v in self.verifications if not v.passed)
