import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Download,
  Snowflake,
  Shuffle,
  Trash2,
  SlidersHorizontal,
  X,
  Sparkles,
  FlipHorizontal2,
  SunMedium,
  RotateCw,
  Undo2,
  BookmarkPlus,
  Maximize2,
  Minimize2,
  Bookmark,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLOR_MODES,
  DEFAULT_SETTINGS,
  KaleidoscopeEngine,
  loadPresets,
  randomizeSettings,
  savePresets,
  SEED_LOOKS,
  type ColorMode,
  type KaleidoscopeSettings,
  type SeedLook,
  type UserPreset,
} from "./kaleidoscope-engine";

const SPIDER_SRC = `${import.meta.env.BASE_URL}spider.jpg`.replace(
  /(?<!:)\/{2,}/g,
  "/",
);

/** Trail mode presets — Hold keeps color forever; Fade is temporary. */
const TRAIL_PRESETS = [
  { id: "hold", label: "Hold", value: 0, hint: "Colors stay" },
  { id: "soft", label: "Soft fade", value: 0.28, hint: "Slow dissolve" },
  { id: "fast", label: "Fast fade", value: 0.72, hint: "Quick trails" },
] as const;

function trailLabel(trail: number) {
  if (trail < 0.08) return "Hold";
  if (trail < 0.35) return "Soft";
  if (trail < 0.65) return "Med";
  return "Fast";
}

function spinLabel(spin: number) {
  if (spin === 0) return "Off";
  if (spin < 10) return "Slow";
  if (spin < 25) return "Med";
  return "Fast";
}

function settingsForPreset(s: KaleidoscopeSettings): KaleidoscopeSettings {
  return {
    segments: s.segments,
    colorMode: s.colorMode,
    brushSize: s.brushSize,
    trail: s.trail,
    mirror: s.mirror,
    glow: s.glow,
    frozen: false,
    hueShift: s.hueShift,
    monoHue: s.monoHue,
    axisAngle: s.axisAngle,
    axisSpin: s.axisSpin,
  };
}

function isMobileStart() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 640px)").matches;
}

