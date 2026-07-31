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
  axisAngle: number;
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

export type DemoPath = "spiral" | "burst" | "orbit" | "ribbon" | "web";

export interface SeedLook {
  id: string;
  name: string;
  blurb: string;
  settings: KaleidoscopeSettings;
  demo: DemoPath;
}

export const SEED_LOOKS: SeedLook[] = [
  {
    id: "prism",
    name: "Prism",
    blurb: "Classic rainbow folds",
    settings: {
      ...DEFAULT_SETTINGS,
      segments: 8,
      colorMode: "rainbow",
      brushSize: 22,
      trail: 0.08,
      mirror: true,
      glow: true,
      hueShift: 40,
      axisSpin: 0,
      axisAngle: 0,
      frozen: false,
    },
    demo: "spiral",
  },
  {
    id: "venom",
    name: "Venom",
    blurb: "Neon red spin",
    settings: {
      ...DEFAULT_SETTINGS,
      segments: 6,
      colorMode: "neon",
      brushSize: 18,
      trail: 0.22,
      mirror: true,
      glow: true,
      hueShift: 330,
      monoHue: 0,
      axisSpin: 18,
      axisAngle: 12,
      frozen: false,
    },
    demo: "web",
  },
  {
    id: "forge",
    name: "Forge",
    blurb: "Hot fire bloom",
    settings: {
      ...DEFAULT_SETTINGS,
      segments: 10,
      colorMode: "fire",
      brushSize: 28,
      trail: 0.4,
      mirror: true,
      glow: true,
      hueShift: 0,
      axisSpin: 6,
      axisAngle: 0,
      frozen: false,
    },
    demo: "burst",
  },
  {
    id: "glacier",
    name: "Glacier",
    blurb: "Cool ice trails",
    settings: {
      ...DEFAULT_SETTINGS,
      segments: 12,
      colorMode: "ice",
      brushSize: 16,
      trail: 0.28,
      mirror: true,
      glow: true,
      hueShift: 20,
      axisSpin: 0,
      axisAngle: 15,
      frozen: false,
    },
    demo: "orbit",
  },
  {
    id: "aurora",
    name: "Aurora",
    blurb: "Northern glow",
    settings: {
      ...DEFAULT_SETTINGS,
      segments: 7,
      colorMode: "aurora",
      brushSize: 24,
      trail: 0.18,
      mirror: true,
      glow: true,
      hueShift: 80,
      axisSpin: 10,
      axisAngle: 0,
      frozen: false,
    },
    demo: "ribbon",
  },
  {
    id: "chrome",
    name: "Chrome",
    blurb: "Mono steel",
    settings: {
      ...DEFAULT_SETTINGS,
      segments: 8,
      colorMode: "mono",
      brushSize: 20,
      trail: 0.12,
      mirror: true,
      glow: false,
      hueShift: 0,
      monoHue: 210,
      axisSpin: 0,
      axisAngle: 0,
      frozen: false,
    },
    demo: "spiral",
  },
];

export interface UserPreset {
  id: string;
  name: string;
  settings: KaleidoscopeSettings;
  createdAt: number;
}

const PRESET_KEY = "wsv-kaleidoscope-presets-v1";
const MAX_PRESETS = 12;
const MAX_UNDO = 16;

export function loadPresets(): UserPreset[] {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserPreset[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PRESETS) : [];
  } catch {
    return [];
  }
}

export function savePresets(list: UserPreset[]) {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(list.slice(0, MAX_PRESETS)));
  } catch {
    /* quota / private mode */
  }
}

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
      return { h: heat + hueShift * 0.05, s: 95, l: 52 + speed * 0.12, a: 0.9 };
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

/** GPU-friendly canvas snapshot (no getImageData CPU readback). */
type Snapshot = {
  canvas: HTMLCanvasElement;
  hasContent: boolean;
  pathLen: number;
  spinAccum: number;
  w: number;
  h: number;
};

