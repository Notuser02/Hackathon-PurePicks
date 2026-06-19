// vite.config.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
    vercel: {
      config: {
        functions: {
          maxDuration: 60,
        },
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
