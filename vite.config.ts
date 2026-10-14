/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

/** In the single-file build the favicon is embedded too, so the HTML file is fully self-contained. */
function inlineFavicon(): Plugin {
  return {
    name: "inline-favicon",
    transformIndexHtml(html) {
      const data = readFileSync(new URL("./public/favicon.png", import.meta.url)).toString("base64");
      return html.replace('href="./favicon.png"', `href="data:image/png;base64,${data}"`);
    },
  };
}

const tauriDevHost = process.env.TAURI_DEV_HOST;

// Modes:
//   default  -> desktop (Tauri) and web build in ./dist
//   single   -> one self-contained HTML file (dist-single/index.html), opens offline by double click
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [react(), viteSingleFile(), inlineFavicon()] : [react()],
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    target: "es2021",
    chunkSizeWarningLimit: 1500,
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: tauriDevHost || false,
    hmr: tauriDevHost ? { protocol: "ws", host: tauriDevHost, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
}));