export function KaleidoscopeApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<KaleidoscopeEngine | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] =
    useState<KaleidoscopeSettings>(DEFAULT_SETTINGS);
  // Start closed on phones so the canvas is drawable immediately
  const [panelOpen, setPanelOpen] = useState(() => !isMobileStart());
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [liveAxisDeg, setLiveAxisDeg] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [presets, setPresets] = useState<UserPreset[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [demoPlaying, setDemoPlaying] = useState(false);
  /** Intro WSV credit — few seconds on open only */
  const [intro, setIntro] = useState(true);
  const [introOut, setIntroOut] = useState(false);
  /** Offer “Spin with this color” after painting a spot */
  const [colorSpinOffer, setColorSpinOffer] = useState<{
    h: number;
    s: number;
    l: number;
  } | null>(null);
  const [autoSpinAfterPaint, setAutoSpinAfterPaint] = useState(false);
  const axisSpinRef = useRef(0);
  const showAxesRef = useRef(false);
  const lastAxisUi = useRef(0);
  const autoSpinRef = useRef(false);
  const trailHold = settings.trail < 0.08;
  const colorSpinActive =
    settings.frozen && settings.axisSpin > 0 && trailHold;


  const pushToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const syncEngineFlags = useCallback(() => {
    setCanUndo(engineRef.current?.canUndo() ?? false);
  }, []);

  useEffect(() => {
    autoSpinRef.current = autoSpinAfterPaint;
  }, [autoSpinAfterPaint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new KaleidoscopeEngine(canvas, DEFAULT_SETTINGS, (n) => {
      if (n.canUndo !== undefined) setCanUndo(n.canUndo);
      if (n.settings) setSettings({ ...n.settings });
      if (n.strokeEnd) {
        if (autoSpinRef.current) {
          const next = engine.startColorSpin(14);
          setSettings(next);
          setColorSpinOffer(null);
          setHint(false);
        } else {
          setColorSpinOffer(n.strokeEnd);
        }
      }
    });
    engineRef.current = engine;
    engine.mount();
    setPresets(loadPresets());

    const hidePanel = () => {
      if (isMobileStart()) setPanelOpen(false);
      setHint(false);
      setColorSpinOffer(null);
    };

    canvas.addEventListener("pointerdown", hidePanel);
    return () => {
      canvas.removeEventListener("pointerdown", hidePanel);
      engine.unmount();
      engineRef.current = null;
    };
  }, []);

  // Intro credit: show ~2.8s then fade out
  useEffect(() => {
    const fadeAt = window.setTimeout(() => setIntroOut(true), 2600);
    const doneAt = window.setTimeout(() => {
      setIntro(false);
      setHint(true);
    }, 3400);
    return () => {
      clearTimeout(fadeAt);
      clearTimeout(doneAt);
    };
  }, []);

  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(false), 4500);
    return () => clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    axisSpinRef.current = settings.axisSpin;
  }, [settings.axisSpin]);

  useEffect(() => {
    showAxesRef.current = showAxes;
  }, [showAxes]);

  // Axis / view rotation UI — when spinning or hold-view
  useEffect(() => {
    let raf = 0;
    let lastPub = 0;
    const tick = (now: number) => {
      const eng = engineRef.current;
      const spinning = (eng?.getSettings().axisSpin ?? 0) > 0;
      const need = showAxesRef.current || spinning || trailHold;
      if (eng && need && now - lastPub > 50) {
        const deg = eng.getEffectiveAxisDeg();
        if (Math.abs(deg - lastAxisUi.current) >= 0.25) {
          lastAxisUi.current = deg;
          setLiveAxisDeg(deg);
          lastPub = now;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trailHold]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const update = useCallback((partial: Partial<KaleidoscopeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      engineRef.current?.setSettings(partial, false);
      return next;
    });
  }, []);

  const applyFullSettings = useCallback((next: KaleidoscopeSettings) => {
    setSettings(next);
    engineRef.current?.setSettings(next, false);
  }, []);

  const onClear = () => {
    engineRef.current?.clear(true);
    setColorSpinOffer(null);
    syncEngineFlags();
    pushToast("Canvas cleared");
  };


  const onUndo = () => {
    const ok = engineRef.current?.undo();
    syncEngineFlags();
    pushToast(ok ? "Undone" : "Nothing to undo");
  };

  const onRandomize = () => {
    applyFullSettings(randomizeSettings(settings));
    pushToast("Look randomized");
  };

  const onFreeze = () => {
    if (colorSpinActive) {
      const next = engineRef.current?.stopColorSpin();
      if (next) setSettings(next);
      pushToast("Spin stopped — paint again");
      return;
    }
    const frozen = !settings.frozen;
    update({ frozen });
    pushToast(
      frozen
        ? trailHold
          ? "Held — spin still runs"
          : "Frame frozen"
        : "Live again",
    );
  };

  const onSpinWithColor = () => {
    const eng = engineRef.current;
    if (!eng?.hasPaint()) {
      pushToast("Paint a spot first");
      return;
    }
    const next = eng.startColorSpin(
      settings.axisSpin > 0 ? settings.axisSpin : 14,
    );
    setSettings(next);
    setColorSpinOffer(null);
    setPanelOpen(false);
    setHint(false);
    pushToast("Spinning with your color");
  };

  const onStopColorSpin = () => {
    const next = engineRef.current?.stopColorSpin();
    if (next) setSettings(next);
    pushToast("Back to painting");
  };

  const onExport = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const a = document.createElement("a");
    a.href = engine.exportPng();
    a.download = `kaleidoscope-${Date.now()}.png`;
    a.click();
    pushToast("Image exported");
  };

  const onSeed = async (seed: SeedLook) => {
    const eng = engineRef.current;
    if (!eng || demoPlaying) return;
    setDemoPlaying(true);
    setHint(false);
    if (isMobileStart()) setPanelOpen(false);
    try {
      await eng.playSeed(seed);
      applyFullSettings({ ...seed.settings, frozen: false });
      pushToast(`${seed.name} look`);
    } finally {
      setDemoPlaying(false);
      syncEngineFlags();
    }
  };

  const onSavePreset = () => {
    const name = window.prompt("Preset name", `Look ${presets.length + 1}`);
    if (!name?.trim()) return;
    const item: UserPreset = {
      id: `p-${Date.now()}`,
      name: name.trim().slice(0, 28),
      settings: settingsForPreset(settings),
      createdAt: Date.now(),
    };
    const next = [item, ...presets].slice(0, 12);
    setPresets(next);
    savePresets(next);
    pushToast("Preset saved");
  };

  const onLoadPreset = (p: UserPreset) => {
    applyFullSettings(settingsForPreset(p.settings));
    pushToast(`Loaded “${p.name}”`);
  };

  const onDeletePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresets(next);
    pushToast("Preset removed");
  };

  const toggleFullscreen = async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      pushToast("Fullscreen not available");
    }
  };

  const setTrailMode = (value: number) => {
    update({ trail: value });
    if (value < 0.08) pushToast("Hold — colors stay forever");
    else if (value > 0.5) pushToast("Fast fade");
    else pushToast("Soft fade");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        engineRef.current?.undo();
        setCanUndo(engineRef.current?.canUndo() ?? false);
        return;
      }
      if (e.key === " " && !mod) {
        e.preventDefault();
        setPanelOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hold + spin + freeze → rotate whole canvas (presentation mode).
  // Only while frozen so pointer coords stay correct while painting.
  const canvasSpinStyle = useMemo(() => {
    if (!trailHold || settings.axisSpin <= 0 || !settings.frozen) return undefined;
    return {
      transform: `rotate(${liveAxisDeg}deg) scale(1.22)`,
      transformOrigin: "center center",
    } as const;
  }, [trailHold, settings.axisSpin, settings.frozen, liveAxisDeg]);

  const spinSwatch = colorSpinOffer
    ? `hsl(${((colorSpinOffer.h % 360) + 360) % 360} ${colorSpinOffer.s}% ${colorSpinOffer.l}%)`
    : colorSpinActive
      ? `hsl(${((settings.hueShift % 360) + 360) % 360} 80% 55%)`
      : null;

  const activeTrailPreset = TRAIL_PRESETS.find((p) =>
    p.id === "hold"
      ? settings.trail < 0.08
      : p.id === "soft"
        ? settings.trail >= 0.08 && settings.trail < 0.5
        : settings.trail >= 0.5,
  )?.id;

  return (
    <div
      ref={rootRef}
      className="relative h-dvh w-full overflow-hidden bg-bg text-fg"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none will-change-transform"
        style={canvasSpinStyle}
        aria-label="Kaleidoscope drawing surface"
      />

      {(showAxes || settings.axisSpin > 0) && !trailHold && (
        <AxisGuide
          segments={settings.segments}
          axisDeg={liveAxisDeg}
          mirror={settings.mirror}
          subtle={!showAxes}
        />
      )}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 42%, rgba(7,7,8,0.45) 100%)",
        }}
      />

      {/* Compact top bar — icon-first, fat-finger targets */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3 safe-top">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border bg-panel/95 px-2.5 py-2 shadow-panel backdrop-blur-md">
          <img
            src={SPIDER_SRC}
            alt=""
            className="size-9 rounded-lg object-cover ring-1 ring-white/10"
            draggable={false}
            decoding="async"
            width={36}
            height={36}
          />
          <div className="hidden min-[400px]:block pr-1">
            <h1 className="text-sm font-semibold tracking-tight leading-none">
              Kaleidoscope
            </h1>
            <p className="mt-0.5 text-[10px] text-muted leading-none">
              WSV
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 max-w-[70%]">
          <ActionButton
            onClick={onUndo}
            label="Undo"
            disabled={!canUndo}
            icon={<Undo2 className="size-5" strokeWidth={1.75} />}
          />
          <ActionButton
            active={colorSpinActive}
            onClick={colorSpinActive ? onStopColorSpin : onSpinWithColor}
            label={colorSpinActive ? "Stop spin" : "Spin color"}
            icon={<RotateCw className="size-5" strokeWidth={1.75} />}
          />
          <ActionButton
            active={settings.frozen && !colorSpinActive}
            onClick={onFreeze}
            label={
              colorSpinActive
                ? "Stop spin"
                : settings.frozen
                  ? "Unfreeze"
                  : "Hold frame"
            }
            icon={<Snowflake className="size-5" strokeWidth={1.75} />}
          />
          <ActionButton
            onClick={onRandomize}
            label="Random"
            icon={<Shuffle className="size-5" strokeWidth={1.75} />}
          />
          <ActionButton
            onClick={onExport}
            label="Export"
            icon={<Download className="size-5" strokeWidth={1.75} />}
          />
          <ActionButton
            onClick={onClear}
            label="Clear"
            icon={<Trash2 className="size-5" strokeWidth={1.75} />}
          />
          <ActionButton
            onClick={toggleFullscreen}
            label={isFullscreen ? "Exit" : "Full"}
            icon={
              isFullscreen ? (
                <Minimize2 className="size-5" strokeWidth={1.75} />
              ) : (
                <Maximize2 className="size-5" strokeWidth={1.75} />
              )
            }
          />
          <ActionButton
            active={panelOpen}
            onClick={() => setPanelOpen((v) => !v)}
            label={panelOpen ? "Close" : "Menu"}
            icon={
              panelOpen ? (
                <X className="size-5" strokeWidth={1.75} />
              ) : (
                <SlidersHorizontal className="size-5" strokeWidth={1.75} />
              )
            }
          />
        </div>
      </header>

      {hint && !intro && (
        <div className="pointer-events-none absolute left-1/2 top-[36%] z-10 -translate-x-1/2 -translate-y-1/2 text-center px-4">
          <p className="rounded-2xl border border-border bg-panel px-5 py-3.5 text-sm text-muted shadow-panel backdrop-blur-md max-w-xs">
            Tap to paint a color spot, then{" "}
            <span className="text-fg">Spin color</span> to keep it spinning.
          </p>
        </div>
      )}

      {/* After painting: offer spin with that color */}
      {colorSpinOffer && !colorSpinActive && !intro && (
        <div className="absolute left-1/2 z-30 -translate-x-1/2 bottom-[5.5rem] sm:bottom-24 px-3 w-full max-w-sm">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-panel/95 p-2 shadow-panel backdrop-blur-md">
            <span
              className="size-11 shrink-0 rounded-xl ring-2 ring-white/20 shadow-inner"
              style={{ background: spinSwatch ?? "#888" }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg leading-tight">
                Spin with this color
              </p>
              <p className="text-[11px] text-muted leading-snug">
                Hold the spot and spin the view
              </p>
            </div>
            <button
              type="button"
              onClick={onSpinWithColor}
              className="flex h-12 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-accent bg-accent px-3 text-sm font-semibold text-accent-fg active:scale-[0.98]"
            >
              <RotateCw className="size-4" strokeWidth={2} />
              Spin
            </button>
            <button
              type="button"
              onClick={() => setColorSpinOffer(null)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted"
              aria-label="Dismiss"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {colorSpinActive && (
        <div className="absolute left-1/2 z-30 -translate-x-1/2 bottom-[5.5rem] sm:bottom-24 px-3">
          <button
            type="button"
            onClick={onStopColorSpin}
            className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-panel/95 px-4 text-sm font-semibold text-fg shadow-panel backdrop-blur-md active:scale-[0.98]"
          >
            <span
              className="size-6 rounded-md ring-1 ring-white/20"
              style={{ background: spinSwatch ?? "#888" }}
            />
            Stop color spin
            <RotateCcw className="size-4 text-muted" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Floating Menu FAB when panel closed — easy thumb reach */}
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute bottom-5 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-panel text-fg shadow-panel backdrop-blur-md active:scale-95 sm:bottom-6 sm:right-6"
          aria-label="Open controls"
        >
          <SlidersHorizontal className="size-6" strokeWidth={1.75} />
        </button>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          panelOpen ? "translate-y-0" : "translate-y-[110%]",
        )}
      >
        <div className="mx-auto max-w-lg rounded-t-2xl border border-border border-b-0 bg-panel/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-panel backdrop-blur-md sm:max-w-xl sm:rounded-2xl sm:border-b sm:mb-3 sm:mx-3 sm:p-5 max-h-[min(52dvh,480px)] overflow-y-auto overscroll-contain">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-fg">
              Controls
            </p>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted active:bg-surface-raised"
              aria-label="Close controls"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Hold / Fade — primary for constant vs temporary color */}
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
              Color life
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TRAIL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTrailMode(p.value)}
                  className={cn(
                    "min-h-12 rounded-xl border px-2 py-2.5 text-center transition-colors",
                    activeTrailPreset === p.id
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface text-muted active:bg-surface-raised",
                  )}
                >
                  <span className="block text-xs font-semibold">{p.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[10px]",
                      activeTrailPreset === p.id
                        ? "text-accent-fg/80"
                        : "text-subtle",
                    )}
                  >
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Spin with color — main feature */}
          <div className="mb-4 rounded-xl border border-border bg-surface/80 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
              Spin with color
            </p>
            <p className="mb-3 text-[12px] text-muted leading-snug">
              After you touch and paint a spot, spin keeps those colors turning
              on screen. Or turn on auto-spin for every stroke.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={colorSpinActive ? onStopColorSpin : onSpinWithColor}
                className={cn(
                  "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold",
                  colorSpinActive
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-panel text-fg active:bg-surface-raised",
                )}
              >
                {spinSwatch && (
                  <span
                    className="size-5 rounded-md ring-1 ring-black/30"
                    style={{ background: spinSwatch }}
                  />
                )}
                <RotateCw className="size-4" strokeWidth={2} />
                {colorSpinActive ? "Stop spin" : "Spin painted colors"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoSpinAfterPaint((v) => !v);
                  pushToast(
                    !autoSpinAfterPaint
                      ? "Auto-spin on — each spot spins"
                      : "Auto-spin off",
                  );
                }}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium",
                  autoSpinAfterPaint
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-panel text-muted",
                )}
              >
                Auto
              </button>
            </div>
          </div>

          {/* Seeds — larger chips */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                Seed looks
              </p>
              {demoPlaying && (
                <span className="text-[11px] text-muted animate-pulse">
                  Playing…
                </span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 snap-x">
              {SEED_LOOKS.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  disabled={demoPlaying}
                  onClick={() => onSeed(seed)}
                  className={cn(
                    "snap-start shrink-0 min-h-14 min-w-[5.75rem] rounded-xl border border-border bg-surface px-3 py-2.5 text-left",
                    "active:bg-surface-raised disabled:opacity-50",
                  )}
                >
                  <span className="block text-sm font-semibold text-fg">
                    {seed.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted leading-snug">
                    {seed.blurb}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ControlGroup label="Segments" value={String(settings.segments)}>
              <input
                type="range"
                min={3}
                max={16}
                step={1}
                value={settings.segments}
                onChange={(e) => update({ segments: Number(e.target.value) })}
                aria-label="Segment count"
              />
            </ControlGroup>

            <ControlGroup
              label="Brush"
              value={`${Math.round(settings.brushSize)}px`}
            >
              <input
                type="range"
                min={8}
                max={64}
                step={1}
                value={settings.brushSize}
                onChange={(e) => update({ brushSize: Number(e.target.value) })}
                aria-label="Brush size"
              />
            </ControlGroup>

            <ControlGroup
              label="Fade amount"
              value={trailLabel(settings.trail)}
            >
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.trail}
                onChange={(e) => update({ trail: Number(e.target.value) })}
                aria-label="Trail fade amount"
              />
            </ControlGroup>

            <ControlGroup
              label="Hue shift"
              value={`${Math.round(settings.hueShift)}°`}
            >
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={settings.hueShift}
                onChange={(e) => update({ hueShift: Number(e.target.value) })}
                aria-label="Hue shift"
              />
            </ControlGroup>

            <ControlGroup
              label="Axis angle"
              value={`${Math.round(liveAxisDeg || settings.axisAngle)}°`}
            >
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={settings.axisAngle}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  update({ axisAngle: v });
                  setLiveAxisDeg(v);
                }}
                onPointerDown={() => setShowAxes(true)}
                onPointerUp={() => setShowAxes(false)}
                onPointerCancel={() => setShowAxes(false)}
                aria-label="Symmetry axis angle"
              />
            </ControlGroup>

            <ControlGroup
              label="Spin (hold + spin = show)"
              value={
                settings.axisSpin === 0
                  ? "Off"
                  : `${spinLabel(settings.axisSpin)} · ${Math.round(settings.axisSpin)}°/s`
              }
            >
              <input
                type="range"
                min={0}
                max={48}
                step={1}
                value={settings.axisSpin}
                onChange={(e) => update({ axisSpin: Number(e.target.value) })}
                onPointerDown={() => setShowAxes(true)}
                onPointerUp={() => {
                  if (axisSpinRef.current === 0) setShowAxes(false);
                }}
                onPointerCancel={() => {
                  if (axisSpinRef.current === 0) setShowAxes(false);
                }}
                aria-label="Spin speed"
              />
            </ControlGroup>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
              Color mode
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => update({ colorMode: mode.id as ColorMode })}
                  className={cn(
                    "min-h-11 rounded-pill border px-4 py-2 text-sm font-medium",
                    settings.colorMode === mode.id
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface text-muted active:bg-surface-raised",
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ToggleChip
              active={settings.mirror}
              onClick={() => update({ mirror: !settings.mirror })}
              icon={<FlipHorizontal2 className="size-4" strokeWidth={1.75} />}
              label="Mirror"
            />
            <ToggleChip
              active={settings.glow}
              onClick={() => update({ glow: !settings.glow })}
              icon={<SunMedium className="size-4" strokeWidth={1.75} />}
              label="Glow"
            />
            <ToggleChip
              active={showAxes || settings.axisSpin > 0}
              onClick={() => setShowAxes((v) => !v)}
              icon={<RotateCw className="size-4" strokeWidth={1.75} />}
              label="Axes"
            />
            <button
              type="button"
              onClick={onSavePreset}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-border bg-surface px-4 text-sm font-medium text-muted active:bg-surface-raised"
            >
              <BookmarkPlus className="size-4" strokeWidth={1.75} />
              Save preset
            </button>
            {settings.colorMode === "mono" && (
              <div className="flex min-h-11 min-w-[160px] flex-1 items-center gap-2 rounded-pill border border-border bg-surface px-3">
                <span className="text-xs text-muted">Tone</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={settings.monoHue}
                  onChange={(e) => update({ monoHue: Number(e.target.value) })}
                  aria-label="Mono hue"
                  className="flex-1"
                />
              </div>
            )}
          </div>

          {presets.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
                Your presets
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    className="inline-flex min-h-11 items-center gap-1 rounded-pill border border-border bg-surface pl-3 pr-1"
                  >
                    <button
                      type="button"
                      onClick={() => onLoadPreset(p)}
                      className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-fg"
                    >
                      <Bookmark
                        className="size-3.5 text-muted"
                        strokeWidth={1.75}
                      />
                      {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePreset(p.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-surface-raised"
                      aria-label={`Delete ${p.name}`}
                    >
                      <X className="size-4" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Intro WSV credit — few seconds only */}
      {intro && (
        <div
          className={cn(
            "absolute inset-0 z-40 flex flex-col items-center justify-center bg-bg/92 backdrop-blur-sm transition-opacity duration-700",
            introOut ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          aria-hidden={introOut}
        >
          <img
            src={SPIDER_SRC}
            alt=""
            className="mb-5 size-28 rounded-2xl object-cover ring-1 ring-white/15 shadow-panel sm:size-32"
            draggable={false}
            decoding="async"
          />
          <p className="text-lg font-semibold tracking-wide text-fg sm:text-xl">
            Webb Spinner Visions
          </p>
          <p className="mt-1.5 text-sm text-muted">Kaleidoscope</p>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-subtle">
            <Sparkles className="size-3.5" strokeWidth={1.5} />
            Nashville
          </p>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-[4.75rem] z-30 -translate-x-1/2 px-3">
          <div className="rounded-pill border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-fg shadow-panel">
            {toast}
          </div>
        </div>
      )}

      {settings.frozen && (
        <div className="pointer-events-none absolute left-3 top-[4.75rem] z-10 sm:left-4">
          <div className="flex items-center gap-1.5 rounded-pill border border-border bg-panel px-3 py-2 text-xs text-muted shadow-panel backdrop-blur-md">
            <Snowflake className="size-3.5" strokeWidth={1.75} />
            {trailHold ? "Held · spin on" : "Frozen"}
          </div>
        </div>
      )}
    </div>
  );
}

function AxisGuide({
  segments,
  axisDeg,
  mirror,
  subtle,
}: {
  segments: number;
  axisDeg: number;
  mirror: boolean;
  subtle: boolean;
}) {
  const segs = Math.max(2, Math.floor(segments));
  const lines = mirror ? segs * 2 : segs;
  const step = 360 / lines;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] will-change-transform"
        style={{
          transform: `translate(-50%, -50%) rotate(${axisDeg}deg)`,
        }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 h-full w-px"
            style={{
              transform: `translate(-50%, -50%) rotate(${i * step}deg)`,
              background: subtle
                ? "linear-gradient(to bottom, transparent 0%, rgba(212,214,220,0.07) 45%, rgba(212,214,220,0.07) 55%, transparent 100%)"
                : "linear-gradient(to bottom, transparent 0%, rgba(212,214,220,0.2) 42%, rgba(212,214,220,0.38) 50%, rgba(212,214,220,0.2) 58%, transparent 100%)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  icon,
  active,
  disabled,
}: {
  onClick: () => void;
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-panel/95 text-fg shadow-panel backdrop-blur-md",
      )}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function ControlGroup({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-[11px] font-medium uppercase tracking-wider text-subtle">
          {label}
        </label>
        <span className="font-mono text-xs tabular-nums text-muted">{value}</span>
      </div>
      {children}
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-4 text-sm font-medium",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-surface text-muted active:bg-surface-raised",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
