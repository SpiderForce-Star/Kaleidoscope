# Kaleidoscope

Interactive kaleidoscope — mirror pointer movement into symmetric, colorful patterns.

**Live:** [spiderforce-star.github.io/Kaleidoscope](https://spiderforce-star.github.io/Kaleidoscope/)  
**Repo:** [github.com/SpiderForce-Star/Kaleidoscope](https://github.com/SpiderForce-Star/Kaleidoscope)

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
| `npm run dev` | Dev server (TanStack Start) on port 8080 |
| `npm run build` | Production SSR build (Vercel / Nitro) |
| `npm run build:spa` | Static SPA build for GitHub Pages |
| `npm run preview` | Serve production build |
| `npm run typecheck` | TypeScript check |

## Deploy

### GitHub Pages (automatic)

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which builds the SPA and deploys to GitHub Pages.

Enable once (if needed): **Settings → Pages → Source: GitHub Actions**.

### Vercel (optional)

[Import this repo on Vercel](https://vercel.com/new/clone?repository-url=https://github.com/SpiderForce-Star/Kaleidoscope) — framework preset uses `npm run build` (Nitro `vercel` output).

## Stack

React 19 · TypeScript · Vite · TanStack Start · Tailwind CSS v4 · Canvas 2D

## License

MIT
