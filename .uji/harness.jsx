import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AksiHarianKiper from "@/components/attendance/AksiHarianKiper";
import AmbilBarangScan from "@/components/stok/AmbilBarangScan";
import ExpiredItemAlert from "@/components/dashboard/ExpiredItemAlert";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
const bungkus = (el) => <QueryClientProvider client={qc}><MemoryRouter>{el}</MemoryRouter></QueryClientProvider>;

const U = { id: "1", email: "a@b.c", full_name: "Sholeh" };
const kasus = [
  ["AksiHarianKiper user undefined", <AksiHarianKiper user={undefined} attendance={null} hasCheckedIn={false} />],
  ["AksiHarianKiper user null", <AksiHarianKiper user={null} attendance={null} hasCheckedIn={false} />],
  ["AksiHarianKiper belum absen", <AksiHarianKiper user={U} attendance={null} hasCheckedIn={false} />],
  ["AksiHarianKiper libur", <AksiHarianKiper user={U} attendance={{ status: "libur" }} hasCheckedIn={false} />],
  ["AksiHarianKiper sudah check in", <AksiHarianKiper user={U} attendance={{ status: "hadir" }} hasCheckedIn />],
  ["AksiHarianKiper attendance undefined", <AksiHarianKiper user={U} attendance={undefined} hasCheckedIn />],
  ["AmbilBarangScan trigger card", <AmbilBarangScan trigger="card" />],
  ["AmbilBarangScan trigger button", <AmbilBarangScan trigger="button" />],
  ["ExpiredItemAlert tanpa data", <ExpiredItemAlert />],
];

let gagal = 0;
for (const [nama, el] of kasus) {
  try {
    const html = renderToString(bungkus(el));
    console.log(`  OK    ${nama.padEnd(36)} ${html === "" ? "(kosong — benar)" : `${html.length} char`}`);
  } catch (e) {
    gagal++;
    console.log(`  GAGAL ${nama.padEnd(36)} ${e.message}`);
  }
}
console.log(gagal === 0 ? "\nSemua komponen layar kiper merender tanpa error." : `\n${gagal} komponen gagal merender.`);
process.exit(gagal === 0 ? 0 : 1);
