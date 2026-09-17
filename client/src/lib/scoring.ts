import type { GameResult } from "../types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function distance(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

/** Sample points along an SVG path at roughly equal arc length. */
export function samplePath(path: Path2D | SVGPathElement, length: number, step = 4): { x: number; y: number }[] {
  if (!(path instanceof SVGPathElement)) {
    throw new Error("samplePath requires SVGPathElement");
  }
  const points: { x: number; y: number }[] = [];
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
  // Keep off-DOM; getTotalLength/getPointAtLength still work
  return path;
}

function minDistanceToOutline(
  x: number,
  y: number,
  outline: { x: number; y: number }[]
): number {
  let min = Infinity;
  for (const p of outline) {
    const dist = distance(x, y, p.x, p.y);
    if (dist < min) min = dist;
  }
  return min;
}

/**
 * Coverage: fraction of outline samples that have a stroke point within threshold.
 */
function coverageRatio(
  outline: { x: number; y: number }[],
  strokes: { x: number; y: number }[],
  threshold = 14
): number {
  if (outline.length === 0) return 0;
  let hit = 0;
  for (const o of outline) {
    let ok = false;
    for (const s of strokes) {
      if (distance(o.x, o.y, s.x, s.y) <= threshold) {
        ok = true;
        break;
      }
    }
    if (ok) hit += 1;
  }
  return hit / outline.length;
}

export function computeAccuracy(
  strokePoints: { x: number; y: number }[],
  outlinePoints: { x: number; y: number }[]
): number {
  if (strokePoints.length < 8 || outlinePoints.length === 0) {
    return 0;
  }

  // Sample stroke sparsely for speed
  const sampled =
    strokePoints.length > 400
      ? strokePoints.filter((_, i) => i % Math.ceil(strokePoints.length / 400) === 0)
      : strokePoints;

  let sum = 0;
  for (const p of sampled) {
    sum += minDistanceToOutline(p.x, p.y, outlinePoints);
  }
  const avgDist = sum / sampled.length;
  let accuracy = clamp(100 - avgDist * 2.5, 0, 100);

  const coverage = coverageRatio(outlinePoints, sampled, 14);
  if (coverage < 0.6) {
    const penalty = (0.6 - coverage) * 80;
    accuracy = clamp(accuracy - penalty, 0, 100);
  }

  return Math.round(accuracy * 10) / 10;
}

export function computeSpeed(timeMs: number): number {
  const t = timeMs / 1000;
  return clamp(100 - Math.max(0, t - 8) * 4, 0, 100);
}

export function computeTotal(accuracy: number, speed: number): number {
  return Math.round(accuracy * 0.7 + speed * 0.3);
}

export function scoreDrawing(
  strokePoints: { x: number; y: number }[],
  outlinePoints: { x: number; y: number }[],
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
