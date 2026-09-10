/* YapıCAD — geometri, yakalama (snap) ve seçim testi.
 * Tüm koordinatlar cm (bkz. core.js birim sözleşmesi).
 */
(function () {
  'use strict';
  const YC = (window.YC = window.YC || {});

  const EPS = 1e-9;

  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const len = (a) => Math.hypot(a.x, a.y);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  function norm(a) {
    const l = len(a);
    return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
  }

  /** Noktanın [a,b] parçası üzerindeki en yakın noktası. */
  function closestOnSegment(p, a, b) {
    const ab = sub(b, a);
    const l2 = dot(ab, ab);
    if (l2 < EPS) return { x: a.x, y: a.y, t: 0 };
    let t = dot(sub(p, a), ab) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return { x: a.x + ab.x * t, y: a.y + ab.y * t, t };
  }

  function distToSegment(p, a, b) {
    const c = closestOnSegment(p, a, b);
    return dist(p, c);
  }

  /** Ayakkabı bağı formülü — işaretli alan (cm²). */
  function polygonArea(pts) {
    let s = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      s += a.x * b.y - b.x * a.y;
    }
    return s / 2;
  }

  function polygonCentroid(pts) {
    const A = polygonArea(pts);
    if (Math.abs(A) < EPS) {
      const c = pts.reduce((m, p) => ({ x: m.x + p.x, y: m.y + p.y }), { x: 0, y: 0 });
      return { x: c.x / pts.length, y: c.y / pts.length };
    }
    let cx = 0, cy = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const f = a.x * b.y - b.x * a.y;
      cx += (a.x + b.x) * f; cy += (a.y + b.y) * f;
    }
    return { x: cx / (6 * A), y: cy / (6 * A) };
  }

  /** Işın atma yöntemi. */
  function pointInPolygon(p, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      const hit = (yi > p.y) !== (yj > p.y) &&
        p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + EPS) + xi;
      if (hit) inside = !inside;
    }
    return inside;
  }

  function rotate(p, c, deg) {
    const r = (deg * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
    const dx = p.x - c.x, dy = p.y - c.y;
    return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
  }

  /** Döndürülmüş dikdörtgenin 4 köşesi (merkez x,y — b: yerel X, h: yerel Y). */
  function rectCorners(x, y, b, h, rotDeg) {
    const hb = b / 2, hh = h / 2;
    const raw = [
      { x: x - hb, y: y - hh }, { x: x + hb, y: y - hh },
      { x: x + hb, y: y + hh }, { x: x - hb, y: y + hh },
    ];
    if (!rotDeg) return raw;
    return raw.map((p) => rotate(p, { x, y }, rotDeg));
  }

  /** Bir parçanın (kiriş/perde) kalınlıklı gövde köşeleri. */
  function bandCorners(x1, y1, x2, y2, w) {
    const d = norm({ x: x2 - x1, y: y2 - y1 });
    const n = { x: -d.y, y: d.x };
    const h = w / 2;
    return [
      { x: x1 + n.x * h, y: y1 + n.y * h },
      { x: x2 + n.x * h, y: y2 + n.y * h },
      { x: x2 - n.x * h, y: y2 - n.y * h },
      { x: x1 - n.x * h, y: y1 - n.y * h },
    ];
  }

  // ------------------------------------------------------------- eleman kutu
  /** Elemanın dünya sınır kutusu {minX,minY,maxX,maxY}. */
  function elementBounds(el) {
    let pts = [];
    if (el.type === 'column') {
      pts = el.shape === 'circle'
        ? [{ x: el.x - el.b / 2, y: el.y - el.b / 2 }, { x: el.x + el.b / 2, y: el.y + el.b / 2 }]
        : rectCorners(el.x, el.y, el.b, el.h, el.rot);
    } else if (el.type === 'beam') {
      pts = bandCorners(el.x1, el.y1, el.x2, el.y2, el.b);
    } else if (el.type === 'wall') {
      pts = bandCorners(el.x1, el.y1, el.x2, el.y2, el.t);
    } else if (el.type === 'slab') {
      pts = el.pts;
    }
    if (!pts.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  /** Elemanın "tutamak" noktaları — seçildiğinde gösterilen kareler. */
  function elementGrips(el) {
    if (el.type === 'column') return [{ x: el.x, y: el.y, k: 'c' }];
    if (el.type === 'beam' || el.type === 'wall') {
      return [
        { x: el.x1, y: el.y1, k: 'p1' },
        { x: el.x2, y: el.y2, k: 'p2' },
        { ...mid({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }), k: 'mid' },
      ];
    }
    if (el.type === 'slab') return el.pts.map((p, i) => ({ x: p.x, y: p.y, k: 'v' + i }));
    return [];
  }

  /** Nokta elemanın üstünde mi? tol: dünya birimi (cm) tolerans. */
  function hitElement(el, p, tol) {
    if (el.type === 'column') {
      if (el.shape === 'circle') return dist(p, { x: el.x, y: el.y }) <= el.b / 2 + tol;
      return pointInPolygon(p, rectCorners(el.x, el.y, el.b, el.h, el.rot)) ||
        distToSegment(p, { x: el.x, y: el.y }, { x: el.x, y: el.y }) <= tol;
    }
    if (el.type === 'beam')
      return distToSegment(p, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) <= el.b / 2 + tol;
    if (el.type === 'wall')
      return distToSegment(p, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) <= el.t / 2 + tol;
    if (el.type === 'slab') return pointInPolygon(p, el.pts);
    return false;
  }

  /** Seçim önceliği: küçük eleman büyüğün üstünde kalsın. */
  const PICK_ORDER = { column: 0, beam: 1, wall: 2, slab: 3 };

  function pickElement(story, p, tol) {
    let best = null, bestRank = Infinity;
    for (const el of story.elements) {
      if (!hitElement(el, p, tol)) continue;
      const r = PICK_ORDER[el.type] ?? 9;
      if (r < bestRank) { bestRank = r; best = el; }
    }
    return best;
  }

  function elementsInRect(story, r) {
    const out = [];
    for (const el of story.elements) {
      const b = elementBounds(el);
      if (!b) continue;
      if (b.minX >= r.minX && b.maxX <= r.maxX && b.minY >= r.minY && b.maxY <= r.maxY) out.push(el);
    }
    return out;
  }

  // ------------------------------------------------------------------- SNAP
  /**
   * Yakalama motoru.
   * @param {object} ctx {project, story, snaps, worldTol, base?} base: orto/ göreli için son nokta
   * @returns {{x,y,type,label}|null}
   */
  function snap(p, ctx) {
    const { project, story, snaps, worldTol } = ctx;
    const cands = [];

    const push = (x, y, type, label, prio) => cands.push({ x, y, type, label, prio });

    // 1) eleman uç noktaları / merkezleri
    if (snaps.end && story) {
      for (const el of story.elements) {
        if (el.type === 'column') push(el.x, el.y, 'end', 'Kolon merkezi', 0);
        else if (el.type === 'beam' || el.type === 'wall') {
          push(el.x1, el.y1, 'end', 'Uç nokta', 0);
          push(el.x2, el.y2, 'end', 'Uç nokta', 0);
        } else if (el.type === 'slab') {
          el.pts.forEach((v) => push(v.x, v.y, 'end', 'Köşe', 0));
        }
      }
    }

    // 2) aks kesişimleri
    if (snaps.axis) {
      for (const ax of project.axesX) {
        for (const ay of project.axesY) {
          push(ax.x, ay.y, 'axis', `Aks ${ax.name}-${ay.name}`, 1);
        }
      }
    }

    // 3) orta noktalar
    if (snaps.mid && story) {
      for (const el of story.elements) {
        if (el.type === 'beam' || el.type === 'wall') {
          const m = mid({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
          push(m.x, m.y, 'mid', 'Orta nokta', 2);
        } else if (el.type === 'slab') {
          for (let i = 0; i < el.pts.length; i++) {
            const m = mid(el.pts[i], el.pts[(i + 1) % el.pts.length]);
            push(m.x, m.y, 'mid', 'Kenar ortası', 2);
          }
        }
      }
    }

    // 4) aks çizgisi üzerine dik izdüşüm
    if (snaps.perp) {
      for (const ax of project.axesX) push(ax.x, p.y, 'perp', `Aks ${ax.name}`, 3);
      for (const ay of project.axesY) push(p.x, ay.y, 'perp', `Aks ${ay.name}`, 3);
      if (story) {
        for (const el of story.elements) {
          if (el.type === 'beam' || el.type === 'wall') {
            const c = closestOnSegment(p, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
            if (c.t > 0.02 && c.t < 0.98) push(c.x, c.y, 'perp', 'Eleman üzeri', 4);
          }
        }
      }
    }

    // 5) ızgara
    if (snaps.grid) {
      const g = project.settings.gridMinor || 50;
      push(Math.round(p.x / g) * g, Math.round(p.y / g) * g, 'grid', 'Izgara', 5);
    }

    let best = null, bestScore = Infinity;
    for (const c of cands) {
      const d = dist(p, c);
      if (d > worldTol) continue;
      const score = d + c.prio * worldTol * 0.15; // öncelik, mesafeye küçük ceza ekler
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  /** Orto kısıtı: base'e göre yatay/düşey/45° en yakınına kilitle. */
  function applyOrtho(p, base) {
    if (!base) return p;
    const dx = p.x - base.x, dy = p.y - base.y;
    if (Math.abs(dx) >= Math.abs(dy)) return { x: p.x, y: base.y };
    return { x: base.x, y: p.y };
  }

  YC.geom = {
    EPS, sub, add, mul, dot, len, dist, mid, norm,
    closestOnSegment, distToSegment, polygonArea, polygonCentroid, pointInPolygon,
    rotate, rectCorners, bandCorners,
    elementBounds, elementGrips, hitElement, pickElement, elementsInRect,
    snap, applyOrtho,
  };
})();
