/**
 * Daftar kasus render. Tambahkan komponen di sini saat sebuah layar mulai
 * penting — terutama layar kiper, yang dibuka setiap pagi di HP dengan sinyal
 * seadanya dan data yang belum tentu sudah termuat.
 */
import React from "react";
import AksiHarianKiper from "@/components/attendance/AksiHarianKiper";
import AmbilBarangScan from "@/components/stok/AmbilBarangScan";
import ExpiredItemAlert from "@/components/dashboard/ExpiredItemAlert";

const U = { id: "1", email: "a@b.c", full_name: "Sholeh" };

export default [
  // Data user belum termuat — keadaan paling sering terlewat, dan yang paling
  // sering mematikan layar. Ditemukan 03-09-2026: tombol libur tetap tampil
  // dan menekannya melempar TypeError.
  ["AksiHarianKiper user undefined", <AksiHarianKiper user={undefined} attendance={null} hasCheckedIn={false} />],
  ["AksiHarianKiper user null", <AksiHarianKiper user={null} attendance={null} hasCheckedIn={false} />],
  ["AksiHarianKiper belum absen", <AksiHarianKiper user={U} attendance={null} hasCheckedIn={false} />],
  ["AksiHarianKiper ditandai libur", <AksiHarianKiper user={U} attendance={{ status: "libur" }} hasCheckedIn={false} />],
  ["AksiHarianKiper sudah check in", <AksiHarianKiper user={U} attendance={{ status: "hadir" }} hasCheckedIn />],
  ["AksiHarianKiper attendance undefined", <AksiHarianKiper user={U} attendance={undefined} hasCheckedIn />],
  ["AmbilBarangScan kartu", <AmbilBarangScan trigger="card" />],
  ["AmbilBarangScan tombol", <AmbilBarangScan trigger="button" />],
  ["ExpiredItemAlert tanpa data", <ExpiredItemAlert />],
];
