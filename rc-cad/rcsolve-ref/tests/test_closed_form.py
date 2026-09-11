"""Kapalı-form kıyasların kendi doğrulaması / validating the reference solutions.

Bir formülü kendi kendisiyle test etmek dairesel olurdu. Bu dosya bunun yerine
formüller arasındaki **bağımsız fizik ilişkilerini** sınar: denge, serbest cisim
tutarlılığı, süperpozisyon, ölçek yasaları ve fiziksel sıralama. Bunlar
formüllerden türetilmemiştir; biri yanlış yazılmışsa bu testler yakalar.

Testing a formula against itself would be circular. This file checks
**independent physical relationships** between the formulas instead: statics,
free-body consistency, superposition, scaling laws and physical ordering. If one
formula is mistyped, these catch it.
"""

from __future__ import annotations

import math

import pytest

from rcsolve_ref.benchmarks import closed_form as cf

# C30/37, 250x500 mm dikdörtgen kesit / rectangular section
EI = 32.0e9 * (0.25 * 0.5**3 / 12.0)
EA = 32.0e9 * (0.25 * 0.5)
L = 6.0
W = 20.0e3  # N/m
P = 50.0e3  # N


class TestStaticEquilibrium:
    """Mesnet tepkilerinin toplamı uygulanan yüke eşit olmak zorundadır."""

    def test_simply_supported_udl(self) -> None:
        assert cf.simply_supported_udl(W, L, EI).total_reaction == pytest.approx(W * L)

    def test_simply_supported_point_load(self) -> None:
        assert cf.simply_supported_point_load_midspan(P, L, EI).total_reaction == pytest.approx(P)

    def test_propped_cantilever(self) -> None:
        assert cf.propped_cantilever_udl(W, L, EI).total_reaction == pytest.approx(W * L)

    def test_fixed_fixed(self) -> None:
        assert cf.fixed_fixed_udl(W, L, EI).total_reaction == pytest.approx(W * L)

    def test_cantilever_udl(self) -> None:
        assert cf.cantilever_udl(W, L, EI).total_reaction == pytest.approx(W * L)


class TestFreeBodyConsistency:
    """Hiperstatik çözümler izostatik çözümle uyumlu olmalı."""

    def test_fixed_fixed_midspan_moment_closes_the_free_body(self) -> None:
        """M_orta(ankastre) = M_orta(basit) - M_uc  →  wL²/24 = wL²/8 - wL²/12."""
        simple = cf.simply_supported_udl(W, L, EI).moment_max
        end = cf.fixed_fixed_udl(W, L, EI).moment_left
        assert simple - end == pytest.approx(W * L**2 / 24.0)

    def test_propped_cantilever_redistribution_matches_its_end_moment(self) -> None:
        """Tepki kayması, ankastrelik momentinin açıklığa bölümüne eşit olmalı."""
        propped = cf.propped_cantilever_udl(W, L, EI)
        simple_reaction = W * L / 2.0
        shift = propped.reaction_left - simple_reaction
        assert shift == pytest.approx(propped.moment_left / L)
        assert simple_reaction - propped.reaction_right == pytest.approx(propped.moment_left / L)

    def test_cantilever_moment_equals_load_times_lever_arm(self) -> None:
        assert cf.cantilever_udl(W, L, EI).moment_left == pytest.approx((W * L) * (L / 2.0))
        assert cf.cantilever_point_load(P, L, EI).moment_left == pytest.approx(P * L)


class TestSuperposition:
    """Yayılı yük, tekil yüklerin integralidir. Bağımsız türetme."""

    def test_cantilever_udl_is_the_integral_of_point_loads(self) -> None:
        """delta_uc = integral_0^L [w·a²·(3L-a) / (6·EI)] da  =  w·L⁴/(8·EI)."""
        steps = 200_000
        da = L / steps
        total = 0.0
        for i in range(steps):
            a = (i + 0.5) * da
            total += W * da * a**2 * (3.0 * L - a) / (6.0 * EI)
        assert total == pytest.approx(cf.cantilever_udl(W, L, EI).deflection, rel=1e-8)

    def test_two_half_loads_equal_one_full_load(self) -> None:
        half = cf.simply_supported_udl(W / 2.0, L, EI)
        full = cf.simply_supported_udl(W, L, EI)
        assert 2.0 * half.deflection == pytest.approx(full.deflection)
        assert 2.0 * half.moment_max == pytest.approx(full.moment_max)


