import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  server: { host: "::", port: 8080 },
  resolve: { dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"] },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    // src/server.ts wraps the TanStack Start server entry with generic SSR error handling.
    tanstackStart({ server: { entry: "server" } }),
    ...(command === "build" ? [nitro({ output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" } })] : []),
    viteReact(),
  ],
}));