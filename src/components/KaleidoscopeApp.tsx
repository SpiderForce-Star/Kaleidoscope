import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLOR_MODES,
  DEFAULT_SETTINGS,
  KaleidoscopeEngine,
  randomizeSettings,
  type ColorMode,
  type KaleidoscopeSettings,
} from "./kaleidoscope-engine";

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

export function KaleidoscopeApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<KaleidoscopeEngine | null>(null);
  const [settings, setSettings] =
    useState<KaleidoscopeSettings>(DEFAULT_SETTINGS);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [liveAxisDeg, setLiveAxisDeg] = useState(0);
  const axisSpinRef = useRef(0);

  const pushToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new KaleidoscopeEngine(canvas, DEFAULT_SETTINGS);
    engineRef.current = engine;
    engine.mount();
    return () => {
      engine.unmount();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    axisSpinRef.current = settings.axisSpin;
  }, [settings.axisSpin]);

  // Poll live axis angle for guide overlay + spinning display
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const eng = engineRef.current;
      if (eng) {
        const deg = (eng.getEffectiveAxisRad() * 180) / Math.PI;
        setLiveAxisDeg(((deg % 360) + 360) % 360);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const update = useCallback((partial: Partial<KaleidoscopeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      engineRef.current?.setSettings(partial);
      return next;
    });
  }, []);

  const onClear = () => {
    engineRef.current?.clear();
    pushToast("Canvas cleared");
  };

  const onRandomize = () => {
    const next = randomizeSettings(settings);
    setSettings(next);
    engineRef.current?.setSettings(next);
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

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
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

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto rounded-xl border border-border bg-panel px-3.5 py-2.5 shadow-panel backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" strokeWidth={1.75} />
            <div>
              <h1 className="text-sm font-semibold tracking-tight leading-none">
                Kaleidoscope
              </h1>
              <p className="mt-0.5 text-[11px] text-muted leading-none">
                Draw · mirror · export
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
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
        <div className="pointer-events-none absolute left-1/2 top-[42%] z-10 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="rounded-xl border border-border bg-panel px-5 py-3 text-sm text-muted shadow-panel backdrop-blur-md">
            Drag anywhere to paint mirrored patterns
          </p>
        </div>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          panelOpen ? "translate-y-0" : "translate-y-[calc(100%+1rem)]",
        )}
      >
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-panel p-4 shadow-panel backdrop-blur-md sm:p-5">
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
              value={`${Math.round(liveAxisDeg)}°`}
            >
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={settings.axisAngle}
                onChange={(e) => update({ axisAngle: Number(e.target.value) })}
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
        </div>
      </div>

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
  // One line per fold; mirror doubles the visual rays
  const lines = mirror ? segs * 2 : segs;
  const step = 360 / lines;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax]"
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
}: {
  onClick: () => void;
  label: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors duration-150 active:scale-[0.98]",
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
