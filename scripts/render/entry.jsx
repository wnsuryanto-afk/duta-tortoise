import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ViewAsProvider } from "@/lib/ViewAsContext";
import kasus from "./kasus.jsx";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

let gagal = 0;
for (const [nama, el] of kasus) {
  try {
    const html = renderToString(
      /*
        ViewAsProvider ikut dipasang.

        Halaman yang memanggil useViewAs() melempar tanpa penyedianya —
        "Cannot destructure property 'viewAsRole' of 'useViewAs(...)' as it is
        null" — dan itu kegagalan HARNESS-nya, bukan kegagalan halamannya.
        Penjaga yang menolak halaman karena kekurangan dirinya sendiri akan
        membuat orang berhenti menambahkan halaman ke sini.
      */
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ViewAsProvider>{el}</ViewAsProvider>
        </MemoryRouter>
      </QueryClientProvider>
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
