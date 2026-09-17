import { useEffect, useRef, useState } from "react";
import { INGREDIENT_META, SONGPYEON_PATH, type Ingredient } from "../types";
import {
  createOutlineElement,
  formatTimer,
  samplePath,
  scoreDrawing,
} from "../lib/scoring";

type Props = {
  ingredient: Ingredient;
  onComplete: (payload: {
    accuracy: number;
    speed: number;
    total: number;
    timeMs: number;
  }) => void;
};

const VIEW_W = 300;
const VIEW_H = 240;

export function DrawingBoard({ ingredient, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const strokes = useRef<{ x: number; y: number }[]>([]);
  const outlinePts = useRef<{ x: number; y: number }[]>([]);
  const startAt = useRef<number | null>(null);
  const raf = useRef<number>(0);

  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const meta = INGREDIENT_META[ingredient];

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = Math.round((w * VIEW_H) / VIEW_W);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };

    const pathEl = createOutlineElement(SONGPYEON_PATH);
    const len = pathEl.getTotalLength();
    outlinePts.current = samplePath(pathEl, len, 3);

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredient]);

  useEffect(() => {
    if (!started) return;
    const tick = () => {
      if (startAt.current != null) {
        setElapsed(performance.now() - startAt.current);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [started]);

  function scalePoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((clientY - rect.top) / rect.height) * VIEW_H;
    return { x, y };
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const sx = w / VIEW_W;
    const sy = h / VIEW_H;

    ctx.clearRect(0, 0, w, h);

    // soft dough plate
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.5, w * 0.55);
    g.addColorStop(0, "rgba(255,248,230,0.18)");
    g.addColorStop(1, "rgba(255,248,230,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.scale(sx, sy);

    // outline
    const outline = new Path2D(SONGPYEON_PATH);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(232, 214, 170, 0.55)";
    ctx.setLineDash([6, 5]);
    ctx.stroke(outline);
    ctx.setLineDash([]);

    // filling hint
    ctx.fillStyle = meta.accent + "33";
    ctx.beginPath();
    ctx.ellipse(150, 125, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = meta.accent + "aa";
    ctx.font = "700 14px 'IBM Plex Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(meta.label, 150, 130);

    // user stroke
    if (strokes.current.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = meta.fill;
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 4;
      const pts = strokes.current;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!started) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = scalePoint(e.clientX, e.clientY);
    strokes.current.push(p);
    setPointCount(strokes.current.length);
    redraw();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!started || !drawing.current) return;
    const p = scalePoint(e.clientX, e.clientY);
    const last = strokes.current[strokes.current.length - 1];
    if (last && distanceFast(last, p) < 1.2) return;
    strokes.current.push(p);
    setPointCount(strokes.current.length);
    redraw();
  }

  function onPointerUp() {
    drawing.current = false;
  }

  function handleStart() {
    strokes.current = [];
    setPointCount(0);
    startAt.current = performance.now();
    setElapsed(0);
    setStarted(true);
    redraw();
  }

  function handleComplete() {
    if (!started || startAt.current == null) return;
    const timeMs = Math.max(1, Math.round(performance.now() - startAt.current));
    cancelAnimationFrame(raf.current);
    const scored = scoreDrawing(strokes.current, outlinePts.current, timeMs);
    onComplete(scored);
  }

  function handleClear() {
    if (!started) return;
    strokes.current = [];
    setPointCount(0);
    redraw();
  }

  return (
    <div className="draw-screen">
      <div className="draw-hint">
        {started
          ? "점선을 따라 송편 모양을 그려 주세요"
          : "준비가 되면 시작을 눌러 주세요"}
      </div>

      <div className="canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="draw-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {!started && (
          <div className="canvas-lock">
            <button type="button" className="btn primary pulse" onClick={handleStart}>
              시작
            </button>
          </div>
        )}
      </div>

      <div className="draw-dock">
        <div className="timer" aria-live="polite">
          {formatTimer(elapsed)}
        </div>
        <div className="draw-actions">
          <button
            type="button"
            className="btn ghost"
            disabled={!started}
            onClick={handleClear}
          >
            다시 그리기
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!started || pointCount < 8}
            onClick={handleComplete}
          >
            완성
          </button>
        </div>
      </div>
    </div>
  );
}

function distanceFast(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
