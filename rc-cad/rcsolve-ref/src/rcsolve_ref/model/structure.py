"""L2 — Yapısal model / structural model. Tek doğru kaynak.

Analizden ve çizimden **bağımsız**, serileştirilebilir, şema sürümlü veri modeli.
Değişmez (immutable) ve saf veridir: çözücü model alır, sonuç döner, modeli
değiştirmez. Undo/redo, karşılaştırma ve test bunun bedava sonucudur.

**Modelde yönetmelik alanı yoktur.** Yönetmelik bir *analiz parametresidir*,
model özelliği değil. Aynı model TBDY ve Eurocode ile çözülebilmelidir — bu
kısıt, mimarinin en güçlü sürekli doğrulama aracıdır (ADR-0003).

**There is no design-code field in the model.** The code is an analysis
parameter, not a model property: the same model must be solvable under either,
which is the architecture's strongest continuous self-check.

Tüm değerler SI'dır. Birim dönüşümü yükleyicide, sınırda yapılır (ADR-0002).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import StrEnum

from .materials import Concrete, ReinforcementSteel
from .sections import Section

__all__ = [
    "SCHEMA_VERSION",
    "CombinationKind",
    "FrameMember",
    "LoadCase",
    "LoadCombination",
    "LoadKind",
    "MemberUniformLoad",
    "Model",
    "ModelError",
    "NodalLoad",
    "Node",
    "Restraint",
    "Support",
]

#: Model şeması sürümü. Uyumsuz değişiklik büyük sürümü artırır ve bir göç
#: (migration) yazılmasını zorunlu kılar.
SCHEMA_VERSION = "1.0"


class ModelError(ValueError):
    """Model tutarsız / the model is inconsistent."""


class LoadKind(StrEnum):
    """Yük hâli türü. Yük birleşimi üreticisi (yönetmeliğe özel) bunu okur.

    Tür burada durur çünkü *fiziksel* bir niteliktir; hangi katsayıyla
    çarpılacağı yönetmeliğe aittir ve modelde yer almaz.
    """

    DEAD = "dead"
    LIVE = "live"
    SNOW = "snow"
    WIND = "wind"
    SEISMIC = "seismic"
    TEMPERATURE = "temperature"


class CombinationKind(StrEnum):
    ULTIMATE = "ultimate"  # taşıma gücü
    SERVICEABILITY = "serviceability"  # kullanılabilirlik


@dataclass(frozen=True, slots=True)
class Restraint:
    """Düğüm serbestlik derecesi tutuluşu. ``True`` = tutulu."""

    ux: bool = False
    uy: bool = False
    uz: bool = False
    rx: bool = False
    ry: bool = False
    rz: bool = False

    @classmethod
    def fixed(cls) -> Restraint:
        """Ankastre / fully fixed."""
        return cls(True, True, True, True, True, True)

    @classmethod
    def pinned(cls) -> Restraint:
        """Sabit mesnet (dönmeler serbest) / pinned."""
        return cls(True, True, True, False, False, False)

    @classmethod
    def roller_z(cls) -> Restraint:
        """Yalnızca düşey tutulu kayıcı mesnet / vertical roller."""
        return cls(False, False, True, False, False, False)

    def as_tuple(self) -> tuple[bool, bool, bool, bool, bool, bool]:
        return (self.ux, self.uy, self.uz, self.rx, self.ry, self.rz)

    @property
    def count(self) -> int:
        return sum(self.as_tuple())


@dataclass(frozen=True, slots=True)
class Node:
    """Düğüm noktası, küresel koordinatlar [m]."""

    id: str
    x: float
    y: float
    z: float

    def distance_to(self, other: Node) -> float:
        return math.dist((self.x, self.y, self.z), (other.x, other.y, other.z))


@dataclass(frozen=True, slots=True)
class Support:
    node_id: str
    restraint: Restraint


@dataclass(frozen=True, slots=True)
class FrameMember:
    """Çubuk eleman (kolon, kiriş). 12 serbestlik dereceli 3B çerçeve elemanı.

    Attributes:
        rotation: Yerel eksenlerin kendi ekseni etrafında dönmesi [rad].
        release_i / release_j: Uç mafsalları. ``True`` = o serbestlik serbest
            bırakılmış (moment aktarmaz).
    """

    id: str
    node_i: str
    node_j: str
    section: Section
    concrete: Concrete
    rebar: ReinforcementSteel
    rotation: float = 0.0
    release_i: Restraint = field(default_factory=Restraint)
    release_j: Restraint = field(default_factory=Restraint)


@dataclass(frozen=True, slots=True)
class LoadCase:
    id: str
    name: str
    kind: LoadKind


@dataclass(frozen=True, slots=True)
class NodalLoad:
    """Düğüm yükü. Kuvvetler [N], momentler [N·m], küresel eksenlerde."""

    case_id: str
    node_id: str
    fx: float = 0.0
    fy: float = 0.0
    fz: float = 0.0
    mx: float = 0.0
    my: float = 0.0
    mz: float = 0.0


@dataclass(frozen=True, slots=True)
class MemberUniformLoad:
    """Eleman boyunca düzgün yayılı yük [N/m], küresel eksenlerde."""

    case_id: str
    member_id: str
    wx: float = 0.0
    wy: float = 0.0
    wz: float = 0.0


@dataclass(frozen=True, slots=True)
class LoadCombination:
    """Yük birleşimi: yük hâli kimliği → katsayı.

    Katsayılar yönetmeliğe özeldir ve ``LoadCombinator`` sağlayıcısı tarafından
    üretilir; burada sonuç saklanır, kural değil.
    """

    id: str
    name: str
    kind: CombinationKind
    factors: dict[str, float]


@dataclass(frozen=True, slots=True)
class Model:
    """Tam yapısal model. ``validate()`` çağrılmadan çözücüye verilmemelidir."""

    nodes: tuple[Node, ...]
    members: tuple[FrameMember, ...]
    supports: tuple[Support, ...] = ()
    load_cases: tuple[LoadCase, ...] = ()
    nodal_loads: tuple[NodalLoad, ...] = ()
    member_loads: tuple[MemberUniformLoad, ...] = ()
    combinations: tuple[LoadCombination, ...] = ()
    schema_version: str = SCHEMA_VERSION
    name: str = ""

    def node(self, node_id: str) -> Node:
        for node in self.nodes:
            if node.id == node_id:
                return node
        raise KeyError(f"düğüm bulunamadı / node not found: {node_id!r}")

    def member_length(self, member: FrameMember) -> float:
        return self.node(member.node_i).distance_to(self.node(member.node_j))

    def validate(self) -> Model:
        """Tutarlılık denetimi. Hata varsa :class:`ModelError` yükseltir.

        Sessizce kabul edilen tutarsız bir model, sessizce yanlış bir sonuçtur.
        Bu yüzden tüm sorunlar toplanıp tek seferde bildirilir — kullanıcıyı
        hataları teker teker keşfettirmek yerine.
        """
        problems: list[str] = []

        node_ids = [n.id for n in self.nodes]
        problems += _duplicates(node_ids, "düğüm / node")
        problems += _duplicates([m.id for m in self.members], "eleman / member")
        problems += _duplicates([c.id for c in self.load_cases], "yük hâli / load case")
        problems += _duplicates([c.id for c in self.combinations], "birleşim / combination")

        known_nodes = set(node_ids)
        known_members = {m.id for m in self.members}
        known_cases = {c.id for c in self.load_cases}

        if not self.nodes:
            problems.append("model boş: hiç düğüm yok / no nodes")
        if not self.members:
            problems.append("model boş: hiç eleman yok / no members")
        if not self.supports:
            problems.append(
                "hiç mesnet yok — sistem rijit cisim hareketi yapar ve rijitlik matrisi "
                "tekildir / no supports: the stiffness matrix will be singular"
            )

        for member in self.members:
            for end, ref in (("i", member.node_i), ("j", member.node_j)):
                if ref not in known_nodes:
                    problems.append(f"eleman {member.id!r} ucu {end}: bilinmeyen düğüm {ref!r}")
            if member.node_i == member.node_j:
                problems.append(f"eleman {member.id!r}: iki ucu aynı düğüm / zero-length member")
            elif (
                member.node_i in known_nodes
                and member.node_j in known_nodes
                and self.member_length(member) <= 0.0
            ):
                problems.append(f"eleman {member.id!r}: sıfır uzunluk / zero length")

        for support in self.supports:
            if support.node_id not in known_nodes:
                problems.append(f"mesnet: bilinmeyen düğüm / unknown node {support.node_id!r}")

        for nodal_load in self.nodal_loads:
            if nodal_load.node_id not in known_nodes:
                problems.append(f"düğüm yükü: bilinmeyen düğüm {nodal_load.node_id!r}")
            if nodal_load.case_id not in known_cases:
                problems.append(f"düğüm yükü: bilinmeyen yük hâli {nodal_load.case_id!r}")
        for member_load in self.member_loads:
            if member_load.member_id not in known_members:
                problems.append(f"eleman yükü: bilinmeyen eleman {member_load.member_id!r}")
            if member_load.case_id not in known_cases:
                problems.append(f"eleman yükü: bilinmeyen yük hâli {member_load.case_id!r}")

        for combination in self.combinations:
            for case_id in combination.factors:
                if case_id not in known_cases:
                    problems.append(
                        f"birleşim {combination.id!r}: bilinmeyen yük hâli {case_id!r}"
                    )

        if problems:
            raise ModelError(
                f"model {len(problems)} tutarsızlık içeriyor / has {len(problems)} problems:\n  - "
                + "\n  - ".join(problems)
            )
        return self


def _duplicates(ids: list[str], label: str) -> list[str]:
    seen: set[str] = set()
    repeated: list[str] = []
    for value in ids:
        if value in seen and value not in repeated:
            repeated.append(value)
        seen.add(value)
    return [f"yinelenen {label} kimliği / duplicate id: {value!r}" for value in repeated]
