/**
 * Config de vitest SOLO para evals que llaman a la API real de DeepSeek.
 * Separada de vitest.config.ts para que `npm test` nunca gaste llamadas
 * al modelo. Correr con: npm run eval:chat
 */
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.eval.ts"],
    testTimeout: 60_000,
    // Los evals comparten cliente y presupuesto: correr en serie.
    fileParallelism: false,
  },
});
