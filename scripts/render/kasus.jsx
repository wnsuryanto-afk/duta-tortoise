/**
 * Daftar kasus render. Tambahkan komponen di sini saat sebuah layar mulai
 * penting — terutama layar kiper, yang dibuka setiap pagi di HP dengan sinyal
 * seadanya dan data yang belum tentu sudah termuat.
 */
import React from "react";
import AksiHarianKiper from "@/components/attendance/AksiHarianKiper";
import AmbilBarangScan from "@/components/stok/AmbilBarangScan";
import ExpiredItemAlert from "@/components/dashboard/ExpiredItemAlert";
import AttendanceChartCard from "@/components/dashboard/AttendanceChartCard";
import AdminDashboard from "@/components/dashboard/role/AdminDashboard";
import KepalaFeederDashboard from "@/components/dashboard/role/KepalaFeederDashboard";
import InvestorDashboard from "@/components/dashboard/role/InvestorDashboard";
import KeeperDashboard from "@/components/dashboard/KeeperDashboard";
import OwnerDashboard from "@/components/dashboard/role/OwnerDashboard";
import RekapPoinGajiPage from "@/pages/RekapPoinGajiPage";
import GuidedHariIni from "@/components/guided/GuidedHariIni";
import TortoiseList from "@/pages/TortoiseList";
import OperationalToday from "@/components/dashboard/OperationalToday";
import VetContactPage from "@/pages/VetContactPage";
import UserManagement from "@/pages/UserManagement";

/*
  PENJAGA INI SUDAH DIUJI BISA GAGAL (03-09-2026).

  Penjaga yang tidak pernah bisa merah sama saja dengan tidak ada penjaga — dan
  aplikasi ini sudah punya dua contohnya: kartu kedaluwarsa yang mustahil
  menyala, dan tanda centang hijau yang mustahil salah.

  Jadi penjaga ini dicoba dirusak dengan sengaja: gerbang `if (!user?.email)`
  di AksiHarianKiper dicabut sementara, dan hasilnya 3 dari 18 kasus langsung
  merah dengan pesan "Cannot read properties of undefined (reading 'email')" —
  termasuk GuidedHariIni, layar yang dibuka kiper setiap pagi. Setelah gerbang
  dikembalikan, kedelapan belas kasus hijau lagi.
*/

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

  // Layar yang diubah pada audit 03-09-2026. Semuanya dirender tanpa data —
  // keadaan saat aplikasi baru dibuka dan kueri belum kembali. Di situlah
  // kesalahan "membaca properti dari undefined" biasanya muncul.
  ["AttendanceChartCard tanpa data", <AttendanceChartCard />],
  ["AdminDashboard tanpa data", <AdminDashboard />],
  ["KepalaFeederDashboard tanpa data", <KepalaFeederDashboard />],
  ["InvestorDashboard tanpa data", <InvestorDashboard />],
  ["KeeperDashboard tanpa data", <KeeperDashboard />],
  ["OwnerDashboard tanpa data", <OwnerDashboard />],
  ["RekapPoinGajiPage tanpa data", <RekapPoinGajiPage />],
  ["GuidedHariIni tanpa user", <GuidedHariIni user={undefined} />],
  ["GuidedHariIni dengan user", <GuidedHariIni user={{ id: "1", email: "a@b.c", full_name: "Sholeh", role: "keeper" }} />],

  // Ditambahkan 10-09-2026. Keduanya diubah cukup dalam hari ini dan
  // TIDAK terjaga sebelumnya — padahal Daftar Kura adalah halaman yang
  // paling sering dibuka setelah layar kiper:
  //   • TortoiseList: seluruh isi dropdown kandang ditulis ulang supaya
  //     kelompoknya diturunkan dari data (Bonsai 1-4 dulu tidak pernah
  //     bisa dipilih sama sekali).
  //   • OperationalToday: penyaring jadwal diganti dari kolom next_due
  //     yang tidak ada menjadi jadwalBerlaku().
  // Membangun (vite build) hanya membuktikan sintaksnya sah, bukan bahwa
  // layarnya benar-benar mau tampil.
  ["TortoiseList tanpa data", <TortoiseList />],
  ["OperationalToday tanpa data", <OperationalToday />],

  // Audit penyaring 10-09-2026: daftar pilihan yang dulu ditulis tangan
  // sekarang diturunkan dari data, jadi keduanya harus tetap merender
  // dengan benar saat datanya masih kosong.
  ["VetContactPage tanpa data", <VetContactPage />],
  ["UserManagement tanpa data", <UserManagement />],
];
