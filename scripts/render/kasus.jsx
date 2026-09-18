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
import LaporMakanPanel from "@/components/tortoise/LaporMakanPanel";
import GrafikKepatuhan from "@/components/dashboard/GrafikKepatuhan";
import TortoiseList from "@/pages/TortoiseList";
import OperationalToday from "@/components/dashboard/OperationalToday";
import VetContactPage from "@/pages/VetContactPage";
import UserManagement from "@/pages/UserManagement";
import TortoiseMorphSummary from "@/components/dashboard/TortoiseMorphSummary";
import TombolWhatsApp from "@/components/common/TombolWhatsApp";
import LeadsSupplierTab from "@/components/supplier/LeadsSupplierTab";
import SupplierPage from "@/pages/SupplierPage";
import InputBerat from "@/components/common/InputBerat";
import StokPeminjamanTab from "@/components/stok/StokPeminjamanTab";
import PecahBatchDialog from "@/components/stok/PecahBatchDialog";
import DosisKalkulator from "@/components/health/DosisKalkulator";
import UnifiedStokPage from "@/pages/UnifiedStokPage";
import StokInventoryTab from "@/components/stok/StokInventoryTab";
import StokPergerakanTab from "@/components/stok/StokPergerakanTab";
import StokResepTab from "@/components/stok/StokResepTab";

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

  /*
   * Panel lapor "tidak makan" (17-09-2026). Pemicu utama penimbangan sejak
   * rotasi dihentikan, jadi ia dibuka kiper tiap kali ada yang janggal.
   * Kasus tanpa kura diperiksa karena panel ini dirender di dalam kartu kura
   * yang datanya bisa belum termuat.
   */
  ["LaporMakanPanel tanpa kura", <LaporMakanPanel tortoise={undefined} />],
  ["LaporMakanPanel kura biasa", <LaporMakanPanel tortoise={{ id: "t1", code: "A29", name: "A29", enclosure: "N1" }} />],

  /*
   * Grafik kepatuhan (18-09-2026). Menggambar SVG dari data, jadi kasus yang
   * diperiksa adalah bentuk data yang benar-benar terjadi: hari tanpa tugas
   * terjadwal (persen null), deret kosong, dan satu hari saja — ketiganya
   * membuat perhitungan koordinat membagi dengan nol kalau tidak dijaga.
   */
  ["GrafikKepatuhan kosong", <GrafikKepatuhan hari={[]} />],
  ["GrafikKepatuhan semua null", <GrafikKepatuhan hari={[
    { tanggal: "2026-09-16", persen: null, selesai: 0, terjadwal: 0 },
    { tanggal: "2026-09-17", persen: null, selesai: 0, terjadwal: 0 },
  ]} />],
  ["GrafikKepatuhan satu hari", <GrafikKepatuhan hari={[
    { tanggal: "2026-09-17", persen: 96, selesai: 24, terjadwal: 25 },
  ]} />],
  ["GrafikKepatuhan 14 hari dengan lubang", <GrafikKepatuhan hari={[
    { tanggal: "2026-09-04", persen: 88, selesai: 22, terjadwal: 25 },
    { tanggal: "2026-09-05", persen: 96, selesai: 24, terjadwal: 25 },
    { tanggal: "2026-09-06", persen: null, selesai: 0, terjadwal: 0 },
    { tanggal: "2026-09-07", persen: 72, selesai: 18, terjadwal: 25 },
    { tanggal: "2026-09-08", persen: 100, selesai: 25, terjadwal: 25 },
    { tanggal: "2026-09-09", persen: 0, selesai: 0, terjadwal: 25 },
  ]} />],
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

  // Kartu morph dulu memaksa setiap morph di luar daftar warnanya menjadi
  // "Normal". Kasus di bawah memuat morph yang TIDAK punya warna khusus
  // (hypo, piebald) — dulu keduanya lenyap ke Normal, sekarang harus tampil
  // sebagai barisnya sendiri tanpa membuat layar gagal render.
  // Modul Leads Supplier (13-09-2026). Tombol WhatsApp diuji pada bentuk
  // nomor yang benar-benar muncul di postingan Facebook — termasuk "812…"
  // tanpa nol di depan, bentuk yang membuat lima salinan inline lama
  // menghasilkan tautan wa.me ke nomor yang bukan siapa-siapa.
  ["TombolWhatsApp nomor kosong", <TombolWhatsApp nomor="" />],
  ["TombolWhatsApp nomor undefined", <TombolWhatsApp nomor={undefined} />],
  ["TombolWhatsApp 08 biasa", <TombolWhatsApp nomor="0812-3456-7890" pesan="halo" />],
  ["TombolWhatsApp tanpa nol depan", <TombolWhatsApp nomor="812 3456 7890" />],
  ["TombolWhatsApp +62", <TombolWhatsApp nomor="+62 812 3456 7890" />],
  ["TombolWhatsApp nomor ngawur", <TombolWhatsApp nomor="tanya wa aja" />],
  ["LeadsSupplierTab tanpa data", <LeadsSupplierTab />],
  ["SupplierPage tanpa data", <SupplierPage />],

  // InputBerat (15-09-2026). Kotak berat tunggal yang menggantikan tujuh
  // salinan "Berat (gram)". Kasus di bawah memuat keadaan yang membuat 48
  // catatan kehilangan tiga angka nol: dewasa 22,8 kg diketik apa adanya.
  ["InputBerat kosong", <InputBerat gram="" onChange={() => {}} />],
  ["InputBerat bayi wajar", <InputBerat gram={62} panjangCm={6} onChange={() => {}} />],
  ["InputBerat dewasa wajar", <InputBerat gram={22800} panjangCm={53.5} onChange={() => {}} />],
  ["InputBerat salah kilogram", <InputBerat gram={23} panjangCm={53.5} onChange={() => {}} />],
  ["InputBerat salah ons", <InputBerat gram={186} panjangCm={52} onChange={() => {}} />],
  ["InputBerat tanpa panjang", <InputBerat gram={24} onChange={() => {}} />],
  ["InputBerat tanpa onChange", <InputBerat gram={100} panjangCm={undefined} />],

  // Tab Peminjaman dipindah dari ItemBorrow ke ToolLoan (15-09-2026). Nama
  // kolomnya ikut berubah (borrow_date→loan_date, item_name→tool_name), jadi
  // barisnya diuji dengan bentuk ToolLoan yang sebenarnya, termasuk tanggal
  // kosong dan tanggal ngawur yang dulu membuat new Date() melempar.
  ["StokPeminjamanTab tanpa data", <StokPeminjamanTab />],
  ["StokPeminjamanTab bentuk ToolLoan", <StokPeminjamanTab borrows={[
    { id: "1", tool_name: "Sekop", borrower_name: "Angsolo", loan_date: "2026-09-10", status: "dipinjam", purpose: "bersihkan kandang" },
    { id: "2", tool_name: "Selang", borrower_name: "Sholeh", loan_date: "2026-09-01", return_date: "2026-09-05", status: "dikembalikan", return_condition: "rusak" },
    { id: "3", tool_name: "Tanpa tanggal", borrower_name: "", status: "dipinjam" },
    { id: "4", tool_name: "Tanggal ngawur", loan_date: "bukan-tanggal", expected_return_date: "", status: "dipinjam" },
  ]} warehouseItems={[{ id: "w1", name: "Sekop", sku: "ALT-01" }]} feedstocks={[{ id: "f1", name: "Pelet", sku: "PKN-01" }]} />],

  // Penjaga dosis (15-09-2026). Berat kilogram di kolom gram membuat dosis
  // obat mengecil seribu kali tanpa satu pun angka terlihat janggal. Kasus
  // "B31 salah satuan" memakai angka yang benar-benar tersimpan hari itu.
  ["DosisKalkulator tanpa diagnosis", <DosisKalkulator selectedDiagnoses={[]} />],
  ["DosisKalkulator tanpa data kura", <DosisKalkulator selectedDiagnoses={["shell_rot"]} tortoiseId="x" tortoises={[]} />],
  ["DosisKalkulator berat wajar", <DosisKalkulator selectedDiagnoses={["shell_rot"]} tortoiseId="t1"
    tortoises={[{ id: "t1", weight_grams: 24000, shell_length_cm: 54 }]} />],
  ["DosisKalkulator B31 salah satuan", <DosisKalkulator selectedDiagnoses={["shell_rot"]} tortoiseId="t1"
    tortoises={[{ id: "t1", weight_grams: 24, shell_length_cm: 54 }]} />],
  ["DosisKalkulator tanpa panjang tempurung", <DosisKalkulator selectedDiagnoses={["shell_rot"]} tortoiseId="t1"
    tortoises={[{ id: "t1", weight_grams: 24 }]} />],

  /*
   * Pecah batch (17-09-2026). Dialog ini menulis BatchBarang untuk stok yang
   * sudah ada di rak, dan satu-satunya hal yang menjaga aplikasi tidak punya
   * dua angka untuk satu rak adalah aturan "jumlah batch harus pas dengan
   * stok". Kasus stok nol dan satuan kosong diperiksa karena keduanya nyata:
   * banyak barang gudang berstok 0, dan sebagian tidak punya satuan.
   */
  ["PecahBatchDialog stok wajar", <PecahBatchDialog
    item={{ id: "w1", name: "Stone Breaker", sku: "OBT-0008", current_stock: 15, unit: "botol", expired_date: "2026-11-09", purchase_price: 25000 }}
    onClose={() => {}} />],
  ["PecahBatchDialog stok nol", <PecahBatchDialog
    item={{ id: "w2", name: "Barang kosong", sku: "OBT-0099", current_stock: 0 }}
    onClose={() => {}} />],
  ["PecahBatchDialog tanpa satuan & tanggal", <PecahBatchDialog
    item={{ id: "w3", name: "Tanpa apa-apa", current_stock: 2 }}
    onClose={() => {}} />],

  /*
   * Halaman Stok & Gudang (18-09-2026). Dilaporkan gagal render di lapangan;
   * kasus di bawah merendernya pada keadaan aplikasi baru dibuka — data belum
   * termuat, daftar kosong.
   */
  ["UnifiedStokPage tanpa data", <UnifiedStokPage />],
  ["StokInventoryTab tanpa data", <StokInventoryTab feedstocks={[]} warehouseItems={[]} role="owner" />],
  ["StokInventoryTab barang contoh", <StokInventoryTab role="owner"
    feedstocks={[{ id: "f1", name: "Rumput", category: "rumput", unit: "kg", current_stock: 12, minimum_stock: 5, price_per_unit: 3000, sku: "PKN-0001", is_active: true }]}
    warehouseItems={[
      { id: "w1", name: "Stone Breaker", category: "obat", unit: "botol", current_stock: 3, minimum_stock: 2, purchase_price: 25000, sku: "OBT-0001", expired_date: "2026-11-09" },
      { id: "w2", name: "Spuit", category: "habis_pakai", unit: "pcs", current_stock: 0, minimum_stock: 10, purchase_price: 1000, sku: "ALT-0002" },
    ]} />],
  ["StokPergerakanTab tanpa data", <StokPergerakanTab movements={[]} feedstocks={[]} warehouseItems={[]} batches={[]} role="owner" />],
  ["StokResepTab tanpa data", <StokResepTab role="owner" />],
  ["TortoiseMorphSummary tanpa data", <TortoiseMorphSummary />],
  ["TortoiseMorphSummary morph tak berwarna", <TortoiseMorphSummary tortoises={[
    { morph: "normal", gender: "betina" },
    { morph: "het_albino", gender: "jantan" },
    { morph: "hypo", gender: "jantan" },
    { morph: "piebald", gender: "betina" },
    { morph: "", gender: "betina" },
    { gender: "jantan" },
  ]} />],
];