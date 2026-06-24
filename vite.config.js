import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Deterministic high-range dev port (49152–65535) derived from this project's
// absolute path via a djb2 hash, so the app always gets the same port instead
// of an OS-assigned one. Path: /Users/pbsh/projects/o-rocky/cc -> 60643
const PORT = 60643;
const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the project site at /rocky/, so the production build needs
  // that base; local dev/preview stays at "/" so dev URLs remain clean.
  base: command === "build" ? "/rocky/" : "/",
  server: {
    host: true, // listen on all interfaces so .local / LAN access works
    port: PORT,
    strictPort: false, // fall forward to the next free port if taken
    allowedHosts: [".local"], // allow any *.local mDNS hostname
  },
  preview: {
    host: true,
    port: PORT,
    allowedHosts: [".local"],
  },
  build: {
    // two entry points sharing one scene module: the one-pager + the full-page viewer
    rollupOptions: {
      input: { main: r("./index.html"), view: r("./view.html") },
    },
  },
}));
