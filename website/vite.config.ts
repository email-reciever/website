import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    // cloudflare plugin must come first, targeting the ssr environment
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    tailwindcss(),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
  ],
});
