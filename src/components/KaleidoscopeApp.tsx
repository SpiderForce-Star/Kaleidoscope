import {
  useCallback,
  useEffect,
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

function trailLabel(trail: number) {
  if (trail < 0.08) return "Hold";
  if (trail < 0.35) return "Long";
  if (trail < 0.65) return "Med";
  return "Short";
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

export function KaleidoscopeApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<KaleidoscopeEngine | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] =
    useState<KaleidoscopeSettings>(DEFAULT_SETTINGS);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [liveAxisDeg, setLiveAxisDeg] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [presets, setPresets] = useState<UserPreset[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [creditSoft, setCreditSoft] = useState(true);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const axisSpinRef = useRef(0);
  const showAxesRef = useRef(false);
  const lastAxisUi = useRef(0);

  const pushToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const syncEngineFlags = useCallback(() => {
    setCanUndo(engineRef.current?.canUndo() ?? false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new KaleidoscopeEngine(canvas, DEFAULT_SETTINGS, (n) => {
      if (n.canUndo !== undefined) setCanUndo(n.canUndo);
      if (n.settings) setSettings({ ...n.settings });
    });
    engineRef.current = engine;
    engine.mount();
    setPresets(loadPresets());
    return () => {
      engine.unmount();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    axisSpinRef.current = settings.axisSpin;
  }, [settings.axisSpin]);

  useEffect(() => {
    showAxesRef.current = showAxes;
  }, [showAxes]);

  // Axis angle UI — only when needed, throttled (~12 Hz)
  useEffect(() => {
    let raf = 0;
    let lastPub = 0;
    const tick = (now: number) => {
      const eng = engineRef.current;
      const need =
        showAxesRef.current ||
        axisSpinRef.current > 0 ||
        (eng?.getSettings().axisSpin ?? 0) > 0;
      if (eng && need && now - lastPub > 80) {
        const deg = eng.getEffectiveAxisDeg();
        if (Math.abs(deg - lastAxisUi.current) >= 0.4) {
          lastAxisUi.current = deg;
          setLiveAxisDeg(deg);
          lastPub = now;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
    syncEngineFlags();
    pushToast("Canvas cleared");
  };

  const onUndo = () => {
    const ok = engineRef.current?.undo();
    syncEngineFlags();
    if (ok) pushToast("Undone");
    else pushToast("Nothing to undo");
  };

  const onRandomize = () => {
    const next = randomizeSettings(settings);
    applyFullSettings(next);
    pushToast("Look randomized");
  };

  const onFreeze = () => {
    const frozen = !settings.frozen;
    update({ frozen });
    pushToast(frozen ? "Frame frozen" : "Live again");
  };

  const onExport = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const url = engine.exportPng();
    const a = document.createElement("a");
    a.href = url;
    a.download = `kaleidoscope-${Date.now()}.png`;
    a.click();
    pushToast("Image exported");
  };

  const onSeed = async (seed: SeedLook) => {
    const eng = engineRef.current;
    if (!eng || demoPlaying) return;
    setDemoPlaying(true);
    setHint(false);
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
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setCreditSoft(true);
      } else {
        await document.exitFullscreen();
      }
    } catch {
      pushToast("Fullscreen not available");
    }
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
        return;
      }
      switch (e.key.toLowerCase()) {
        case "f":
          if (!mod) {
            setSettings((prev) => {
              const frozen = !prev.frozen;
              engineRef.current?.setSettings({ frozen }, false);
              return { ...prev, frozen };
            });
          }
          break;
        case "r":
          if (!mod) {
            setSettings((prev) => {
              const next = randomizeSettings(prev);
              engineRef.current?.setSettings(next, false);
              return next;
            });
          }
          break;
        case "e":
          if (!mod) {
            const eng = engineRef.current;
            if (!eng) break;
            const url = eng.exportPng();
            const a = document.createElement("a");
            a.href = url;
            a.download = `kaleidoscope-${Date.now()}.png`;
            a.click();
          }
          break;
        case "c":
          if (!mod) engineRef.current?.clear(true);
          break;
        case "u":
          if (!mod) {
            engineRef.current?.undo();
            setCanUndo(engineRef.current?.canUndo() ?? false);
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative h-dvh w-full overflow-hidden bg-bg text-fg"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none will-change-transform"
        aria-label="Kaleidoscope drawing surface"
      />

      {(showAxes || settings.axisSpin > 0) && (
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
            "radial-gradient(ellipse at center, transparent 42%, rgba(7,7,8,0.5) 100%)",
        }}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[4] flex items-center justify-center transition-opacity duration-700",
          isFullscreen && creditSoft ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      >
        <img
          src={SPIDER_SRC}
          alt=""
          className="max-h-[55vmin] max-w-[55vmin] object-contain opacity-[0.07] mix-blend-screen select-none"
          draggable={false}
          decoding="async"
          loading="lazy"
        />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-panel px-3 py-2 shadow-panel backdrop-blur-md sm:px-3.5 sm:py-2.5">
          <img
            src={SPIDER_SRC}
            alt=""
            className="size-8 rounded-md object-cover ring-1 ring-white/10 sm:size-9"
            draggable={false}
            decoding="async"
            width={36}
            height={36}
          />
          <div>
            <h1 className="text-sm font-semibold tracking-tight leading-none">
              Kaleidoscope
            </h1>
            <p className="mt-0.5 text-[11px] text-muted leading-none">
              Draw · mirror · export
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <ActionButton
            onClick={onUndo}
            label="Undo"
            disabled={!canUndo}
            icon={<Undo2 className="size-4" strokeWidth={1.75} />}
          />
          <ActionButton
            active={settings.frozen}
            onClick={onFreeze}
            label={settings.frozen ? "Unfreeze" : "Freeze"}
            icon={<Snowflake className="size-4" strokeWidth={1.75} />}
          />
          <ActionButton
            onClick={onRandomize}
            label="Randomize"
            icon={<Shuffle className="size-4" strokeWidth={1.75} />}
          />
          <ActionButton
            onClick={onExport}
            label="Export"
            icon={<Download className="size-4" strokeWidth={1.75} />}
          />
          <ActionButton
            onClick={onClear}
            label="Clear"
            icon={<Trash2 className="size-4" strokeWidth={1.75} />}
          />
          <ActionButton
            onClick={toggleFullscreen}
            label={isFullscreen ? "Exit" : "Fullscreen"}
            icon={
              isFullscreen ? (
                <Minimize2 className="size-4" strokeWidth={1.75} />
              ) : (
                <Maximize2 className="size-4" strokeWidth={1.75} />
              )
            }
          />
          <ActionButton
            active={panelOpen}
            onClick={() => setPanelOpen((v) => !v)}
            label={panelOpen ? "Hide" : "Controls"}
            icon={
              panelOpen ? (
                <X className="size-4" strokeWidth={1.75} />
              ) : (
                <SlidersHorizontal className="size-4" strokeWidth={1.75} />
              )
            }
          />
        </div>
      </header>

      {hint && (
        <div className="pointer-events-none absolute left-1/2 top-[38%] z-10 -translate-x-1/2 -translate-y-1/2 text-center px-4">
          <p className="rounded-xl border border-border bg-panel px-5 py-3 text-sm text-muted shadow-panel backdrop-blur-md">
            Drag to paint · tap a seed look below ·{" "}
            <span className="text-fg/80">U</span> undo
          </p>
        </div>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          panelOpen ? "translate-y-0" : "translate-y-[calc(100%+1rem)]",
        )}
      >
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-panel p-4 shadow-panel backdrop-blur-md sm:p-5 max-h-[min(58dvh,520px)] overflow-y-auto overscroll-contain">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                Seed looks
              </p>
              {demoPlaying && (
                <span className="text-[11px] text-muted animate-pulse">
                  Playing demo…
                </span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
              {SEED_LOOKS.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  disabled={demoPlaying}
                  onClick={() => onSeed(seed)}
                  className={cn(
                    "shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors duration-150",
                    "hover:border-border-strong hover:bg-surface-raised",
                    "disabled:opacity-50 min-w-[5.5rem]",
                  )}
                >
                  <span className="block text-xs font-semibold text-fg">
                    {seed.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted leading-snug">
                    {seed.blurb}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                min={4}
                max={56}
                step={1}
                value={settings.brushSize}
                onChange={(e) => update({ brushSize: Number(e.target.value) })}
                aria-label="Brush size"
              />
            </ControlGroup>

            <ControlGroup label="Trail" value={trailLabel(settings.trail)}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.trail}
                onChange={(e) => update({ trail: Number(e.target.value) })}
                aria-label="Trail fade"
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
              label="Axis spin"
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
                aria-label="Symmetry axis spin"
              />
            </ControlGroup>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
              Color mode
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => update({ colorMode: mode.id as ColorMode })}
                  className={cn(
                    "rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                    settings.colorMode === mode.id
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
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
              icon={<FlipHorizontal2 className="size-3.5" strokeWidth={1.75} />}
              label="Mirror"
            />
            <ToggleChip
              active={settings.glow}
              onClick={() => update({ glow: !settings.glow })}
              icon={<SunMedium className="size-3.5" strokeWidth={1.75} />}
              label="Glow"
            />
            <ToggleChip
              active={showAxes || settings.axisSpin > 0}
              onClick={() => setShowAxes((v) => !v)}
              icon={<RotateCw className="size-3.5" strokeWidth={1.75} />}
              label="Axes"
            />
            <button
              type="button"
              onClick={onSavePreset}
              className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 text-xs font-medium text-muted transition-colors hover:text-fg"
            >
              <BookmarkPlus className="size-3.5" strokeWidth={1.75} />
              Save preset
            </button>
            {settings.colorMode === "mono" && (
              <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5">
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
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-pill border border-border bg-surface pl-2.5 pr-1 py-1"
                  >
                    <button
                      type="button"
                      onClick={() => onLoadPreset(p)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-fg"
                      title="Load preset"
                    >
                      <Bookmark
                        className="size-3 text-muted"
                        strokeWidth={1.75}
                      />
                      {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePreset(p.id)}
                      className="rounded-full p-1 text-muted hover:text-fg"
                      aria-label={`Delete ${p.name}`}
                    >
                      <X className="size-3" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <a
        href="https://webbspinnervisions.net"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "absolute z-20 flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 backdrop-blur-md transition-all duration-500",
          "hover:border-white/20 hover:bg-black/50",
          isFullscreen
            ? "bottom-4 left-1/2 -translate-x-1/2 px-4 py-2.5 shadow-panel"
            : "left-3 px-2.5 py-1.5 sm:left-4",
        )}
        style={
          !isFullscreen
            ? {
                bottom: panelOpen
                  ? "calc(min(58dvh, 520px) + 1.25rem)"
                  : "1rem",
              }
            : undefined
        }
        onMouseEnter={() => isFullscreen && setCreditSoft(true)}
      >
        <img
          src={SPIDER_SRC}
          alt=""
          className={cn(
            "rounded-md object-cover ring-1 ring-white/15",
            isFullscreen ? "size-9" : "size-7",
          )}
          draggable={false}
          decoding="async"
          width={36}
          height={36}
        />
        <div className="leading-tight">
          <span
            className={cn(
              "block font-semibold tracking-wide text-fg/90",
              isFullscreen ? "text-xs" : "text-[10px]",
            )}
          >
            Webb Spinner Visions
          </span>
          <span className="block text-[10px] text-muted">
            Nashville · webbspinnervisions.net
          </span>
        </div>
        <Sparkles
          className={cn(
            "text-accent/70",
            isFullscreen ? "size-4" : "size-3.5",
          )}
          strokeWidth={1.5}
        />
      </a>

      {isFullscreen && (
        <button
          type="button"
          onClick={() => setCreditSoft((v) => !v)}
          className="absolute right-4 bottom-4 z-20 rounded-pill border border-border bg-panel/80 px-3 py-1.5 text-[10px] text-muted backdrop-blur-md hover:text-fg"
        >
          {creditSoft ? "Hide spider" : "Show spider"}
        </button>
      )}

      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2">
          <div className="rounded-pill border border-border bg-surface-raised px-4 py-2 text-xs font-medium text-fg shadow-panel">
            {toast}
          </div>
        </div>
      )}

      {settings.frozen && (
        <div className="pointer-events-none absolute right-3 top-20 z-10 sm:right-4">
          <div className="flex items-center gap-1.5 rounded-pill border border-border bg-panel px-3 py-1.5 text-xs text-muted shadow-panel backdrop-blur-md">
            <Snowflake className="size-3.5" strokeWidth={1.75} />
            Frozen
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
      <div
        className={cn(
          "absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
          subtle ? "bg-accent/30" : "bg-accent/70",
        )}
      />
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
        "inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-panel text-fg shadow-panel backdrop-blur-md hover:border-border-strong",
      )}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
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
      <div className="mb-2 flex items-baseline justify-between gap-2">
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
        "inline-flex h-9 items-center gap-1.5 rounded-pill border px-3 text-xs font-medium transition-colors duration-150",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
