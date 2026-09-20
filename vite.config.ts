import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // App inteiro fica atrás de login, sem SEO/perf de primeira carga a otimizar
  // (seção 2 do BRIEFING) — código-split não compensa a complexidade ainda.
  build: {
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: "node",
  },
});
