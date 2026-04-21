import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { cpSync, existsSync } from "fs";

function copyStaticAssets() {
  return {
    name: "copy-static-assets",
    closeBundle() {
      const root = resolve(__dirname);
      const out = resolve(__dirname, "dist");
      cpSync(resolve(root, "manifest.json"), resolve(out, "manifest.json"));
      if (existsSync(resolve(root, "icons"))) {
        cpSync(resolve(root, "icons"), resolve(out, "icons"), { recursive: true });
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), copyStaticAssets()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, "sidebar.html"),
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "src/background/service-worker.ts"),
        content: resolve(__dirname, "src/content/content-script.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
}));