export type EngineNotify = {
  canUndo?: boolean;
  settings?: KaleidoscopeSettings;
};

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
  private spinAccum = 0;
  private onNotify?: (n: EngineNotify) => void;
  private history: Snapshot[] = [];
  private strokeOpen = false;
  private demoAbort = false;
  private demoTimer = 0;

  // Cached geometry for current stroke / frame
  private rectLeft = 0;
  private rectTop = 0;
  private axisCos = 1;
  private axisSin = 0;
  private axisCosInv = 1;
  private axisSinInv = 0;
  private axisCacheDeg = Number.NaN;
  private resizeTimer = 0;
  private trailAcc = 0;
  private needsComposite = false;
  private glowMode = true;

  constructor(
    canvas: HTMLCanvasElement,
    settings: KaleidoscopeSettings,
    onNotify?: (n: EngineNotify) => void,
  ) {
    this.canvas = canvas;
    // Prefer drawing speed; undo uses canvas copies, not getImageData
    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.settings = { ...settings };
    this.onNotify = onNotify;
    this.glowMode = settings.glow || settings.colorMode === "neon";
  }

  mount() {
    this.resizeNow();
    this.clear(false);
    this.bind();
    this.prevFrame = performance.now();
    this.loop(this.prevFrame);
  }

  unmount() {
    cancelAnimationFrame(this.raf);
    if (this.resizeTimer) window.clearTimeout(this.resizeTimer);
    this.cancelDemo();
    this.unbind();
    this.history = [];
  }

  setSettings(partial: Partial<KaleidoscopeSettings>, notify = false) {
    this.settings = { ...this.settings, ...partial };
    this.glowMode = this.settings.glow || this.settings.colorMode === "neon";
    // Axis cache invalidates on angle change; spin updates every frame
    if (partial.axisAngle !== undefined) this.axisCacheDeg = Number.NaN;
    if (notify) {
      this.onNotify?.({ settings: this.settings, canUndo: this.canUndo() });
    }
  }

  getSettings() {
    return this.settings;
  }

  canUndo() {
    return this.history.length > 0;
  }

  getEffectiveAxisRad() {
    const deg =
      (((this.settings.axisAngle + this.spinAccum) % 360) + 360) % 360;
    return (deg * Math.PI) / 180;
  }

  getEffectiveAxisDeg() {
    return (((this.settings.axisAngle + this.spinAccum) % 360) + 360) % 360;
  }

  private updateAxisCache() {
    const deg = this.getEffectiveAxisDeg();
    // Recompute only when angle moved ~0.15°
    if (Math.abs(deg - this.axisCacheDeg) < 0.15) return;
    this.axisCacheDeg = deg;
    const axis = (deg * Math.PI) / 180;
    this.axisCos = Math.cos(axis);
    this.axisSin = Math.sin(axis);
    this.axisCosInv = Math.cos(-axis);
    this.axisSinInv = Math.sin(-axis);
  }

  private resize = () => {
    // Debounce layout thrash on mobile chrome / panel open
    if (this.resizeTimer) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.resizeTimer = 0;
      this.resizeNow();
    }, 80);
  };

  private resizeNow = () => {
    const parent = this.canvas.parentElement ?? document.body;
    const rect = parent.getBoundingClientRect();
    const nextW = Math.max(1, Math.floor(rect.width));
    const nextH = Math.max(1, Math.floor(rect.height));
    // Cap DPR on large screens for fill-rate; keep 2 on small/retina
    const area = nextW * nextH;
    const dprCap = area > 1_400_000 ? 1.5 : 2;
    const nextDpr = Math.min(window.devicePixelRatio || 1, dprCap);

    if (
      nextW === this.w &&
      nextH === this.h &&
      Math.abs(nextDpr - this.dpr) < 0.01
    ) {
      return;
    }

    // Preserve via drawImage (no CPU readback)
    let keep: HTMLCanvasElement | null = null;
    if (this.w > 0 && this.h > 0 && this.hasContent) {
      keep = document.createElement("canvas");
      keep.width = this.canvas.width;
      keep.height = this.canvas.height;
      const kctx = keep.getContext("2d");
      if (kctx) kctx.drawImage(this.canvas, 0, 0);
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

    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#070708";
    this.ctx.fillRect(0, 0, this.w, this.h);

    if (keep) {
      this.ctx.drawImage(keep, 0, 0, this.w, this.h);
      this.hasContent = true;
    }

    this.history = [];
    this.axisCacheDeg = Number.NaN;
    this.cacheRect();
    this.onNotify?.({ canUndo: false });
  };

  private cacheRect() {
    const rect = this.canvas.getBoundingClientRect();
    this.rectLeft = rect.left;
    this.rectTop = rect.top;
  }

  private captureSnapshot(): Snapshot | null {
    if (this.w < 1 || this.h < 1) return null;
    try {
      const off = document.createElement("canvas");
      off.width = this.canvas.width;
      off.height = this.canvas.height;
      const octx = off.getContext("2d");
      if (!octx) return null;
      octx.drawImage(this.canvas, 0, 0);
      return {
        canvas: off,
        hasContent: this.hasContent,
        pathLen: this.pathLen,
        spinAccum: this.spinAccum,
        w: this.w,
        h: this.h,
      };
    } catch {
      return null;
    }
  }

  private restoreSnapshot(snap: Snapshot) {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#070708";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(
      snap.canvas,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.ctx.restore();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.hasContent = snap.hasContent;
    this.pathLen = snap.pathLen;
    this.spinAccum = snap.spinAccum;
    this.axisCacheDeg = Number.NaN;
  }

  pushHistory() {
    const snap = this.captureSnapshot();
    if (!snap) return;
    this.history.push(snap);
    while (this.history.length > MAX_UNDO) {
      this.history.shift();
    }
    this.onNotify?.({ canUndo: true });
  }

  undo(): boolean {
    this.cancelDemo();
    const snap = this.history.pop();
    if (!snap) return false;
    this.restoreSnapshot(snap);
    this.drawing = false;
    this.strokeOpen = false;
    this.onNotify?.({ canUndo: this.canUndo() });
    return true;
  }

  clear(recordHistory = true) {
    this.cancelDemo();
    if (recordHistory && this.hasContent) this.pushHistory();
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#070708";
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.restore();
    this.hasContent = false;
    this.pathLen = 0;
    this.onNotify?.({ canUndo: this.canUndo() });
  }

  exportPng(): string {
    return this.canvas.toDataURL("image/png");
  }

  cancelDemo() {
    this.demoAbort = true;
    if (this.demoTimer) {
      cancelAnimationFrame(this.demoTimer);
      this.demoTimer = 0;
    }
  }

  async playSeed(seed: SeedLook): Promise<void> {
    this.cancelDemo();
    this.demoAbort = false;
    this.settings = { ...seed.settings, frozen: false };
    this.glowMode = this.settings.glow || this.settings.colorMode === "neon";
    this.spinAccum = 0;
    this.axisCacheDeg = Number.NaN;
    this.clear(true);
    this.onNotify?.({ settings: this.settings, canUndo: this.canUndo() });

    const maxR = Math.min(this.w, this.h) * 0.38;
    const points = this.buildDemoPath(seed.demo, maxR);
    if (points.length < 2) return;

    const duration = 1400;
    const start = performance.now();
    let lastIdx = 0;

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        if (this.demoAbort) {
          resolve();
          return;
        }
        const t = clamp((now - start) / duration, 0, 1);
        const e = 1 - (1 - t) * (1 - t) * (1 - t);
        const idx = Math.min(
          points.length - 1,
          Math.floor(e * (points.length - 1)),
        );
        while (lastIdx < idx) {
          const a = points[lastIdx]!;
          const b = points[lastIdx + 1]!;
          const speed = Math.hypot(b.x - a.x, b.y - a.y) / 8;
          this.stampLine(a.x, a.y, b.x, b.y, speed);
          lastIdx++;
        }
        if (t < 1) {
          this.demoTimer = requestAnimationFrame(step);
        } else {
          this.demoTimer = 0;
          resolve();
        }
      };
      this.demoTimer = requestAnimationFrame(step);
    });
  }

  private buildDemoPath(
    kind: DemoPath,
    maxR: number,
  ): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    const cx = this.cx;
    const cy = this.cy;
    const n = 72; // slightly fewer demo samples

    if (kind === "spiral") {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const ang = t * Math.PI * 4.5;
        const r = maxR * (0.08 + t * 0.92);
        pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
      }
    } else if (kind === "burst") {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const ang = -Math.PI * 0.65 + t * Math.PI * 1.3;
        const r = maxR * (0.15 + Math.sin(t * Math.PI) * 0.85);
        pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
      }
    } else if (kind === "orbit") {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const ang = t * Math.PI * 2;
        const r = maxR * (0.55 + 0.2 * Math.sin(t * Math.PI * 4));
        pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
      }
    } else if (kind === "ribbon") {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push({
          x: cx + (t - 0.5) * maxR * 1.7,
          y: cy + Math.sin(t * Math.PI * 3) * maxR * 0.45,
        });
      }
    } else {
      for (let s = 0; s < 5; s++) {
        const ang = (s / 5) * Math.PI * 2 - Math.PI / 2;
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          const r = maxR * 0.12 + t * maxR * 0.88;
          pts.push({
            x: cx + Math.cos(ang) * r,
            y: cy + Math.sin(ang) * r,
          });
        }
      }
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        const ang = t * Math.PI * 2;
        const r = maxR * 0.72;
        pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r });
      }
    }
    return pts;
  }

  private bind() {
    window.addEventListener("resize", this.resize, { passive: true });
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove, {
      passive: false,
    });
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
    return {
      x: e.clientX - this.rectLeft,
      y: e.clientY - this.rectTop,
    };
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.settings.frozen) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    this.cancelDemo();
    this.cacheRect();
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* already captured */
    }
    if (!this.strokeOpen) {
      this.pushHistory();
      this.strokeOpen = true;
    }
    this.drawing = true;
    this.updateAxisCache();
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
    // Skip micro-moves (touch jitter) — big win on mobile
    if (dist < 0.6) return;
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
    this.strokeOpen = false;
    this.onNotify?.({ canUndo: this.canUndo() });
  };

  private stampLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    speed: number,
  ) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    // Adaptive step: denser when slow/small brush, sparser when fast
    const brush = this.settings.brushSize;
    const speedBoost = Math.min(2.2, 1 + speed * 2.5);
    const step = Math.max(1.6, brush * 0.22 * speedBoost);
    const n = Math.max(1, Math.ceil(dist / step));
    // Cap stamps per move event to avoid spiral-of-death on large jumps
    const maxStamps = 28;
    const stride = n > maxStamps ? n / maxStamps : 1;

    this.updateAxisCache();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = this.glowMode ? "lighter" : "source-over";

    for (let i = 0; i <= n; i += stride) {
      const t = Math.min(1, i / n);
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.stampInto(ctx, x, y, speed);
      this.pathLen += step * (stride > 1 ? stride : 1);
    }
    ctx.restore();
    this.hasContent = true;
  }

  private stampInto(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    speed: number,
  ) {
    const dx = px - this.cx;
    const dy = py - this.cy;
    const radius = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const c = colorForPoint(this.settings, {
      angle,
      radius,
      speed: speed || this.lastSpeed,
      pathLen: this.pathLen,
      time: performance.now() + this.autoHue * 1000,
    });

    const size =
      this.settings.brushSize *
      (0.85 + Math.min(1.4, (speed || this.lastSpeed) * 3.5) * 0.4);

    // Rotate into axis frame once
    const lx = dx * this.axisCosInv - dy * this.axisSinInv;
    const ly = dx * this.axisSinInv + dy * this.axisCosInv;
    const a0 = Math.atan2(ly, lx);
    const r = radius;
    const segs = Math.max(2, Math.floor(this.settings.segments));
    const slice = (Math.PI * 2) / segs;
    const cosB = this.axisCos;
    const sinB = this.axisSin;
    const mirror = this.settings.mirror;

    // Soft disc without createRadialGradient (much cheaper)
    const core = hsla(c.h, c.s, Math.min(78, c.l + 8), c.a * 0.85);
    const mid = hsla(c.h, c.s, c.l, c.a * 0.28);

    const drawAt = (localAngle: number) => {
      const wx = Math.cos(localAngle) * r;
      const wy = Math.sin(localAngle) * r;
      const x = this.cx + wx * cosB - wy * sinB;
      const y = this.cy + wx * sinB + wy * cosB;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      if (this.glowMode) {
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (mirror) {
      for (let i = 0; i < segs; i++) {
        const base = i * slice;
        drawAt(base + a0);
        drawAt(base - a0);
      }
    } else {
      for (let i = 0; i < segs; i++) {
        drawAt(a0 + i * slice);
      }
    }
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.prevFrame) / 1000);
    this.prevFrame = now;

    const s = this.settings;
    if (s.frozen) {
      // Still advance hue clock lightly for when unfrozen
      this.autoHue += dt * 0.2;
      return;
    }

    let work = false;

    if (s.axisSpin !== 0) {
      this.spinAccum = (this.spinAccum + s.axisSpin * dt) % 360;
      this.axisCacheDeg = Number.NaN;
      work = true;
    }

    // Trail fade — batch into ~30fps updates when idle
    const trail = s.trail;
    if (trail > 0.001 && this.hasContent && !this.drawing) {
      this.trailAcc += dt;
      const interval = trail > 0.5 ? 1 / 45 : 1 / 30;
      if (this.trailAcc >= interval) {
        const fadePerSec = 0.15 + trail * 1.4;
        const alpha = 1 - Math.exp(-fadePerSec * this.trailAcc);
        this.ctx.save();
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.fillStyle = `rgba(7, 7, 8, ${clamp(alpha, 0, 0.42)})`;
        this.ctx.fillRect(0, 0, this.w, this.h);
        this.ctx.restore();
        this.trailAcc = 0;
        work = true;
      }
    } else {
      this.trailAcc = 0;
    }

    this.autoHue += dt;
    this.needsComposite = work;
  };
}
