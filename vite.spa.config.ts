import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Static SPA build for GitHub Pages (no SSR / Nitro).
// Live: https://spiderforce-star.github.io/Kaleidoscope/
export default defineConfig({
  base: "/Kaleidoscope/",
  root: path.resolve(__dirname, "spa"),
  publicDir: false,
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
