"""Yapısal model testleri / structural model tests.

Modelin en önemli işi **tutarsızlığı reddetmektir**. Sessizce kabul edilen bozuk
bir model, sessizce yanlış bir sonuçtur; tekil bir rijitlik matrisi ya da
anlamsız bir iç kuvvet olarak çok sonra ortaya çıkar.
"""

from __future__ import annotations

import pytest

from rcsolve_ref.model.materials import concrete, steel
from rcsolve_ref.model.sections import Rectangular
from rcsolve_ref.model.structure import (
    SCHEMA_VERSION,
    CombinationKind,
    FrameMember,
    LoadCase,
    LoadCombination,
    LoadKind,
    MemberUniformLoad,
    Model,
    ModelError,
    NodalLoad,
    Node,
    Restraint,
    Support,
)

C30 = concrete("C30/37")
B420 = steel("B420C")
BEAM = Rectangular("R250x500", 0.25, 0.50)


def simply_supported() -> Model:
    """6 m basit mesnetli kiriş, ölü yük — Faz 1'in hedef modeli."""
    return Model(
        name="6 m basit mesnetli kiriş",
        nodes=(Node("N1", 0.0, 0.0, 0.0), Node("N2", 6.0, 0.0, 0.0)),
        members=(FrameMember("B1", "N1", "N2", BEAM, C30, B420),),
        supports=(Support("N1", Restraint.pinned()), Support("N2", Restraint.roller_z())),
        load_cases=(LoadCase("G", "ölü yük", LoadKind.DEAD),),
        member_loads=(MemberUniformLoad("G", "B1", wz=-20.0e3),),
        combinations=(
            LoadCombination("C1", "1.4G", CombinationKind.ULTIMATE, {"G": 1.4}),
        ),
    )


class TestValidModel:
    def test_the_reference_model_validates(self) -> None:
        assert simply_supported().validate() is not None

    def test_member_length_comes_from_node_coordinates(self) -> None:
        model = simply_supported()
        assert model.member_length(model.members[0]) == pytest.approx(6.0)

    def test_schema_version_is_recorded(self) -> None:
        assert simply_supported().schema_version == SCHEMA_VERSION

    def test_node_lookup_raises_for_unknown_ids(self) -> None:
        with pytest.raises(KeyError, match=r"düğüm|node"):
            simply_supported().node("nope")

    def test_the_model_carries_no_design_code(self) -> None:
        """Yönetmelik bir analiz parametresidir, model özelliği değil (ADR-0003).

        Bu alan eklenirse aynı modeli iki yönetmelikle çözme yeteneği kaybolur
        ve mimarinin en güçlü sürekli doğrulaması ölür.
        """
        fields = set(Model.__dataclass_fields__)
        assert not {f for f in fields if "code" in f.lower() or "standard" in f.lower()}


class TestRejection:
    def test_duplicate_node_ids(self) -> None:
        model = Model(
            nodes=(Node("N1", 0, 0, 0), Node("N1", 1, 0, 0)),
            members=(FrameMember("B1", "N1", "N1", BEAM, C30, B420),),
            supports=(Support("N1", Restraint.fixed()),),
        )
        with pytest.raises(ModelError, match=r"yinelenen|duplicate"):
            model.validate()

    def test_dangling_member_reference(self) -> None:
        model = Model(
            nodes=(Node("N1", 0, 0, 0),),
            members=(FrameMember("B1", "N1", "GHOST", BEAM, C30, B420),),
            supports=(Support("N1", Restraint.fixed()),),
        )
        with pytest.raises(ModelError, match=r"GHOST"):
            model.validate()

    def test_missing_supports_are_flagged_as_a_singular_system(self) -> None:
        model = Model(
            nodes=(Node("N1", 0, 0, 0), Node("N2", 6, 0, 0)),
            members=(FrameMember("B1", "N1", "N2", BEAM, C30, B420),),
        )
        with pytest.raises(ModelError, match=r"mesnet|supports"):
            model.validate()

    def test_zero_length_member(self) -> None:
        model = Model(
            nodes=(Node("N1", 0, 0, 0), Node("N2", 0, 0, 0)),
            members=(FrameMember("B1", "N1", "N2", BEAM, C30, B420),),
            supports=(Support("N1", Restraint.fixed()),),
        )
        with pytest.raises(ModelError, match=r"sıfır uzunluk|zero length"):
            model.validate()

    def test_load_referring_to_an_unknown_case(self) -> None:
        model = Model(
            nodes=(Node("N1", 0, 0, 0), Node("N2", 6, 0, 0)),
            members=(FrameMember("B1", "N1", "N2", BEAM, C30, B420),),
            supports=(Support("N1", Restraint.fixed()),),
            nodal_loads=(NodalLoad("NO_SUCH_CASE", "N2", fz=-1e3),),
        )
        with pytest.raises(ModelError, match=r"NO_SUCH_CASE"):
            model.validate()

    def test_combination_referring_to_an_unknown_case(self) -> None:
        model = simply_supported()
        broken = Model(
            **{
                **{f: getattr(model, f) for f in Model.__dataclass_fields__},
                "combinations": (
                    LoadCombination("C1", "bad", CombinationKind.ULTIMATE, {"Q": 1.5}),
                ),
            }
        )
        with pytest.raises(ModelError, match=r"Q"):
            broken.validate()

    def test_all_problems_are_reported_at_once(self) -> None:
        """Kullanıcıya hataları teker teker keşfettirmek kabul edilemez."""
        model = Model(nodes=(), members=())
        with pytest.raises(ModelError) as caught:
            model.validate()
        message = str(caught.value)
        assert "düğüm yok" in message
        assert "eleman yok" in message
        assert "mesnet" in message


class TestRestraint:
    def test_named_constructors(self) -> None:
        assert Restraint.fixed().count == 6
        assert Restraint.pinned().count == 3
        assert Restraint.roller_z().count == 1
        assert Restraint().count == 0

    def test_pinned_frees_all_rotations(self) -> None:
        pinned = Restraint.pinned()
        assert not (pinned.rx or pinned.ry or pinned.rz)
        assert pinned.ux and pinned.uy and pinned.uz

    def test_as_tuple_is_in_dof_order(self) -> None:
        assert Restraint(ux=True, rz=True).as_tuple() == (True, False, False, False, False, True)