class TestScalingLaws:
    """Boyut analizinin dayattığı ölçek ilişkileri."""

    def test_udl_deflection_scales_with_L_to_the_fourth(self) -> None:
        base = cf.simply_supported_udl(W, L, EI).deflection
        doubled = cf.simply_supported_udl(W, 2.0 * L, EI).deflection
        assert doubled / base == pytest.approx(16.0)

    def test_point_load_deflection_scales_with_L_cubed(self) -> None:
        base = cf.cantilever_point_load(P, L, EI).deflection
        doubled = cf.cantilever_point_load(P, 2.0 * L, EI).deflection
        assert doubled / base == pytest.approx(8.0)

    def test_deflection_is_inversely_proportional_to_EI(self) -> None:
        stiff = cf.simply_supported_udl(W, L, 2.0 * EI).deflection
        soft = cf.simply_supported_udl(W, L, EI).deflection
        assert soft / stiff == pytest.approx(2.0)

    def test_moment_does_not_depend_on_stiffness_in_isostatic_systems(self) -> None:
        """İzostatik sistemde moment rijitlikten bağımsızdır — hiperstatikte değil."""
        a = cf.simply_supported_udl(W, L, EI).moment_max
        b = cf.simply_supported_udl(W, L, 1000.0 * EI).moment_max
        assert a == pytest.approx(b)


class TestPhysicalOrdering:
    """Daha çok tutulu = daha az sehim. Sıralama bozulursa bir formül yanlıştır."""

    def test_restraint_reduces_deflection_monotonically(self) -> None:
        simple = cf.simply_supported_udl(W, L, EI).deflection
        propped = cf.propped_cantilever_udl(W, L, EI).deflection
        fixed = cf.fixed_fixed_udl(W, L, EI).deflection
        assert simple > propped > fixed > 0.0

    def test_the_classic_ratios_hold(self) -> None:
        """basit/ankastre = 5, basit/tek ankastre ~ 2.31."""
        simple = cf.simply_supported_udl(W, L, EI).deflection
        assert simple / cf.fixed_fixed_udl(W, L, EI).deflection == pytest.approx(5.0)
        assert simple / cf.propped_cantilever_udl(W, L, EI).deflection == pytest.approx(
            185.0 / 76.8, rel=1e-3
        )

    def test_cantilever_is_far_softer_than_simply_supported(self) -> None:
        cantilever = cf.cantilever_udl(W, L, EI).deflection
        simple = cf.simply_supported_udl(W, L, EI).deflection
        assert cantilever / simple == pytest.approx(384.0 / (8.0 * 5.0))


class TestPortalAndDynamics:
    def test_portal_sway_is_consistent_with_its_column_moment(self) -> None:
        """M = 6·EI·Delta/h² ilişkisi iki dönüş değerini bağımsız olarak bağlar."""
        H, h = 100.0e3, 3.5
        sway, moment = cf.rigid_beam_portal_sway(H, h, EI)
        assert moment == pytest.approx(6.0 * EI * sway / h**2)

    def test_portal_columns_share_the_shear(self) -> None:
        """İki kolon, ötelenmeli ankastre-ankastre: her biri 12·EI·Delta/h³."""
        H, h = 100.0e3, 3.5
        sway, _ = cf.rigid_beam_portal_sway(H, h, EI)
        assert 2.0 * (12.0 * EI * sway / h**3) == pytest.approx(H)

    def test_sdof_period_matches_the_cantilever_stiffness(self) -> None:
        """Konsolun uç rijitliği P/delta = 3·EI/L³; periyot bundan türemeli."""
        tip = cf.cantilever_point_load(P, L, EI)
        stiffness = P / tip.deflection
        assert stiffness == pytest.approx(3.0 * EI / L**3)
        mass = 5000.0
        assert cf.sdof_period(mass, stiffness) == pytest.approx(
            2.0 * math.pi * math.sqrt(mass * L**3 / (3.0 * EI))
        )

    def test_axial_and_torsional_are_linear(self) -> None:
        assert cf.axial_bar(2.0 * P, L, EA) == pytest.approx(2.0 * cf.axial_bar(P, L, EA))
        assert cf.torsion_bar(10e3, L, 1e6) == pytest.approx(10e3 * L / 1e6)


class TestInputValidation:
    @pytest.mark.parametrize("bad_length", [0.0, -1.0])
    def test_non_positive_span_is_rejected(self, bad_length: float) -> None:
        with pytest.raises(ValueError, match=r"açıklık|span"):
            cf.simply_supported_udl(W, bad_length, EI)

    @pytest.mark.parametrize("bad_stiffness", [0.0, -1.0])
    def test_non_positive_stiffness_is_rejected(self, bad_stiffness: float) -> None:
        with pytest.raises(ValueError, match="EI"):
            cf.simply_supported_udl(W, L, bad_stiffness)

    def test_sdof_rejects_zero_mass(self) -> None:
        with pytest.raises(ValueError, match=r"kütle|mass"):
            cf.sdof_period(0.0, 1000.0)
