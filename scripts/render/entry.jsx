import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import kasus from "./kasus.jsx";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

let gagal = 0;
for (const [nama, el] of kasus) {
  try {
    const html = renderToString(
      <QueryClientProvider client={qc}><MemoryRouter>{el}</MemoryRouter></QueryClientProvider>
    );
    if (process.env.RENDER_RINCI) {
      console.log(`  ${nama} — ${html === "" ? "kosong (disengaja)" : html.length + " char"}`);
    }
  } catch (e) {
    gagal++;
    console.log(`  GAGAL: ${nama}\n         ${e.message}`);
  }
}
if (gagal === 0) console.log(`${kasus.length} komponen merender tanpa error.`);
else console.log(`${gagal} dari ${kasus.length} komponen gagal merender.`);
process.exit(gagal === 0 ? 0 : 1);
