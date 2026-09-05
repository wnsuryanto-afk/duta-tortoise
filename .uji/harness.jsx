import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AksiHarianKiper from "@/components/attendance/AksiHarianKiper";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

const kasus = [
  ["user belum termuat (undefined)", { user: undefined, attendance: null, hasCheckedIn: false }],
  ["user null", { user: null, attendance: null, hasCheckedIn: false }],
  ["belum absen, belum ada catatan", { user: { id: "1", email: "a@b.c", full_name: "Sholeh" }, attendance: null, hasCheckedIn: false }],
  ["sudah ditandai libur", { user: { id: "1", email: "a@b.c" }, attendance: { status: "libur" }, hasCheckedIn: false }],
  ["sudah check in", { user: { id: "1", email: "a@b.c" }, attendance: { status: "hadir", check_in: "07:00" }, hasCheckedIn: true }],
  ["attendance undefined + sudah check in", { user: { id: "1", email: "a@b.c" }, attendance: undefined, hasCheckedIn: true }],
  ["tanpa onPesan", { user: { id: "1", email: "a@b.c" }, attendance: null, hasCheckedIn: false, onPesan: undefined }],
];

let gagal = 0;
for (const [nama, props] of kasus) {
  try {
    const html = renderToString(
      <QueryClientProvider client={qc}>
        <AksiHarianKiper {...props} onPesan={props.onPesan} />
      </QueryClientProvider>
    );
    const petunjuk = [
      html.includes("saya libur") ? "tombol-libur" : "",
      html.includes("ditandai libur") ? "teks-libur" : "",
      html.includes("ambil sayur") ? "tombol-sayur" : "",
      html === "" ? "kosong" : "",
    ].filter(Boolean).join(", ") || "(tidak ada elemen)";
    console.log(`  OK   ${nama.padEnd(34)} -> ${petunjuk}`);
  } catch (e) {
    gagal++;
    console.log(`  GAGAL ${nama.padEnd(33)} -> ${e.message}`);
  }
}
console.log(gagal === 0 ? "\nSEMUA KASUS LOLOS" : `\n${gagal} KASUS GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
