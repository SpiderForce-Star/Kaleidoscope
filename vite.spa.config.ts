import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Static SPA for GitHub Pages.
// Custom domain: https://kaleidoscope.webbspinnervisions.net
// Project pages fallback: https://spiderforce-star.github.io/Kaleidoscope/
// BASE_PATH=/ for custom domain (default).
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  root: path.resolve(__dirname, "spa"),
  // CNAME + any static assets from spa/public
  publicDir: path.resolve(__dirname, "spa/public"),
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
