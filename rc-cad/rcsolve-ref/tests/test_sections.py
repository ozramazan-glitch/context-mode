"""Kesit geometrisi testleri / section geometry tests.

En güçlü test, T kesitin **dejenere hâlidir**: tabla genişliği gövde
genişliğine eşitlenince T bir dikdörtgene indirgenir ve ataleti tam olarak
b·h³/12 çıkmalıdır. Bu, Steiner (paralel eksen) uygulamasını bağımsız olarak
doğrular — formülü kendisiyle karşılaştırmadan.

The strongest test here is the **degenerate T**: set the flange width equal to
the web width and the T collapses to a plain rectangle, so its second moment
must come out exactly b·h³/12. That validates the parallel-axis implementation
independently, without comparing a formula to itself.
"""

from __future__ import annotations

import pytest

from rcsolve_ref.model.sections import Rectangular, Section, TSection


class TestRectangular:
    def test_satisfies_the_section_protocol(self) -> None:
        assert isinstance(Rectangular("R", 0.25, 0.5), Section)

    def test_geometric_properties(self) -> None:
        r = Rectangular("R250x500", 0.25, 0.50)
        assert r.area == pytest.approx(0.125)
        assert r.Iy == pytest.approx(0.25 * 0.5**3 / 12.0)
        assert r.Iz == pytest.approx(0.50 * 0.25**3 / 12.0)
        assert r.depth == pytest.approx(0.50)

    def test_strong_axis_is_the_taller_one(self) -> None:
        r = Rectangular("R", 0.25, 0.50)
        assert r.Iy > r.Iz

    def test_square_is_isotropic_in_bending(self) -> None:
        s = Rectangular("S", 0.30, 0.30)
        assert s.Iy == pytest.approx(s.Iz)

    def test_torsion_constant_matches_the_known_solid_square_value(self) -> None:
        """Dolu kare için tam çözüm J = 0.1406·a⁴ (Saint-Venant serisi).

        Kullandığımız kapalı yaklaşım %1'den iyi olmalı; değilse formül yanlış
        yazılmıştır.
        """
        a = 0.30
        assert pytest.approx(0.1406 * a**4, rel=0.01) == Rectangular("S", a, a).J

    def test_torsion_constant_is_below_the_polar_moment(self) -> None:
        """J daima I_p'den küçüktür — çarpılma (warping) nedeniyle. Fiziksel sınır."""
        for width, height in [(0.25, 0.5), (0.3, 0.3), (0.2, 1.0)]:
            s = Rectangular("R", width, height)
            assert 0.0 < s.J < s.Iy + s.Iz

    def test_torsion_is_symmetric_in_its_arguments(self) -> None:
        """Kesiti 90° döndürmek burulma sabitini değiştirmez."""
        assert pytest.approx(Rectangular("b", 0.5, 0.25).J) == Rectangular("a", 0.25, 0.5).J

    def test_scaling(self) -> None:
        small, big = Rectangular("s", 0.2, 0.4), Rectangular("b", 0.4, 0.8)
        assert big.area / small.area == pytest.approx(4.0)
        assert big.Iy / small.Iy == pytest.approx(16.0)

    @pytest.mark.parametrize(("width", "height"), [(0.0, 0.5), (0.25, 0.0), (-0.25, 0.5)])
    def test_non_positive_dimensions_are_rejected(self, width: float, height: float) -> None:
        with pytest.raises(ValueError, match=r"pozitif|positive"):
            Rectangular("bad", width, height)


class TestTSection:
    def test_satisfies_the_section_protocol(self) -> None:
        assert isinstance(TSection("T", 0.25, 0.5, 1.0, 0.12), Section)

    def test_area_is_the_sum_of_its_parts(self) -> None:
        t = TSection("T", web_width=0.25, height=0.50, flange_width=1.00, flange_thickness=0.12)
        assert t.area == pytest.approx(1.00 * 0.12 + 0.25 * 0.38)

    def test_centroid_lies_inside_the_section(self) -> None:
        t = TSection("T", 0.25, 0.50, 1.00, 0.12)
        assert 0.0 < t.centroid_from_top < t.height

    def test_wide_flange_pulls_the_centroid_up(self) -> None:
        """Tabla genişledikçe ağırlık merkezi üste yaklaşmalı."""
        narrow = TSection("n", 0.25, 0.50, 0.40, 0.12)
        wide = TSection("w", 0.25, 0.50, 1.50, 0.12)
        assert wide.centroid_from_top < narrow.centroid_from_top

    def test_degenerate_T_reduces_exactly_to_a_rectangle(self) -> None:
        """Tabla = gövde genişliği → T bir dikdörtgendir. Steiner'in bağımsız sınavı."""
        b, h = 0.30, 0.60
        rectangle = Rectangular("R", b, h)
        for flange_thickness in (0.05, 0.15, 0.30, 0.45):
            degenerate = TSection("T", b, h, b, flange_thickness)
            assert degenerate.area == pytest.approx(rectangle.area)
            assert degenerate.centroid_from_top == pytest.approx(h / 2.0)
            assert degenerate.Iy == pytest.approx(rectangle.Iy, rel=1e-12)
            assert degenerate.Iz == pytest.approx(rectangle.Iz, rel=1e-12)

    def test_flange_adds_stiffness_over_the_bare_web(self) -> None:
        web_only = Rectangular("web", 0.25, 0.50)
        with_flange = TSection("T", 0.25, 0.50, 1.00, 0.12)
        assert with_flange.Iy > web_only.Iy

    def test_open_section_torsion_is_far_softer_than_a_solid_block(self) -> None:
        """Açık kesitin burulma rijitliği, aynı alanı kaplayan dolu kesitten çok düşüktür."""
        t = TSection("T", 0.25, 0.50, 1.00, 0.12)
        solid = Rectangular("solid", 1.00, 0.50)
        assert t.J < 0.2 * solid.J

    def test_invalid_geometry_is_rejected(self) -> None:
        with pytest.raises(ValueError, match=r"pozitif|positive"):
            TSection("bad", 0.0, 0.5, 1.0, 0.1)
        with pytest.raises(ValueError, match=r"tabla kalınlığı|flange must be thinner"):
            TSection("bad", 0.25, 0.30, 1.0, 0.30)
        with pytest.raises(ValueError, match=r"tabla gövdeden|narrower than the web"):
            TSection("bad", 0.50, 0.60, 0.25, 0.10)
