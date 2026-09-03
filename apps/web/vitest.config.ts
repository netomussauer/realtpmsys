import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Espelha o path alias de tsconfig.json (`@/*` -> `./*`, raiz de apps/web —
// este app nao usa diretorio src/). Vitest nao le tsconfig "paths"
// automaticamente, precisa da propria config de resolve.alias.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["features/**/*.{ts,tsx}"],
      exclude: ["features/**/*.test.{ts,tsx}", "features/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
