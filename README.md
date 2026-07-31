# Kaleidoscope

Interactive kaleidoscope — mirror pointer movement into symmetric, colorful patterns.

## Features

- **Draw** with mouse or touch; strokes mirror across radial segments
- **Segments** (3–16) — symmetry fold count
- **Color modes** — Rainbow, Spectrum, Neon, Pastel, Fire, Ice, Aurora, Mono
- **Brush / Trail / Hue** — size, persistence, color offset
- **Axis angle & spin** — rotate symmetry axes (manual or continuous)
- **Mirror & Glow** — dihedral reflection and additive bloom
- **Freeze** — lock the frame
- **Randomize** — new look instantly
- **Export** — download PNG

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:8080` |
| `npm run build` | Production build (Vercel / Nitro) |
| `npm run preview` | Serve production build |
| `npm run typecheck` | TypeScript check |

## Stack

React 19 · TypeScript · Vite · TanStack Start · Tailwind CSS v4

## License

MIT
