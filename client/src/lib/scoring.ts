import type { GameResult } from "../types";

export type Point = { x: number; y: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatScore(n: number) {
  return round2(n).toFixed(2);
}

export function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

/** Sample points along an SVG path at roughly equal arc length. */
export function samplePath(path: SVGPathElement, length: number, step = 2): Point[] {
  const points: Point[] = [];
  for (let d = 0; d <= length; d += step) {
    const p = path.getPointAtLength(d);
    points.push({ x: p.x, y: p.y });
  }
  return points;
}

export function createOutlineElement(d: string): SVGPathElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  return path;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return distance(px, py, ax, ay);
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
  return distance(px, py, ax + abx * t, ay + aby * t);
}

/** Minimum distance from a point to a closed/open polyline. */
function minDistToPolyline(x: number, y: number, poly: Point[]): number {
  if (poly.length === 0) return Infinity;
  if (poly.length === 1) return distance(x, y, poly[0].x, poly[0].y);
  let min = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const d = distToSegment(x, y, a.x, a.y, b.x, b.y);
    if (d < min) min = d;
  }
  return min;
}

function polylineLength(poly: Point[]): number {
  let len = 0;
  for (let i = 1; i < poly.length; i++) {
    len += distance(poly[i - 1].x, poly[i - 1].y, poly[i].x, poly[i].y);
  }
  return len;
}

function downsample(points: Point[], maxPoints: number): Point[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: Point[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.min(points.length - 1, Math.floor(i * step))]);
  }
  return out;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

function rms(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v * v;
  return Math.sqrt(s / values.length);
}

/**
 * Accuracy 0–1000 (2 decimals).
 * Combines:
 * - stroke→outline fit (RMS + mean, continuous)
 * - outline→stroke coverage (soft exponential, not binary)
 * - path length similarity
 */
export function computeAccuracy(strokePoints: Point[], outlinePoints: Point[]): number {
  if (strokePoints.length < 8 || outlinePoints.length < 2) {
    return 0;
  }

  const strokes = downsample(strokePoints, 600);
  const outline = outlinePoints;

  const strokeDists = strokes.map((p) => minDistToPolyline(p.x, p.y, outline));
  const outlineDists = outline.map((p) => minDistToPolyline(p.x, p.y, strokes));

  const strokeMean = mean(strokeDists);
  const strokeRms = rms(strokeDists);
  const outlineMean = mean(outlineDists);

  // Soft fit scores in [0, 1] — small distance differences keep spreading scores
  const fitMean = Math.exp(-strokeMean / 3.2);
  const fitRms = Math.exp(-strokeRms / 3.8);
  const fit = 0.55 * fitMean + 0.45 * fitRms;

  // Continuous coverage: each outline sample contributes exp(-d/σ)
  const coverage =
    outlineDists.reduce((acc, d) => acc + Math.exp(-d / 5.5), 0) / outlineDists.length;

  const strokeLen = polylineLength(strokes);
  const outlineLen = polylineLength(outline);
  const lengthRatio =
    strokeLen <= 0 || outlineLen <= 0
      ? 0
      : clamp(Math.min(strokeLen / outlineLen, outlineLen / strokeLen), 0, 1);

  // Mild penalty if drawing is much shorter/longer than outline
  const lengthScore = Math.pow(lengthRatio, 0.65);

  // Extra penalty when average outline miss is large (skipped sections)
  const gapPenalty = clamp(1 - outlineMean / 28, 0, 1);

  const combined = clamp(
    0.5 * fit + 0.32 * coverage + 0.12 * lengthScore + 0.06 * gapPenalty,
    0,
    1
  );

  return round2(combined * 1000);
}

/**
 * Speed 0–1000 (2 decimals).
 * Continuous with millisecond precision: ~25s → 0.
 */
export function computeSpeed(timeMs: number): number {
  const t = Math.max(0, timeMs);
  return round2(clamp(1000 - t * 0.04, 0, 1000));
}

/** Total 0–1000 (2 decimals): accuracy 70% + speed 30%. */
export function computeTotal(accuracy: number, speed: number): number {
  return round2(accuracy * 0.7 + speed * 0.3);
}

export function scoreDrawing(
  strokePoints: Point[],
  outlinePoints: Point[],
  timeMs: number
): Pick<GameResult, "accuracy" | "speed" | "total" | "timeMs"> {
  const accuracy = computeAccuracy(strokePoints, outlinePoints);
  const speed = computeSpeed(timeMs);
  const total = computeTotal(accuracy, speed);
  return { accuracy, speed, total, timeMs };
}

export function formatTimer(ms: number): string {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
