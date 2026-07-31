export type ColorMode =
  | "rainbow"
  | "spectrum"
  | "neon"
  | "pastel"
  | "fire"
  | "ice"
  | "aurora"
  | "mono";

export interface KaleidoscopeSettings {
  segments: number;
  colorMode: ColorMode;
  brushSize: number;
  trail: number;
  mirror: boolean;
  glow: boolean;
  frozen: boolean;
  hueShift: number;
  monoHue: number;
  /** Fixed symmetry-axis angle in degrees (0–360). */
  axisAngle: number;
  /** Continuous axis spin speed in degrees per second (0 = fixed). */
  axisSpin: number;
}

export const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: "rainbow", label: "Rainbow" },
  { id: "spectrum", label: "Spectrum" },
  { id: "neon", label: "Neon" },
  { id: "pastel", label: "Pastel" },
  { id: "fire", label: "Fire" },
  { id: "ice", label: "Ice" },
  { id: "aurora", label: "Aurora" },
  { id: "mono", label: "Mono" },
];

export const DEFAULT_SETTINGS: KaleidoscopeSettings = {
  segments: 8,
  colorMode: "rainbow",
  brushSize: 20,
  trail: 0.35,
  mirror: true,
  glow: true,
  frozen: false,
  hueShift: 0,
  monoHue: 200,
  axisAngle: 0,
  axisSpin: 0,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hsla(h: number, s: number, l: number, a = 1) {
  return `hsla(${((h % 360) + 360) % 360} ${s}% ${l}% / ${a})`;
}

export function colorForPoint(
  settings: KaleidoscopeSettings,
  opts: {
    angle: number;
    radius: number;
    speed: number;
    pathLen: number;
    time: number;
  },
): { h: number; s: number; l: number; a: number } {
  const { colorMode, hueShift, monoHue } = settings;
  const { angle, radius, speed, pathLen, time } = opts;
  const deg = (angle * 180) / Math.PI;
  const t = time * 0.001;

  switch (colorMode) {
    case "rainbow":
      return {
        h: deg * 2 + radius * 0.15 + hueShift + t * 20,
        s: 85,
        l: 58,
        a: 0.9,
      };
    case "spectrum":
      return {
        h: pathLen * 0.4 + hueShift + t * 12,
        s: 90,
        l: 55,
        a: 0.92,
      };
    case "neon":
      return {
        h: deg + speed * 8 + hueShift + t * 30,
        s: 100,
        l: 62,
        a: 0.95,
      };
    case "pastel":
      return {
        h: deg + pathLen * 0.15 + hueShift,
        s: 55,
        l: 72,
        a: 0.78,
      };
    case "fire": {
      const heat = clamp(speed * 12 + 20, 15, 70);
      return { h: heat + hueShift * 0.05, s: 95, l: 52 + heat * 0.12, a: 0.9 };
    }
    case "ice":
      return {
        h: 185 + deg * 0.15 + speed * 2 + hueShift * 0.1,
        s: 70,
        l: 68,
        a: 0.85,
      };
    case "aurora": {
      const base = 140 + Math.sin(t * 0.8 + radius * 0.01) * 50;
      return { h: base + deg * 0.3 + hueShift, s: 80, l: 55, a: 0.88 };
    }
    case "mono":
    default:
      return {
        h: monoHue + hueShift * 0.05,
        s: 35,
        l: 48 + (radius % 40) * 0.35,
        a: 0.8,
      };
  }
}

export function randomizeSettings(
  prev: KaleidoscopeSettings,
): KaleidoscopeSettings {
  const modes = COLOR_MODES.map((m) => m.id);
  const mode = modes[Math.floor(Math.random() * modes.length)]!;
  const segments = [4, 5, 6, 7, 8, 10, 12, 14, 16][
    Math.floor(Math.random() * 9)
  ]!;
  return {
    ...prev,
    segments,
    colorMode: mode,
    brushSize: 10 + Math.random() * 32,
    trail: 0.15 + Math.random() * 0.55,
    mirror: Math.random() > 0.25,
    glow: Math.random() > 0.3,
    hueShift: Math.random() * 360,
    monoHue: Math.random() * 360,
    axisAngle: Math.random() * 360,
    axisSpin: Math.random() > 0.55 ? 4 + Math.random() * 28 : 0,
    frozen: false,
  };
}

export class KaleidoscopeEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  settings: KaleidoscopeSettings;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private cx = 0;
  private cy = 0;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  private pathLen = 0;
  private lastTime = 0;
  private lastSpeed = 0;
  private raf = 0;
  private autoHue = 0;
  private hasContent = false;
  private prevFrame = 0;
  /** Accumulated continuous spin in degrees (added to axisAngle). */
  private spinAccum = 0;
  private onChange?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    settings: KaleidoscopeSettings,
    onChange?: () => void,
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.settings = { ...settings };
    this.onChange = onChange;
  }

  mount() {
    this.resize();
    this.clear();
    this.bind();
    this.prevFrame = performance.now();
    this.loop(this.prevFrame);
  }

  unmount() {
    cancelAnimationFrame(this.raf);
    this.unbind();
  }

  setSettings(partial: Partial<KaleidoscopeSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.onChange?.();
  }

  getSettings() {
    return this.settings;
  }

  /** Effective axis rotation in radians (fixed angle + live spin). */
  getEffectiveAxisRad() {
    const deg =
      (((this.settings.axisAngle + this.spinAccum) % 360) + 360) % 360;
    return (deg * Math.PI) / 180;
  }

  resize = () => {
    const parent = this.canvas.parentElement ?? document.body;
    const rect = parent.getBoundingClientRect();
    const nextW = Math.max(1, Math.floor(rect.width));
    const nextH = Math.max(1, Math.floor(rect.height));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

    let snapshot: ImageData | null = null;
    if (this.w > 0 && this.h > 0 && this.hasContent) {
      try {
        snapshot = this.ctx.getImageData(
          0,
          0,
          this.canvas.width,
          this.canvas.height,
        );
      } catch {
        snapshot = null;
      }
    }

    this.dpr = nextDpr;
    this.w = nextW;
    this.h = nextH;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cx = this.w / 2;
    this.cy = this.h / 2;

    this.ctx.fillStyle = "#070708";
    this.ctx.fillRect(0, 0, this.w, this.h);

    if (snapshot) {
      const off = document.createElement("canvas");
      off.width = snapshot.width;
      off.height = snapshot.height;
      const octx = off.getContext("2d");
      if (octx) {
        octx.putImageData(snapshot, 0, 0);
        this.ctx.drawImage(off, 0, 0, this.w, this.h);
        this.hasContent = true;
      }
    }
  };

  clear() {
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#070708";
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.restore();
    this.hasContent = false;
    this.pathLen = 0;
  }

  exportPng(): string {
    return this.canvas.toDataURL("image/png");
  }

  private bind() {
    window.addEventListener("resize", this.resize);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
  }

  private unbind() {
    window.removeEventListener("resize", this.resize);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  private pointerPos(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.settings.frozen) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / already captured */
    }
    this.drawing = true;
    const { x, y } = this.pointerPos(e);
    this.lastX = x;
    this.lastY = y;
    this.lastTime = performance.now();
    this.lastSpeed = 0;
    this.stampLine(x, y, x, y, 0);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.drawing || this.settings.frozen) return;
    e.preventDefault();
    const { x, y } = this.pointerPos(e);
    const now = performance.now();
    const dt = Math.max(1, now - this.lastTime);
    const dist = Math.hypot(x - this.lastX, y - this.lastY);
    const speed = dist / dt;
    this.stampLine(this.lastX, this.lastY, x, y, speed);
    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
    this.lastSpeed = speed;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.drawing) return;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    this.drawing = false;
  };

  private stampLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    speed: number,
  ) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(1.2, this.settings.brushSize * 0.16);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.stamp(x, y, speed);
      this.pathLen += step;
    }
  }

  private stamp(px: number, py: number, speed: number) {
    const dx = px - this.cx;
    const dy = py - this.cy;
    const radius = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const time = performance.now();
    const c = colorForPoint(this.settings, {
      angle,
      radius,
      speed: speed || this.lastSpeed,
      pathLen: this.pathLen,
      time: time + this.autoHue * 1000,
    });

    const size =
      this.settings.brushSize *
      (0.85 + Math.min(1.4, (speed || this.lastSpeed) * 3.5) * 0.4);

    const points = this.symmetryPoints(dx, dy);
    const ctx = this.ctx;
    ctx.save();
    if (this.settings.glow || this.settings.colorMode === "neon") {
      ctx.globalCompositeOperation = "lighter";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    for (const p of points) {
      const x = this.cx + p.x;
      const y = this.cy + p.y;
      const g = ctx.createRadialGradient(x, y, 0, x, y, size);
      g.addColorStop(0, hsla(c.h, c.s, Math.min(78, c.l + 8), c.a));
      g.addColorStop(0.4, hsla(c.h, c.s, c.l, c.a * 0.45));
      g.addColorStop(1, hsla(c.h, c.s, c.l, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    this.hasContent = true;
  }

  /**
   * Dihedral / rotational symmetry with rotatable axes.
   * Input is rotated into the axis frame, mirrored, then rotated back.
   */
  private symmetryPoints(dx: number, dy: number): { x: number; y: number }[] {
    const segs = Math.max(2, Math.floor(this.settings.segments));
    const slice = (Math.PI * 2) / segs;
    const out: { x: number; y: number }[] = [];
    const r = Math.hypot(dx, dy);

    const axis = this.getEffectiveAxisRad();
    // Rotate into axis frame
    const cos = Math.cos(-axis);
    const sin = Math.sin(-axis);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const a0 = Math.atan2(ly, lx);

    const cosB = Math.cos(axis);
    const sinB = Math.sin(axis);

    const pushWorld = (localAngle: number) => {
      const wx = Math.cos(localAngle) * r;
      const wy = Math.sin(localAngle) * r;
      // Rotate back to world
      out.push({
        x: wx * cosB - wy * sinB,
        y: wx * sinB + wy * cosB,
      });
    };

    if (this.settings.mirror) {
      for (let i = 0; i < segs; i++) {
        const base = i * slice;
        pushWorld(base + a0);
        pushWorld(base - a0);
      }
    } else {
      for (let i = 0; i < segs; i++) {
        pushWorld(a0 + i * slice);
      }
    }
    return out;
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.prevFrame) / 1000);
    this.prevFrame = now;

    if (this.settings.frozen) return;

    // Continuous symmetry-axis spin
    if (this.settings.axisSpin !== 0) {
      this.spinAccum =
        (this.spinAccum + this.settings.axisSpin * dt) % 360;
    }

    // trail: 0 = permanent, 1 = short-lived
    const trail = this.settings.trail;
    if (trail > 0.001 && this.hasContent && !this.drawing) {
      const fadePerSec = 0.15 + trail * 1.4;
      const alpha = 1 - Math.exp(-fadePerSec * dt);
      this.ctx.save();
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.fillStyle = `rgba(7, 7, 8, ${clamp(alpha, 0, 0.45)})`;
      this.ctx.fillRect(0, 0, this.w, this.h);
      this.ctx.restore();
    }

    this.autoHue += dt;
  };
}
