"""Malzeme ve yönetmelik sağlayıcı testleri / material and code-provider tests."""

from __future__ import annotations

import math

import pytest

from rcsolve_ref import units as u
from rcsolve_ref.codes.ec2 import EN_RECOMMENDED, EC2Materials, NationalAnnex
from rcsolve_ref.codes.protocols import MaterialModel
from rcsolve_ref.codes.ts500 import TS500Materials
from rcsolve_ref.model.materials import CONCRETE_GRADES, STEEL_GRADES, Concrete, concrete, steel

MPa = 1.0e6


class TestGrades:
    def test_lookup_and_si_storage(self) -> None:
        c = concrete("C30/37")
        assert c.fck == pytest.approx(30 * MPa)
        assert c.fck_cube == pytest.approx(37 * MPa)
        assert c.fcm == pytest.approx(38 * MPa)

    def test_steel_yield_strain(self) -> None:
        assert steel("B420C").eps_y == pytest.approx(420 * MPa / 200e9)

    def test_grade_names_match_the_pair_in_the_label(self) -> None:
        """C30/37 gerçekten 30 ve 37 MPa saklamalı — etiket ile veri ayrışmamalı."""
        for name, grade in CONCRETE_GRADES.items():
            cyl, cube = (float(x) for x in name.removeprefix("C").split("/"))
            assert grade.fck == pytest.approx(cyl * MPa)
            assert grade.fck_cube == pytest.approx(cube * MPa)

    def test_all_steels_are_self_consistent(self) -> None:
        for grade in STEEL_GRADES.values():
            assert grade.ftk >= grade.fyk
            assert 0.0 < grade.eps_uk < 1.0

    @pytest.mark.parametrize("bad", ["C99", "c30/37", "C30", ""])
    def test_unknown_grade_raises_with_a_useful_message(self, bad: str) -> None:
        with pytest.raises(KeyError, match=r"tanımlı|defined"):
            concrete(bad)

    def test_invalid_grade_construction_is_rejected(self) -> None:
        with pytest.raises(ValueError, match=r"pozitif|positive"):
            Concrete("bad", -1.0, 1.0)
        with pytest.raises(ValueError, match=r"küp|cube"):
            Concrete("bad", 30 * MPa, 20 * MPa)


class TestProviderConformance:
    """Her sağlayıcı arayüze uymalı; uymayan sessizce kullanılamamalı."""

    @pytest.mark.parametrize("provider", [TS500Materials(), EC2Materials()])
    def test_satisfies_the_material_model_protocol(self, provider: object) -> None:
        assert isinstance(provider, MaterialModel)

    @pytest.mark.parametrize("provider", [TS500Materials(), EC2Materials()])
    def test_every_derivation_is_traceable(self, provider: MaterialModel) -> None:
        """İzsiz sonuç yok: her türetilmiş değer formülünü ve girdilerini taşır."""
        c, s = concrete("C30/37"), steel("B420C")
        for derivation in (provider.fcd(c), provider.fctk(c), provider.fctd(c),
                           provider.Ec(c), provider.fyd(s)):
            assert derivation.code
            assert derivation.formula
            assert derivation.inputs, f"{derivation.result.symbol} girdisiz / has no inputs"
            assert math.isfinite(derivation.value)
            assert derivation.value > 0.0

    @pytest.mark.parametrize("provider", [TS500Materials(), EC2Materials()])
    def test_traces_report_in_sane_display_units(self, provider: MaterialModel) -> None:
        c = concrete("C30/37")
        assert u.dimension_of(provider.fcd(c).result.unit) == u.STRESS
        assert provider.fcd(c).result.display == pytest.approx(provider.fcd(c).value / MPa)


class TestTS500Values:
    """TS 500 formülleri. Resmî metinden teyit bekliyor; burada iç tutarlılık."""

    def test_design_strengths(self) -> None:
        m = TS500Materials()
        assert m.fcd(concrete("C30/37")).value == pytest.approx(30 / 1.5 * MPa)
        assert m.fyd(steel("B420C")).value == pytest.approx(420 / 1.15 * MPa)

    def test_tensile_strength_follows_sqrt_fck(self) -> None:
        m = TS500Materials()
        assert m.fctk(concrete("C25/30")).value == pytest.approx(0.35 * math.sqrt(25) * MPa)

    def test_modulus(self) -> None:
        m = TS500Materials()
        expected = (3250 * math.sqrt(30) + 14000) * MPa
        assert m.Ec(concrete("C30/37")).value == pytest.approx(expected)

    @pytest.mark.parametrize(
        ("grade", "k1"),
        [("C20/25", 0.85), ("C25/30", 0.85), ("C30/37", 0.82), ("C50/60", 0.70)],
    )
    def test_stress_block_k1_steps_down_above_C25(self, grade: str, k1: float) -> None:
        assert TS500Materials().stress_block(concrete(grade)).lambda_ == pytest.approx(k1)

    def test_k1_never_drops_below_the_floor(self) -> None:
        for grade in CONCRETE_GRADES.values():
            assert TS500Materials().stress_block(grade).lambda_ >= 0.70


