import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Relative base so assets work on:
// - https://spiderforce-star.github.io/Kaleidoscope/
// - https://kaleidoscope.webbspinnervisions.net/
const base = process.env.BASE_PATH ?? "./";

export default defineConfig({
  base,
  root: path.resolve(__dirname, "spa"),
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
