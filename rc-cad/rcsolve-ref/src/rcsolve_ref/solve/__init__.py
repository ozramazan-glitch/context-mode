"""L4 — Çözücü / solver. **Faz 2-3'te doldurulacak.**

Bu modül şimdilik yalnızca **sözleşmeyi** tanımlar. İmzalar burada durur ki
kıyas testleri çözücüden önce yazılabilsin: testler ``xfail(strict=True)`` ile
işaretlidir, çözücü geldiğinde beklenmedik şekilde geçerler ve işaretin
kaldırılması zorunlu hâle gelir. Boşluk görünür kalır.

This module defines only the **contract** for now, so the benchmark tests can be
written before the solver exists. They are marked ``xfail(strict=True)``: when
the solver lands they pass unexpectedly, which fails the suite until the marker
is removed. The gap stays visible.

.. note::
   Bu katman **hiçbir yönetmelik bilmez.** Ham iç kuvvet üretir; TS 500 ya da
   Eurocode'a ait tek bir katsayı buraya girmemelidir (ADR-0003).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:  # pragma: no cover
    from ..model.structure import Model

__all__ = ["solve_linear_static", "solve_modal"]

_NOT_YET = (
    "Çözücü henüz uygulanmadı (Faz 2-3). Sözleşme tanımlı, gövde boş. / "
    "Solver not implemented yet (phase 2-3): the contract exists, the body does not."
)


def solve_linear_static(model: Model, /) -> Any:
    """Doğrusal statik çözüm: K·u = F.

    Args:
        model: Yönetmelikten bağımsız yapısal model.

    Returns:
        Düğüm yerdeğiştirmeleri, mesnet tepkileri ve eleman uç kuvvetleri.

    Raises:
        NotImplementedError: Her zaman — Faz 2'ye kadar.
    """
    raise NotImplementedError(_NOT_YET)


def solve_modal(model: Model, /, *, modes: int = 10) -> Any:
    """Modal analiz: (K - omega²·M)·phi = 0.

    Raises:
        NotImplementedError: Her zaman — Faz 3'e kadar.
    """
    raise NotImplementedError(_NOT_YET)
