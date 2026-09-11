"""Doğrulama kapısı — çözücü kapalı-form çözümlere uymalı.

**Bu testler bilerek başarısızdır.** Çözücü henüz yok (Faz 2-3).
``xfail(strict=True)`` seçildi: çözücü geldiğinde bu testler beklenmedik şekilde
geçer, bu da paketin kırılmasına yol açar ve işaretin kaldırılmasını zorunlu
kılar. Böylece boşluk sessizce unutulamaz.

**These tests fail on purpose.** The solver does not exist yet. ``strict=True``
means that once it does, they pass unexpectedly, the suite breaks, and the
marker must be removed — so the gap cannot be quietly forgotten.

Tolerans 1e-9: analitik çözüme karşı sonlu eleman çözümü, kiriş elemanı için
**tam** olmalıdır (şekil fonksiyonları kübik, çözüm de kübik). "Yakın" kabul
edilmez.
"""

from __future__ import annotations

import pytest

from rcsolve_ref.benchmarks import closed_form as cf
from rcsolve_ref.solve import solve_linear_static, solve_modal

TOLERANCE = 1e-9

pytestmark = pytest.mark.xfail(
    strict=True,
    raises=NotImplementedError,
    reason="Çözücü Faz 2-3'te uygulanacak / solver lands in phase 2-3",
)


def test_cantilever_point_load_matches_closed_form() -> None:
    expected = cf.cantilever_point_load(50e3, 3.0, 78.1e6)
    result = solve_linear_static(None)  # type: ignore[arg-type]
    assert result.tip_deflection == pytest.approx(expected.deflection, rel=TOLERANCE)


def test_simply_supported_udl_matches_closed_form() -> None:
    expected = cf.simply_supported_udl(20e3, 6.0, 78.1e6)
    result = solve_linear_static(None)  # type: ignore[arg-type]
    assert result.midspan_deflection == pytest.approx(expected.deflection, rel=TOLERANCE)
    assert result.midspan_moment == pytest.approx(expected.moment_max, rel=TOLERANCE)


def test_propped_cantilever_needs_correct_compatibility() -> None:
    """Hiperstatik: denge tek başına yetmez, uygunluk denklemleri de doğru olmalı."""
    expected = cf.propped_cantilever_udl(20e3, 6.0, 78.1e6)
    result = solve_linear_static(None)  # type: ignore[arg-type]
    assert result.fixed_end_moment == pytest.approx(expected.moment_left, rel=TOLERANCE)


def test_portal_sway_matches_closed_form() -> None:
    """Yanal ötelenme, rijitlik paralel toplamı ve dönme kısıtını birlikte sınar."""
    sway, moment = cf.rigid_beam_portal_sway(100e3, 3.5, 78.1e6)
    result = solve_linear_static(None)  # type: ignore[arg-type]
    assert result.roof_sway == pytest.approx(sway, rel=TOLERANCE)
    assert result.column_end_moment == pytest.approx(moment, rel=TOLERANCE)


def test_sdof_period_matches_closed_form() -> None:
    expected = cf.sdof_period(5000.0, 3.0 * 78.1e6 / 3.0**3)
    result = solve_modal(None, modes=1)  # type: ignore[arg-type]
    assert result.periods[0] == pytest.approx(expected, rel=TOLERANCE)
