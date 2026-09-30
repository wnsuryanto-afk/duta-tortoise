import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SINI = path.dirname(fileURLToPath(import.meta.url));
const AKAR = path.resolve(SINI, "../..");

export default defineConfig({
  root: SINI,
  plugins: [react()],
  resolve: {
    alias: [
      // Pengganti klien Base44: pengujian tata letak tidak boleh menyentuh
      // jaringan, dan tidak butuh datanya — yang diukur kotaknya.
      { find: "@/api/base44Client", replacement: path.join(SINI, "stub-base44.js") },
      { find: "@", replacement: path.join(AKAR, "src") },
    ],
  },
  server: { port: Number(process.env.PORT_UJI || 5199), strictPort: true, fs: { allow: [AKAR] } },
  logLevel: "error",
});
