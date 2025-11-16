// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const extraPlugins = [];
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    // conditionally import replit plugins when available (guarded)
    try {
      const carto = (await import("@replit/vite-plugin-cartographer")).cartographer();
      const banner = (await import("@replit/vite-plugin-dev-banner")).devBanner();
      extraPlugins.push(carto, banner);
    } catch (e) {
      // ignore if not present
    }
  }

  return {
    plugins: [react(), runtimeErrorOverlay(), ...extraPlugins],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client", "src"),
        "@shared": path.resolve(process.cwd(), "shared"),
        "@assets": path.resolve(process.cwd(), "attached_assets"),
      },
    },
    root: path.resolve(process.cwd(), "client"),
    build: {
      outDir: path.resolve(process.cwd(), "dist", "public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