class TestEC2Values:
    def test_design_strengths_with_recommended_ndp(self) -> None:
        m = EC2Materials()
        assert m.fcd(concrete("C30/37")).value == pytest.approx(1.0 * 30 / 1.5 * MPa)
        assert m.fyd(steel("B500C")).value == pytest.approx(500 / 1.15 * MPa)

    def test_tensile_strength_chain(self) -> None:
        m = EC2Materials()
        c = concrete("C30/37")
        assert m.fctm(c).value == pytest.approx(0.30 * 30 ** (2 / 3) * MPa)
        assert m.fctk(c).value == pytest.approx(0.7 * m.fctm(c).value)

    def test_secant_modulus(self) -> None:
        assert EC2Materials().Ec(concrete("C30/37")).value == pytest.approx(
            22.0 * (38 / 10) ** 0.3 * 1e9
        )

    def test_high_strength_concrete_is_refused_not_extrapolated(self) -> None:
        """C50/60 üstü formülleri farklıdır. Sessizce yanlış cevap vermektense reddet."""
        beyond = Concrete("C60/75", 60 * MPa, 75 * MPa)
        m = EC2Materials()
        for call in (m.fctm, m.eps_cu, m.stress_block):
            with pytest.raises(NotImplementedError):
                call(beyond)


class TestNationalAnnexLayer:
    """Ulusal Ek bir VERİ katmanıdır. Yeni ülke = yeni veri, kod değişikliği değil."""

    def test_alpha_cc_changes_the_result_without_touching_code(self) -> None:
        c = concrete("C30/37")
        strict = NationalAnnex("example", alpha_cc=0.85, alpha_ct=1.0, gamma_c=1.5, gamma_s=1.15)
        assert EC2Materials(strict).fcd(c).value == pytest.approx(0.85 * 30 / 1.5 * MPa)
        assert EC2Materials(strict).fcd(c).value < EC2Materials().fcd(c).value

    def test_ndp_values_appear_in_the_trace(self) -> None:
        """Rapor hangi Ulusal Ek'in kullanıldığını göstermek zorunda."""
        derivation = EC2Materials().fcd(concrete("C30/37"))
        assert EN_RECOMMENDED.country in derivation.code
        symbols = {term.symbol for term in derivation.inputs}
        assert {"alpha_cc", "gamma_C"} <= symbols

    def test_accidental_partial_factors_are_not_silently_assumed(self) -> None:
        """Kazara yükleme katsayıları henüz modellenmedi; uydurulmuş değer YOK."""
        assert not hasattr(EN_RECOMMENDED, "gamma_c_accidental")


class TestCodesDisagree:
    """Asıl sınav: aynı malzeme, iki yönetmelik, farklı türetilmiş değerler.

    İkisi aynı çıksaydı ya soyutlama kaçak yapıyordur ya bir uygulama yanlıştır.
    """

    def test_same_concrete_gives_different_derived_properties(self) -> None:
        c = concrete("C30/37")
        ts, ec = TS500Materials(), EC2Materials()
        assert ts.fctk(c).value != pytest.approx(ec.fctk(c).value, rel=1e-3)
        assert ts.Ec(c).value != pytest.approx(ec.Ec(c).value, rel=1e-3)
        assert ts.eps_cu(c) != ec.eps_cu(c)
        assert ts.stress_block(c) != ec.stress_block(c)

    def test_but_stay_within_engineering_plausibility(self) -> None:
        """Ayrışma gerçek olmalı, saçma olmamalı: %25'i aşan fark hata kokar."""
        for c in CONCRETE_GRADES.values():
            ts, ec = TS500Materials(), EC2Materials()
            assert 0.75 < ts.Ec(c).value / ec.Ec(c).value < 1.25
            assert 0.75 < ts.fctk(c).value / ec.fctk(c).value < 1.25

    def test_fcd_happens_to_coincide_under_recommended_ndp(self) -> None:
        """alpha_cc = 1.0 iken iki formül de f_ck/1.5'e iner — çakışma tesadüftür.

        f_cd'nin eşit olması kapasitelerin eşit olduğu anlamına GELMEZ: blok
        katsayıları (eta, lambda) ve eps_cu farklıdır.
        """
        c = concrete("C30/37")
        assert TS500Materials().fcd(c).value == pytest.approx(EC2Materials().fcd(c).value)
        assert TS500Materials().stress_block(c) != EC2Materials().stress_block(c)
