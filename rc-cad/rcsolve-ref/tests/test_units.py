"""L0 birim sistemi testleri / unit-system tests.

Birim hatası bu alandaki en sinsi hata sınıfıdır: program çalışır, sayı üretir,
sayı 1000 kat yanlıştır. Bu dosya o sınıfı kapatmaya çalışır.

Unit errors are the most insidious defect class in this domain: the program runs,
produces a number, and the number is off by a factor of 1000. This file exists to
close that class off.
"""

from __future__ import annotations

import math

import pytest

from rcsolve_ref import units as u


class TestParsing:
    @pytest.mark.parametrize(
        ("text", "dimension", "factor"),
        [
            ("m", u.LENGTH, 1.0),
            ("mm", u.LENGTH, 1e-3),
            ("cm", u.LENGTH, 1e-2),
            ("N", u.FORCE, 1.0),
            ("kN", u.FORCE, 1e3),
            ("MN", u.FORCE, 1e6),
            ("MPa", u.STRESS, 1e6),
            ("kN/m", u.LINE_LOAD, 1e3),
            ("kN/m2", u.STRESS, 1e3),
            ("kN/m3", u.UNIT_WEIGHT, 1e3),
            ("kg/m3", u.DENSITY, 1.0),
            ("kN*m", u.MOMENT, 1e3),
            ("N*mm", u.MOMENT, 1e-3),
            ("m4", u.SECOND_MOMENT_OF_AREA, 1.0),
            ("cm4", u.SECOND_MOMENT_OF_AREA, 1e-8),
            ("m/s2", u.ACCELERATION, 1.0),
            ("1/m", u.CURVATURE, 1.0),
            ("kN*m/rad", u.ROTATIONAL_STIFFNESS, 1e3),
            ("1", u.DIMENSIONLESS, 1.0),
            ("-", u.DIMENSIONLESS, 1.0),
        ],
    )
    def test_known_units(self, text: str, dimension: u.Dimension, factor: float) -> None:
        assert u.dimension_of(text) == dimension
        assert u.factor_of(text) == pytest.approx(factor, rel=1e-15)

    @pytest.mark.parametrize(
        ("written", "canonical"),
        [("kN/m^2", "kN/m2"), ("kN·m", "kN*m"), (" kN / m ", "kN/m"), ("N m", "N*m")],
    )
    def test_spelling_variants_agree(self, written: str, canonical: str) -> None:
        """``^`` ve ``·`` normalize edilir; boşluk çarpmadır (``N m`` = N·m)."""
        assert u._parse(written) == u._parse(canonical)

    def test_slash_binds_to_one_term_only(self) -> None:
        """``kg/m/s`` soldan sağa okunur: kg·m⁻¹·s⁻¹, kg·s/m değil."""
        assert u.dimension_of("kg/m/s") == u.Dimension(L=-1, M=1, T=-1)

    def test_negative_exponent(self) -> None:
        assert u.dimension_of("m-1") == u.CURVATURE
        assert u.factor_of("cm-1") == pytest.approx(100.0)


class TestRejection:
    """Sessiz kabul, sessiz felakettir. Şüpheli girdi hata vermeli."""

    def test_prefix_guessing_is_not_allowed(self) -> None:
        """``mN`` kayıtlı değil: 'MN' yazmak isteyeni 10⁹ kat yanıltmaktansa reddet."""
        with pytest.raises(u.UnknownUnitError):
            u.dimension_of("mN")

    @pytest.mark.parametrize("text", ["furlong", "ksi", "psi", "lbf", "kip"])
    def test_unregistered_units_raise(self, text: str) -> None:
        with pytest.raises(u.UnknownUnitError):
            u.dimension_of(text)

    @pytest.mark.parametrize("text", ["", "   ", "kN/", "/m", "kN**m", "2m"])
    def test_malformed_strings_raise(self, text: str) -> None:
        with pytest.raises((u.UnitSyntaxError, u.UnknownUnitError)):
            u.dimension_of(text)

    def test_non_string_raises(self) -> None:
        with pytest.raises(u.UnitSyntaxError):
            u.dimension_of(5)  # type: ignore[arg-type]


class TestDimensionGate:
    def test_require_passes_matching_dimension(self) -> None:
        assert u.require("kN", u.FORCE) == pytest.approx(1e3)

    def test_require_rejects_mismatch(self) -> None:
        """Kiriş yükü olarak gerilme verilmesi burada yakalanmalı."""
        with pytest.raises(u.DimensionError, match=r"beklenen|expected"):
            u.require("MPa", u.LINE_LOAD, what="kiriş düzgün yayılı yükü")

    def test_error_message_names_the_quantity(self) -> None:
        with pytest.raises(u.DimensionError, match="kolon eksenel kuvveti"):
            u.require("m", u.FORCE, what="kolon eksenel kuvveti")

    def test_angle_is_not_strain(self) -> None:
        """Radyan SI'da boyutsuzdur; burada değil — karışmaları gerçek bir hatadır."""
        assert u.dimension_of("rad") != u.DIMENSIONLESS
        with pytest.raises(u.DimensionError):
            u.require("rad", u.DIMENSIONLESS)

    def test_moment_and_line_moment_share_a_dimension(self) -> None:
        """N·m/m ile N aynı boyuttadır. Boyut analizi bu ikisini AYIRAMAZ —
        adlandırma ve tip disiplini gerekir. Bu, sistemin bilinen sınırıdır."""
        assert u.dimension_of("kN*m/m") == u.FORCE


class TestConversion:
    def test_round_trip_is_exact_enough(self) -> None:
        for text in ("kN", "MPa", "kN/m2", "cm4", "tf", "deg"):
            assert u.from_si(u.to_si(1.234, text), text) == pytest.approx(1.234, rel=1e-14)

    @pytest.mark.parametrize(
        ("value", "unit", "expected_si"),
        [
            (1.0, "kN", 1e3),
            (25.0, "kN/m3", 25e3),  # betonarme birim hacim ağırlığı / RC unit weight
            (30.0, "MPa", 30e6),  # C30/37 karakteristik dayanımı
            (1.0, "tf", 9806.65),
            (180.0, "deg", math.pi),
            (1.0, "cm4", 1e-8),
        ],
    )
    def test_known_conversions(self, value: float, unit: str, expected_si: float) -> None:
        assert u.to_si(value, unit) == pytest.approx(expected_si, rel=1e-12)

    def test_conversion_checks_dimension_when_asked(self) -> None:
        assert u.to_si(1.0, "kN", u.FORCE) == pytest.approx(1e3)
        with pytest.raises(u.DimensionError):
            u.to_si(1.0, "kN", u.STRESS)


class TestDimensionAlgebra:
    def test_multiplication_and_division(self) -> None:
        assert u.FORCE * u.LENGTH == u.MOMENT
        assert u.FORCE / u.AREA == u.STRESS
        assert u.MOMENT / u.LENGTH == u.FORCE

    def test_power(self) -> None:
        assert u.LENGTH**4 == u.SECOND_MOMENT_OF_AREA
        assert u.LENGTH**0 == u.DIMENSIONLESS

    def test_flexural_stiffness_EI_has_moment_times_area(self) -> None:
        """E·I boyutu: Pa · m⁴ = N·m²."""
        assert u.Dimension(L=3, M=1, T=-2) == u.STRESS * u.SECOND_MOMENT_OF_AREA

    def test_str_is_readable(self) -> None:
        assert str(u.FORCE) == "L^1·M^1·T^-2"
        assert str(u.DIMENSIONLESS) == "1"
