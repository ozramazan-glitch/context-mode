"""L5 — Yönetmelik sağlayıcı arayüzleri / design-code provider interfaces.

Mimarinin taşıyıcı duvarı. L4 çözücüsü ham iç kuvvet üretir ve **hiçbir
yönetmelik bilmez**; yönetmeliğe bağımlı her şey bu arayüzlerin arkasındadır.
Bu sınır delinirse çok-yönetmelikli mimari çöker ve ikinci yönetmelik ikinci bir
ürün hâline gelir (ADR-0003).

The load-bearing wall of the architecture. The solver produces raw internal
forces and knows **nothing** about design codes; everything code-dependent sits
behind these interfaces. Breach that boundary and the second code stops being a
provider and becomes a second product.

**Soyutlamanın sızdığı yerler.** Her şey ortak arayüze zorlanmaz. Düzensizlik
denetimleri (TBDY A1-A3/B1-B3 ile EC8 düzenlilik kriterleri), hesap yöntemi
seçimi (BYS+DTS ile EC8 düzenlilik+periyot) ve performans değerlendirmesi
kavramsal olarak farklıdır; bunlar için yönetmeliğe özel işlem hattı kurulur.
Şekli uyuşan yerde arayüz, uyuşmayan yerde ayrı hat — genel bir "tanrı arayüzü"
bakımı imkânsız kod üretir.

**Where the abstraction leaks.** Irregularity criteria, analysis-method
selection and performance assessment are conceptually different between the two
codes and get code-specific pipelines instead of a shared interface. Interface
where the shape matches; separate paths where it does not.
"""

from __future__ import annotations

from typing import NamedTuple, Protocol, runtime_checkable

from ..model.materials import Concrete, ReinforcementSteel
from .trace import Derivation

__all__ = ["DuctilityRules", "LoadCombinator", "MaterialModel", "SectionDesigner", "StressBlock"]


class StressBlock(NamedTuple):
    """Eşdeğer dikdörtgen basınç bloğu / equivalent rectangular compression block.

    Basınç gerilmesi ``eta * f_cd``, blok derinliği ``lambda_ * x`` (x: tarafsız
    eksen derinliği). Her iki yönetmelik de bu forma indirgenebilir, bu yüzden
    ortak gösterim mümkündür — ama katsayılar farklıdır.

    .. note::
       ``f_cd`` tek başına kapasiteyi belirlemez. TS 500 ve EC2 farklı
       ``eta``/``lambda_`` kullanır; iki yönetmeliğin ``f_cd`` değerlerini
       doğrudan kıyaslamak yanıltıcıdır.
    """

    eta: float
    lambda_: float


@runtime_checkable
class MaterialModel(Protocol):
    """Karakteristik malzemeden tasarım büyüklüklerini türetir.

    Türetilmiş değerler malzemede DEĞİL burada durur: aynı C30/37 betonu
    TS 500 ve EC2'de farklı elastisite modülü ve farklı tasarım dayanımı verir.
    """

    @property
    def code_name(self) -> str:
        """Yönetmelik adı, izlerde gösterilir."""
        ...

    def fcd(self, c: Concrete, /) -> Derivation:
        """Tasarım basınç dayanımı [Pa]."""
        ...

    def fctk(self, c: Concrete, /) -> Derivation:
        """Karakteristik eksenel çekme dayanımı [Pa]."""
        ...

    def fctd(self, c: Concrete, /) -> Derivation:
        """Tasarım eksenel çekme dayanımı [Pa]."""
        ...

    def Ec(self, c: Concrete, /) -> Derivation:
        """Beton elastisite modülü [Pa]."""
        ...

    def fyd(self, s: ReinforcementSteel, /) -> Derivation:
        """Donatı tasarım akma dayanımı [Pa]."""
        ...

    def eps_cu(self, c: Concrete, /) -> float:
        """Beton nihai basınç şekildeğiştirmesi [-]."""
        ...

    def stress_block(self, c: Concrete, /) -> StressBlock:
        """Eşdeğer dikdörtgen basınç bloğu katsayıları."""
        ...


@runtime_checkable
class LoadCombinator(Protocol):
    """Yük birleşimlerini üretir — TS 500 ile EN 1990 farklı katsayı setleri kullanır."""

    @property
    def code_name(self) -> str: ...

    def ultimate(self, cases: dict[str, str], /) -> tuple[dict[str, float], ...]:
        """Taşıma gücü (ULS) birleşimleri: yük hâli adı → katsayı."""
        ...

    def serviceability(self, cases: dict[str, str], /) -> tuple[dict[str, float], ...]:
        """Kullanılabilirlik (SLS) birleşimleri."""
        ...


@runtime_checkable
class SectionDesigner(Protocol):
    """Kesit kapasitesi: eğilme, eksenel, kesme. Faz 6'da doldurulacak."""

    @property
    def code_name(self) -> str: ...


@runtime_checkable
class DuctilityRules(Protocol):
    """Süneklik ve kapasite tasarımı kuralları. TBDY Bölüm 7 / EC8 §5. Faz 6-9."""

    @property
    def code_name(self) -> str: ...
