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
import SalarySlipPage from "@/pages/SalarySlipPage";
import CatatanUpahTab from "@/components/salary/CatatanUpahTab";
import KonfigurasiGajiTab from "@/components/salary/KonfigurasiGajiTab";
import LaporanGajiBulanan from "@/components/salary/LaporanGajiBulanan";
import LaporanGajiHarian from "@/components/salary/LaporanGajiHarian";
import LaporanBonusReward from "@/components/salary/LaporanBonusReward";
import TugasInsidentilTab from "@/components/sop/TugasInsidentilTab";
import PerpustakaanSOPTab from "@/components/sop/PerpustakaanSOPTab";
import BiayaOperasionalTab from "@/components/finance/BiayaOperasionalTab";
import LaporanPenjualanTab from "@/components/sales/LaporanPenjualanTab";
import PembeliTab from "@/components/sales/PembeliTab";
import CatatanUntukSayaTab from "@/components/sop/CatatanUntukSayaTab";
import BahanTerpakaiEditor from "@/components/sop/BahanTerpakaiEditor";
import PembaruanTersedia from "@/components/common/PembaruanTersedia";
import PanelKasbon from "@/components/kasbon/PanelKasbon";
import GuidedHariIni from "@/components/guided/GuidedHariIni";
import LaporMakanPanel from "@/components/tortoise/LaporMakanPanel";
import GrafikKepatuhan from "@/components/dashboard/GrafikKepatuhan";
import TortoiseList from "@/pages/TortoiseList";
import OperationalToday from "@/components/dashboard/OperationalToday";
import VetContactPage from "@/pages/VetContactPage";
import UserManagement from "@/pages/UserManagement";
import TortoiseMorphSummary from "@/components/dashboard/TortoiseMorphSummary";
import RincianAset from "@/components/dashboard/RincianAset";
import IsiHargaBeliPage from "@/pages/IsiHargaBeliPage";
import { nilaiAsetKura } from "@/lib/hargaEstimasi";
import { modalKerja } from "@/lib/modalKerja";
import RiwayatBertelurInduk from "@/components/breeding/RiwayatBertelurInduk";
import TombolStokCepat from "@/components/stok/TombolStokCepat";
import BulanBertelur from "@/components/breeding/BulanBertelur";
import PeringkatIndukan from "@/components/breeding/PeringkatIndukan";
import RekapTahunan from "@/components/breeding/RekapTahunan";
import RingkasanAngka from "@/components/common/RingkasanAngka";
import TermConditionSOPPage from "@/pages/TermConditionSOPPage";
import RiwayatKlusterPage from "@/pages/RiwayatKlusterPage";
import HubPage from "@/pages/HubPage";
import BreedingDetailPage from "@/pages/BreedingDetailPage";
import NaikkanProduksi from "@/components/breeding/NaikkanProduksi";
import EggLabelGenerator from "@/components/breeding/EggLabelGenerator";
import EggGrid from "@/components/breeding/EggGrid";
import { PanelTarget } from "@/components/dashboard/TargetTahunanRingkas";
import { PanelMenunggu, susunAntrean } from "@/components/dashboard/MenungguPemilik";
import NilaiInisiatifSekaligus from "@/components/sop/NilaiInisiatifSekaligus";
import { kumpulkanPenawaran, barangTersedia, barangSerumpun, penjualTermurah, keandalanSupplier } from "@/lib/pasarSupplier";
import { kemajuanTarget } from "@/lib/targetTahunan";
import PanduanPakanPage from "@/pages/PanduanPakanPage";
import DailyTaskTemplatePage from "@/pages/DailyTaskTemplatePage";
import WhatsAppLogPage from "@/pages/WhatsAppLogPage";
import PanduanPenyakitDetailPage from "@/pages/PanduanPenyakitDetailPage";
import TortoiseLabelPage from "@/pages/TortoiseLabelPage";
import StockPredictionPage from "@/pages/StockPredictionPage";
import PengaturanPoinPage from "@/pages/PengaturanPoinPage";
import IncompleteDataPage from "@/pages/IncompleteDataPage";
import SystemMaintenancePage from "@/pages/SystemMaintenancePage";
import CatatBiayaPage from "@/pages/CatatBiayaPage";
import TemuanFotoPage from "@/pages/TemuanFotoPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import DeathRecordsPage from "@/pages/DeathRecordsPage";
import EditProfilePage from "@/pages/EditProfilePage";
import HRPage from "@/pages/HRPage";
import InfoPage from "@/pages/InfoPage";
import OtomatisasiPage from "@/pages/OtomatisasiPage";
import PrinterConfigPage from "@/pages/PrinterConfigPage";
import PengaturanWhatsAppPage from "@/pages/PengaturanWhatsAppPage";
import LayarTimPage from "@/pages/LayarTimPage";
import PembelianPage from "@/pages/PembelianPage";
import UnifiedStokPage from "@/pages/UnifiedStokPage";
import HitungMundurMenetas from "@/components/breeding/HitungMundurMenetas";
import FormPergerakanStok from "@/components/stok/FormPergerakanStok";
import TombolWhatsApp from "@/components/common/TombolWhatsApp";
import LeadsSupplierTab from "@/components/supplier/LeadsSupplierTab";
import SupplierPage from "@/pages/SupplierPage";
import InputBerat from "@/components/common/InputBerat";
import PecahBatchDialog from "@/components/stok/PecahBatchDialog";
import DosisKalkulator from "@/components/health/DosisKalkulator";

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

/*
  Satu kebun kecil yang bentuknya sama dengan data nyata: kandang satu jantan
  yang berproduksi, kandang tiga jantan yang nol, kandang tanpa jantan dewasa,
  indukan yang berhenti, dan betina yang baru datang.
*/
const ayahSatu = (n) => ({ pasti: true, jumlah: 1, kandidat: [n], ayah: n, muda: [], hanyaMuda: false });
const ayahBanyak = (d) => ({ pasti: false, jumlah: d.length, kandidat: d, ayah: null, muda: [], hanyaMuda: false });
const ayahMuda = (n) => ({ pasti: false, jumlah: 0, kandidat: [], ayah: null, muda: [n], hanyaMuda: true });

const NAIKKAN = {
  hariIni: new Date("2026-10-09T12:00:00Z"),
  umurMinimal: 6.44,
  baris: [
    { id: "c23", nama: "C23", kandang: "W1", umur: 16, clutch: 3, purchaseDate: "2025-05-07",
      tanggalClutch: ["2026-08-12", "2026-09-09", "2026-10-02"], ayah: ayahSatu("A40") },
    { id: "c22", nama: "C22", kandang: "W2", umur: 16, clutch: 1, purchaseDate: "2025-05-07",
      tanggalClutch: ["2026-09-14"], ayah: ayahSatu("A37") },
    { id: "c24", nama: "C24", kandang: "W3", umur: 16, clutch: 2, purchaseDate: "2025-05-07",
      tanggalClutch: ["2026-03-09", "2026-04-08"], ayah: ayahSatu("A36") },
    { id: "a31", nama: "A31", kandang: "W3", umur: 18, clutch: 2, purchaseDate: "2019-01-01",
      tanggalClutch: ["2026-09-04", "2026-10-01"], ayah: ayahSatu("A36") },
    ...["B30", "B44", "B84", "B42", "B46", "C19"].map((nama) => ({
      id: nama, nama, kandang: "Bonsai 3", umur: 16, clutch: 0, purchaseDate: "2024-12-26",
      tanggalClutch: [], ayah: ayahBanyak(["A30", "B11", "A33"]),
    })),
    ...["F27", "F29", "F28"].map((nama) => ({
      id: nama, nama, kandang: "E1", umur: 6.5, clutch: 0, purchaseDate: null,
      tanggalClutch: [], ayah: ayahMuda("Yuwono"),
    })),
    { id: "a45", nama: "A45", kandang: "W4", umur: 18, clutch: 0, purchaseDate: "2019-01-01",
      proven: true, tanggalClutch: [], ayah: ayahSatu("A32") },
    { id: "b1", nama: "B1", kandang: "W4", umur: 16, clutch: 0, purchaseDate: "2026-08-01",
      tanggalClutch: [], ayah: ayahSatu("A32") },
    { id: "b2", nama: "B2", kandang: "W4", umur: 16, clutch: 0, purchaseDate: "2024-12-26",
      tanggalClutch: [], ayah: ayahSatu("A32") },
  ],
  breedings: [
    ["C23", "2026-08-12", "A40"], ["C23", "2026-09-09", "A40"], ["C23", "2026-10-02", "A40"],
    ["C22", "2026-09-14", "A37"], ["C24", "2026-03-09", "A36"], ["C24", "2026-04-08", "A36"],
    ["A31", "2026-09-04", "A36"], ["A31", "2026-10-01", "A36"],
  ].map(([f, d, m]) => ({ female_id: f.toLowerCase(), female_name: f, egg_laying_date: d, male_name: m })),
  tortoises: [
    { id: "jA40", name: "A40", gender: "jantan", birth_date: "2018-05-01" },
    { id: "jA30", name: "A30", gender: "jantan", birth_date: "2012-05-01" },
    { id: "jB11", name: "B11", gender: "jantan", birth_date: "2010-01-01" },
    { id: "jA33", name: "A33", gender: "jantan", birth_date: "2010-01-01" },
    { id: "fc23", name: "C23", gender: "betina", purchase_date: "2025-05-07" },
  ],
};

/*
  Dialog "Cetak Label Kotak Telur" dengan DUA BELAS clutch — jumlah yang
  benar-benar aktif saat pemiliknya mengirim foto lembar A4-nya 10 Okt 2026.

  Daftar centangnya ditambahkan hari itu juga dan belum pernah diukur di lebar
  telepon: tiap barisnya berisi kotak centang, dua baris tulisan, dan ikon
  peringatan di kanan. Versi kosong tidak cukup — yang bisa terpotong baru
  muncul kalau barisnya banyak dan namanya panjang.
*/
const LABEL12 = Array.from({ length: 12 }, (_, i) => ({
  id: `k${i}`,
  male_name: ["A36", "A35", "A40", "A37", "A43"][i % 5],
  female_name: ["C6", "A46", "C23", "C22", "B108"][i % 5],
  egg_count: 13 + i,
  egg_laying_date: `2026-09-${String(1 + i).padStart(2, "0")}`,
  estimated_hatch_start: "2026-12-20",
  estimated_hatch_end: "2027-01-14",
  tray_number: i % 4 === 0 ? null : i,
  candling_day_30_done: false,
}));

/*
  Panel target tahunan, dengan angka PETERNAKAN SUNGGUHAN per 11 Okt 2026:
  343 dari 500 telur, dan omzet Rp 61.821.248 dari Rp 300 juta.

  Angka aslinya dipakai, bukan angka bulat, karena yang paling mungkin
  terpotong justru yang paling panjang — "Rp 61,8 jt / Rp 300 jt" di panel
  selebar 208px.
*/
// Telur per bulan 2026 yang sebenarnya: musim berhenti Mei-Juli, lalu mulai
// lagi September. Angka nyata dipakai supaya batang nol ikut teruji.
const TELUR_PER_BULAN = [0, 0, 48, 24, 0, 0, 0, 22, 136, 113, 0, 0];

const TARGET_NYATA = kemajuanTarget({
  goal: { year: 2026, egg_production_target: 500, revenue_target: 300000000 },
  telur: 343,
  omzet: 61821248,
  hariIni: new Date("2026-10-11T00:00:00Z"),
});

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

  /*
   * Tiga laporan gaji yang pada 30-09-2026 berubah dari halaman sendiri
   * menjadi tab di dalam RekapPoinGajiPage. Radix Tabs hanya memasang tab
   * yang aktif, jadi merender halaman induknya saja TIDAK membuktikan ketiga
   * tab ini bisa tampil — masing-masing harus dirender sendiri di sini.
   */
  ["LaporanGajiBulanan tanpa data", <LaporanGajiBulanan />],
  ["LaporanGajiHarian tanpa data", <LaporanGajiHarian />],
  ["LaporanBonusReward tanpa data", <LaporanBonusReward />],

  /*
   * Dua tab yang pada 30-09-2026 pindah dari /payroll-gaji ke dalam modul
   * gaji tunggal. Alasannya sama dengan ketiga laporan di atas: Radix Tabs
   * hanya memasang tab yang aktif, jadi merender halaman induknya tidak
   * membuktikan apa pun tentang keduanya.
   *
   * KonfigurasiGajiTab dirender dua kali dengan sengaja. `bolehUbah` salah
   * adalah jalur yang dilihat peran tanpa hak — jalur yang paling jarang
   * dibuka saat menguji dengan tangan, dan justru paling mudah rusak karena
   * ia mengembalikan pohon JSX yang sama sekali berbeda.
   */
  ["CatatanUpahTab kosong", <CatatanUpahTab bulan="2026-09" karyawan={[]} users={[]} bolehCatat />],
  ["KonfigurasiGajiTab boleh ubah", <KonfigurasiGajiTab bolehUbah />],
  ["KonfigurasiGajiTab tanpa hak", <KonfigurasiGajiTab bolehUbah={false} />],
  ["SalarySlipPage (Gaji Saya) tanpa data", <SalarySlipPage />],

  /* Dua halaman yang pada 30-09-2026 jadi tab di SOP & Tugas. Sama seperti
     ketiga laporan gaji di atas: Radix Tabs hanya memasang tab yang aktif. */
  ["TugasInsidentilTab tanpa data", <TugasInsidentilTab />],
  ["PerpustakaanSOPTab tanpa data", <PerpustakaanSOPTab />],

  /* Tiga halaman UANG yang jadi tab pada 30-09-2026. Semuanya menggambar
     angka uang dan grafik dari data yang bisa kosong. */
  ["BiayaOperasionalTab tanpa data", <BiayaOperasionalTab />],
  ["LaporanPenjualanTab tanpa data", <LaporanPenjualanTab />],
  ["PembeliTab tanpa data", <PembeliTab />],

  /* Tab yang mengembalikan 330 pesan yang selama ini tak terbaca ke layar
     kiper. Dirender tanpa user (kueri tidak jalan) — keadaan paling umum
     saat aplikasi baru dibuka. */
  ["CatatanUntukSayaTab tanpa data", <CatatanUntukSayaTab />],

  /* Editor bahan terpakai — dirender dengan nilai kosong DAN dengan nilai
     yang sudah terisi, karena daftarnya punya dua bentuk tampilan. */
  ["BahanTerpakaiEditor kosong", <BahanTerpakaiEditor nilai={[]} onChange={() => {}} />],
  /* Dipasang di AppLayout, jadi ia ikut dirender di SETIAP layar. Kalau ia
     melempar saat dimuat, seluruh aplikasi ikut mati. */
  ["PembaruanTersedia tanpa DOM", <PembaruanTersedia />],

  /* Satu layar kasbon, dua pintu — keduanya diuji, karena bedanya hanya
     kepala halaman dan justru di situlah penyatuan bisa patah. */
  ["PanelKasbon sebagai halaman", <PanelKasbon />],
  ["PanelKasbon sebagai tab", <PanelKasbon tanpaKepala />],
  ["BahanTerpakaiEditor terisi", <BahanTerpakaiEditor
    nilai={[{ sku: "PKN-001", nama: "Rumput", jumlah: 3, sumber: "pakan" }]}
    onChange={() => {}}
    stokPakan={[{ sku: "PKN-001", name: "Rumput", current_stock: 10, unit: "kg" }, { name: "Tanpa SKU" }]}
    barangGudang={[]}
  />],
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

  // Pencarian induk di modul Pembiakan. Nama kura di kebun ini berspasi ekor
  // dan berhuruf besar ("RD besar ", "8 BESAR"), jadi kasusnya memakai nama
  // yang panjang DAN angka pecahan sekaligus — itu kombinasi yang paling
  // mudah terpotong di layar 360px.
  ["RiwayatBertelurInduk belum ada hasil", <RiwayatBertelurInduk cari="A31" indukDicari={[
    { kunci: "a31", nama: "A31", clutch: [
      { status: "bertelur", egg_laying_date: "2026-10-01", egg_count: 22 },
      { status: "bertelur", egg_laying_date: "2026-09-04", egg_count: 23, hatched_count: 0 },
    ] },
  ]} />],
  ["RiwayatBertelurInduk sudah ada hasil", <RiwayatBertelurInduk cari="C24" indukDicari={[
    { kunci: "c24", nama: "C24", clutch: [
      { status: "selesai", egg_laying_date: "2026-03-09", egg_count: 25, hatched_count: 7 },
      { status: "selesai", egg_laying_date: "2026-04-08", egg_count: 24, hatched_count: 22 },
    ] },
  ]} />],
  ["RiwayatBertelurInduk nama panjang & campur", <RiwayatBertelurInduk cari="besar" indukDicari={[
    { kunci: "rd besar", nama: "RD besar", clutch: [
      { status: "selesai", egg_laying_date: "2026-08-01", egg_count: 10, hatched_count: 9 },
      { status: "bertelur", egg_laying_date: "2026-09-20", egg_count: 12 },
    ] },
    { kunci: "8 besar", nama: "8 BESAR", clutch: [
      { status: "bertelur", egg_laying_date: "2026-07-01", egg_count: 11 },
    ] },
  ]} />],
  // Clutch tanpa tanggal: "terakhir bertelur" harus berbunyi strip, bukan 1970.
  ["RiwayatBertelurInduk tanpa tanggal", <RiwayatBertelurInduk cari="X1" indukDicari={[
    { kunci: "x1", nama: "X1", clutch: [{ status: "bertelur", egg_count: 0 }] },
  ]} />],
  ["RiwayatBertelurInduk tidak ketemu", <RiwayatBertelurInduk cari="Z99" indukDicari={[]} />],
  // Tombol barang masuk/keluar di beranda. Dua tombol bersebelahan dengan
  // label panjang — kasus yang paling mudah terpotong di layar 360px.
  ["TombolStokCepat", <TombolStokCepat />],
  /*
    Bulan bertelur. Datanya NYATA (September 2026): tujuh clutch dari tujuh
    induk berbeda, 136 butir — tujuh keping nama berjejer, kasus yang mudah
    terpotong di layar 360px.
  */
  // Tab yang dipakai menjawab "betina mana yang berproduksi" — sampai hari
  // ini belum pernah dirender satu penjaga pun.
  ["PeringkatIndukan", <PeringkatIndukan />],
  /*
    Telur per tahun. Datanya NYATA: 2026 punya catatan, 2025 TIDAK — dan
    tahun kosong itu harus tetap muncul dengan kalimatnya sendiri, bukan
    sebagai "0 butir".
  */
  ["RekapTahunan 2026 vs 2025", <RekapTahunan tahunIni={2026} breedings={[
    { id: "1", female_name: "C23", egg_laying_date: "2026-10-04", egg_count: 24, status: "bertelur" },
    { id: "2", female_name: "A31", egg_laying_date: "2026-10-01", egg_count: 22, status: "bertelur" },
    { id: "3", female_name: "C24", egg_laying_date: "2026-04-08", egg_count: 24, hatched_count: 22, status: "selesai" },
    { id: "4", female_name: "C14", egg_laying_date: "2026-03-16", egg_count: 23, hatched_count: 20, status: "selesai" },
  ]} />],
  // Dua tahun yang sama-sama berisi -> baris selisihnya muncul.
  ["RekapTahunan dua tahun berisi", <RekapTahunan tahunIni={2026} breedings={[
    { id: "a", female_name: "C23", egg_laying_date: "2026-10-04", egg_count: 24, status: "bertelur" },
    { id: "b", female_name: "A31", egg_laying_date: "2025-05-02", egg_count: 31, hatched_count: 18, status: "selesai" },
    { id: "c", female_name: "C14", egg_laying_date: "2025-07-11", egg_count: 19, hatched_count: 9, status: "selesai" },
  ]} />],
  // Sama sekali belum ada catatan -> dua tahun kosong, tanpa angka nol.
  ["RekapTahunan kosong", <RekapTahunan tahunIni={2026} breedings={[]} />],
  /*
    Ubin ringkasan beranda. Dua keadaan yang berlawanan: hari yang ramai
    (ada kura sakit, ada tagihan, ada clutch mau menetas) dan hari yang
    tenang — pada hari tenang ubin kabar buruk harus MENGECIL, bukan hilang.
  */
  ["RingkasanAngka hari ramai", <RingkasanAngka ubin={[
    { kunci: "kura", ke: "/tortoise", label: "Kura di peternakan", nilai: 136, tingkat: "biasa" },
    { kunci: "telur", ke: "/breeding", label: "Telur aktif", nilai: 232, sub: "10 clutch dierami", tingkat: "biasa" },
    { kunci: "laba", ke: "/finance", label: "Laba 2026", nilai: "Rp 41.243.901", nada: "baik", tingkat: "biasa" },
    { kunci: "sakit", ke: "/health", label: "Kura sakit", nilai: 3, sub: "perlu diperiksa", nada: "bahaya", tingkat: "mendesak" },
    { kunci: "alert", ke: "#perlu-perhatian", label: "Perlu perhatian", nilai: 23, sub: "lihat daftarnya", nada: "mendesak", tingkat: "mendesak" },
    { kunci: "menetas", ke: "/breeding?tab=telur", label: "Clutch perlu dipantau", nilai: "3 clutch",
      sub: "1 lewat perkiraan · 2 sedang menetas — terdekat C23", nada: "bahaya", tingkat: "mendesak" },
  ]} />],
  ["RingkasanAngka hari tenang", <RingkasanAngka ubin={[
    { kunci: "kura", ke: "/tortoise", label: "Kura di peternakan", nilai: 136, tingkat: "biasa" },
    { kunci: "telur", ke: "/breeding", label: "Telur aktif", nilai: 232, sub: "10 clutch dierami", tingkat: "biasa" },
    { kunci: "laba", ke: "/finance", label: "Laba 2026", nilai: "Rp 41.243.901", nada: "baik", tingkat: "biasa" },
    { kunci: "sakit", ke: "/health", label: "Kura sakit", nilai: 0, sub: "✓ tidak ada", nada: "tenang", tingkat: "tenang" },
    { kunci: "alert", ke: "#perlu-perhatian", label: "Perlu perhatian", nilai: 0, sub: "✓ semua normal", nada: "tenang", tingkat: "tenang" },
  ]} />],
  ["BulanBertelur September", <BulanBertelur bulan="2026-09" breedings={[
    { id: "2", female_name: "A31", egg_count: 23, egg_laying_date: "2026-09-04", status: "bertelur" },
    { id: "3", female_name: "A46", egg_count: 22, egg_laying_date: "2026-09-04", status: "bertelur" },
    { id: "4", female_name: "A47", egg_count: 25, egg_laying_date: "2026-09-06", status: "bertelur" },
    { id: "5", female_name: "C23", egg_count: 23, egg_laying_date: "2026-09-09", status: "bertelur" },
    { id: "6", female_name: "C22", egg_count: 17, egg_laying_date: "2026-09-14", status: "bertelur" },
    { id: "7", female_name: "A48", egg_count: 13, egg_laying_date: "2026-09-26", status: "bertelur" },
    { id: "8", female_name: "B108", egg_count: 13, egg_laying_date: "2026-09-30", status: "bertelur" },
    { id: "9", female_name: "A31", egg_count: 22, egg_laying_date: "2026-10-01", status: "bertelur" },
  ]} />],
  // Induk yang bertelur DUA KALI dalam satu bulan — satu keping, bukan dua.
  ["BulanBertelur induk berulang", <BulanBertelur bulan="2026-09" breedings={[
    { id: "a", female_name: "RD besar ", egg_count: 23, egg_laying_date: "2026-09-02", status: "bertelur" },
    { id: "b", female_name: "rd besar", egg_count: 19, egg_laying_date: "2026-09-28", status: "bertelur" },
  ]} />],
  // Bulan yang dipilih tetapi tidak ada isinya -> kalimatnya, bukan kosong.
  ["BulanBertelur kosong", <BulanBertelur bulan="2026-01" breedings={[
    { id: "a", female_name: "A31", egg_count: 22, egg_laying_date: "2026-10-01", status: "bertelur" },
  ]} />],
  // Belum ada bulan dipilih -> harus DIAM.
  ["BulanBertelur belum dipilih", <BulanBertelur bulan="" breedings={[]} />],

  /*
    Hitung mundur. Empat keadaan yang benar-benar ada di data, dengan hari
    acuan dipatok supaya angkanya tidak berubah tiap hari penjaga dijalankan.
  */
  ["HitungMundur masih jauh", <HitungMundurMenetas hariIni={new Date("2026-10-04T10:00:00")}
    breeding={{ status: "bertelur", estimated_hatch_start: "2026-12-21", estimated_hatch_end: "2027-01-15" }} />],
  ["HitungMundur mendekati", <HitungMundurMenetas hariIni={new Date("2026-10-27T10:00:00")}
    breeding={{ status: "bertelur", estimated_hatch_start: "2026-10-31", estimated_hatch_end: "2026-11-25" }} />],
  ["HitungMundur masa menetas", <HitungMundurMenetas hariIni={new Date("2026-11-05T10:00:00")}
    breeding={{ status: "bertelur", estimated_hatch_start: "2026-10-31", estimated_hatch_end: "2026-11-25" }} />],
  ["HitungMundur lewat perkiraan", <HitungMundurMenetas hariIni={new Date("2026-12-01T10:00:00")}
    breeding={{ status: "bertelur", estimated_hatch_start: "2026-10-31", estimated_hatch_end: "2026-11-25" }} />],
  ["HitungMundur latar merah", <HitungMundurMenetas kontras hariIni={new Date("2026-11-05T10:00:00")}
    breeding={{ status: "bertelur", estimated_hatch_start: "2026-10-31", estimated_hatch_end: "2026-11-25" }} />],
  ["HitungMundur selesai", <HitungMundurMenetas tanggalSelesai="22 Jul"
    breeding={{ status: "selesai", estimated_hatch_start: "2026-06-27", estimated_hatch_end: "2026-07-22" }} />],
  // Tanpa satu pun tanggal perkiraan -> harus DIAM, bukan "NaN hari lagi".
  ["HitungMundur tanpa tanggal", <HitungMundurMenetas breeding={{ status: "bertelur" }} />],
  // Formulir pergerakan stok, dipakai beranda DAN tab Pergerakan. Diuji dua
  // arah karena tombol yang menyala saat dibuka berbeda.
  ["FormPergerakanStok masuk", <FormPergerakanStok tipeAwal="masuk" threshold={500000}
    feedstocks={[{ id: "f1", name: "Rumput", unit: "kg", price_per_unit: 2000, current_stock: 128 }]}
    warehouseItems={[{ id: "w1", name: "Kalsium karbonat (bahan Duta Repro v5)", unit: "gram", purchase_price: 4.2, current_stock: 30500 }]}
    onClose={() => {}} />],
  ["FormPergerakanStok keluar", <FormPergerakanStok tipeAwal="keluar" threshold={500000}
    feedstocks={[]}
    warehouseItems={[{ id: "w1", name: "Vitamin D3 100.000 IU/g (bahan Duta Repro v5)", unit: "gram", purchase_price: 0, current_stock: 0 }]}
    onClose={() => {}} />],
  ["TortoiseMorphSummary tanpa data", <TortoiseMorphSummary />],
  ["TortoiseMorphSummary morph tak berwarna", <TortoiseMorphSummary tortoises={[
    { morph: "normal", gender: "betina" },
    { morph: "het_albino", gender: "jantan" },
    { morph: "hypo", gender: "jantan" },
    { morph: "piebald", gender: "betina" },
    { morph: "", gender: "betina" },
    { gender: "jantan" },
  ]} />],
  /*
    Halaman yang kepala halamannya dipindahkan ke PageHeader pada 4 Okt 2026.

    Tiga puluh dua berkas disentuh dalam satu hari, dan yang memeriksanya cuma
    eslint — yang tahu kodenya SAH, bukan bahwa halamannya MAU TAMPIL. Satu
    prop yang tidak ditutup atau satu variabel yang pindah ruang lingkup lolos
    begitu saja. Di sinilah halamannya benar-benar dirender.
  */
  ["TermConditionSOPPage tanpa data", <TermConditionSOPPage />],
  ["RiwayatKlusterPage tanpa data", <RiwayatKlusterPage />],
  ["HubPage tanpa data", <HubPage />],
  ["BreedingDetailPage tanpa data", <BreedingDetailPage />],

  /*
    Tab "Naikkan produksi" DENGAN data, bukan hanya kosong.

    Dibangun 9 Okt 2026 dan sama sekali tidak masuk daftar ini, jadi tidak satu
    pun penjaga pernah menggambarnya: tulisan yang terpotong, kalimat yang
    berulang belasan kali, dan kalimat yang dipecah flex jadi kolom — ketiganya
    hanya terlihat sesudah komponennya benar-benar digambar dengan isi.
    Versi kosong tidak cukup; yang berulang hanya muncul kalau barisnya banyak.
  */
  ["NaikkanProduksi tanpa data", <NaikkanProduksi baris={[]} breedings={[]} tortoises={[]} hariIni={new Date("2026-10-09T12:00:00Z")} />],
  ["NaikkanProduksi dengan data", <NaikkanProduksi {...NAIKKAN} />],
  ["PanelTarget dengan angka nyata", <PanelTarget kemajuan={TARGET_NYATA} perBulan={TELUR_PER_BULAN} bulanIni={9} />],
  ["PanelTarget tanpa target", <PanelTarget kemajuan={null} />],
  /*
    Angkanya angka 11 Okt 2026 yang sebenarnya: 210 catatan Inisiatif dan
    dua slip September yang masih draft. Angka karangan yang pendek
    ("3 catatan") akan memberi panel ini lebar yang tidak pernah terjadi.
  */
  /*
    Angkanya angka antrean 12 Okt 2026 yang sebenarnya — 83 "Cari rumput",
    62 "Pakan adabra" yang disatukan dengan "Kasik pakan adabra", dan judul
    terpanjang yang benar-benar ada. Kelompok karangan yang judulnya pendek
    akan memberi panel ini lebar yang tidak pernah terjadi.
  */
  /*
    Tujuh lead NYATA, lengkap dengan kalimat harga yang benar-benar ditulis
    penjual di media sosial — termasuk "10.000/3kg, 8.000/3kg, 6.000/3kg,
    5.000/2kg" yang panjang, "nego", dan nama barang asing seperti "kabocca".
    Data karangan yang pendek akan memberi lebar yang tidak pernah terjadi.
  */
  ["Pasar sayur — tujuh lead nyata", (() => {
    const leads = [
      { id: "1", nama: "Max Cliink", yang_dijual: "Semangka", harga_disebut: "", status: "baru", sumber: "Info Jual Beli Buah Nganjuk Kediri Jombang" },
      { id: "2", nama: "Adinda", yang_dijual: "Sayur (tomat, jagung manis, terong, gondes)", harga_disebut: "10.000/3kg, 8.000/3kg, 6.000/3kg, 5.000/2kg", status: "baru", sumber: "Info Jual Beli Buah Nganjuk Kediri Jombang" },
      { id: "3", nama: "", yang_dijual: "sayur (kyuri, zucchini, kabocca, kentang, dll)", harga_disebut: "nego", status: "baru" },
      { id: "4", nama: "Budi Nuryanto", yang_dijual: "Waluh atau labu kuning", harga_disebut: "4rb per kg", status: "baru" },
      { id: "6", nama: "Bayu Prasetyo", yang_dijual: "Labu Madu", harga_disebut: "Obral", status: "baru" },
      { id: "7", nama: "Riska", yang_dijual: "Semangka", harga_disebut: "", status: "baru" },
    ];
    const pen = kumpulkanPenawaran({ leads });
    const barang = barangSerumpun(barangTersedia(pen));
    const penjual = penjualTermurah(pen);
    return (
      <div className="space-y-2">
        {penjual.map((p) => (
          <div key={p.dari} className="rounded-xl border border-border bg-card p-3">
            <p className="text-sm font-semibold text-foreground">{p.dari}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {p.jumlahBarang} barang · termurah Rp {p.termurah.toLocaleString("id-ID")}/kg · rata-rata Rp {p.rataRata.toLocaleString("id-ID")}/kg
            </p>
          </div>
        ))}
        {barang.map((b) => (
          <div key={b.nama.join("|")} className="rounded-xl border border-border bg-card p-3">
            <p className="text-sm font-semibold text-foreground capitalize">{b.nama.join(", ")}</p>
            <p className="text-[11px] text-muted-foreground">
              dari {b.penawaran.map((p) => p.dari).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
              {b.termurah ? ` · mulai Rp ${b.termurah.perKg.toLocaleString("id-ID")}/kg` : ""}
            </p>
          </div>
        ))}
      </div>
    );
  })()],
  /*
    Baris keandalan, dengan kalimat TERPANJANG yang bisa dihasilkannya:
    supplier yang menjanjikan "tiap 2 minggu" (nama irama terpanjang) tetapi
    datangnya lebih jarang, jadi ketiga potongan kalimat muncul sekaligus —
    "Terakhir N hari lalu · rata-rata tiap N hari · lebih jarang dari
    janjinya (tiap 2 minggu)".

    Kalimat itu tidak pernah terlihat pada data hari ini: nol pengiriman
    tercatat, jadi layarnya baru menampilkan baris "belum pernah kirim".
    Justru karena itu ia diuji di sini — bentuk yang paling panjang akan
    muncul pertama kali di HP pemiliknya, bukan di layar ini, kecuali
    diperiksa sekarang.
  */
  ["Keandalan supplier — kalimat terpanjang", (() => {
    const suppliers = [
      { id: "s1", name: "Budi Nuryanto Sayur Mayur Nganjuk", hp_whatsapp: "0812", rutin_kirim: true, irama_kirim: "2_minggu" },
      { id: "s2", name: "Adinda", hp_whatsapp: "0813", rutin_kirim: true, irama_kirim: "harian" },
      { id: "s3", name: "Max Cliink", hp_whatsapp: "0814", rutin_kirim: true, irama_kirim: "mingguan" },
      { id: "s4", name: "Bayu Prasetyo", hp_whatsapp: "0815", rutin_kirim: false, irama_kirim: "" },
    ];
    const movements = [
      // s1: dijanjikan 14 hari, nyatanya 45 → kalimat lengkap bertiga.
      { type: "masuk", supplier_id: "s1", date: "2026-07-20", total_value: 100 },
      { type: "masuk", supplier_id: "s1", date: "2026-09-03", total_value: 100 },
      { type: "masuk", supplier_id: "s1", date: "2026-10-18", total_value: 100 },
      // s2: harian dan memang harian → "sesuai janji".
      { type: "masuk", supplier_id: "s2", date: "2026-10-16", total_value: 100 },
      { type: "masuk", supplier_id: "s2", date: "2026-10-17", total_value: 100 },
      // s3: baru sekali datang — belum boleh dinilai.
      { type: "masuk", supplier_id: "s3", date: "2026-10-05", total_value: 100 },
      // s4: belum pernah sama sekali.
    ];
    const IR = { harian: "tiap hari", "2_hari": "tiap 2 hari", mingguan: "tiap minggu", "2_minggu": "tiap 2 minggu", bulanan: "tiap bulan", sesuai_pesanan: "sesuai pesanan" };
    const keandalan = keandalanSupplier({ movements, suppliers, hariIni: new Date("2026-10-18T00:00:00Z") });
    return (
      <div className="space-y-2">
        {keandalan.map((k) => (
          <div key={k.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{k.nama}</p>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {k.pengiriman === 0 ? "belum pernah kirim" : `${k.pengiriman}× kirim`}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {k.pengiriman === 0 ? (
                <>
                  Belum ada barang masuk yang menunjuk ke sini
                  {k.rutin && k.irama ? `, padahal ia menyanggupi kirim ${IR[k.irama] || k.irama}` : ""}.
                </>
              ) : (
                <>
                  Terakhir {k.hariSejakTerakhir === 0 ? "hari ini" : `${k.hariSejakTerakhir} hari lalu`}
                  {k.rataJeda != null && <> &middot; rata-rata tiap {k.rataJeda} hari</>}
                  {k.tepatJanji === true && <> &middot; <span className="font-semibold text-accent">sesuai janji {IR[k.irama] || k.irama}</span></>}
                  {k.tepatJanji === false && <> &middot; <span className="font-semibold text-amber-700 dark:text-amber-400">lebih jarang dari janjinya ({IR[k.irama] || k.irama})</span></>}
                  {k.tepatJanji === null && k.rutin && k.irama && k.pengiriman === 1 && (
                    <> &middot; menjanjikan {IR[k.irama] || k.irama}, baru sekali datang</>
                  )}
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    );
  })()],
  /*
    Enam supplier terdaftar, nol pengiriman — keadaan nyata 18 Okt 2026,
    sesudah enam lead dijadikan supplier. Namanya yang sebenarnya dipakai,
    termasuk "Sayur Surabaya (nama belum disebut)" yang panjang karena
    postingannya memang tidak menyebut nama penjualnya.

    Daftar nama yang digabung begini adalah satu kalimat panjang tanpa
    titik potong alami; kalau suatu saat ia diberi truncate atau wadah yang
    kaku, 280px yang pertama memperlihatkannya.
  */
  ["Keandalan — semua terdaftar, belum ada yang kirim", (() => {
    const nama = ["Max Cliink", "Adinda", "Sayur Surabaya (nama belum disebut)", "Budi Nuryanto", "Bayu Prasetyo", "Riska"];
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">{nama.length} supplier terdaftar,
          belum satu pun tercatat mengirim.</span>{" "}
          {nama.join(", ")}.
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">
          Peringkatnya terisi sendiri begitu barang masuk pertama menunjuk salah satu nama di
          atas &mdash; pilih supplier-nya di form Barang Masuk.
        </p>
      </div>
    );
  })()],
  /*
    Isian Harga Beli di formulir Tambah Tortoise, dengan pesan kesalahannya
    yang panjang. Formulir itu sendiri belum diukur di sini (ia butuh dialog
    dan beberapa kueri), tetapi bagian yang BARU bisa — dan pesan wajibnya
    adalah kalimat terpanjang yang bisa muncul di kolom selebar setengah
    layar pada HP terlipat.
  */
  ["Harga beli kura — pesan wajibnya", (() => (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Harga Beli <span className="text-red-500">*</span></p>
      <div className="h-9 rounded-md border border-border bg-card px-3 flex items-center text-sm text-muted-foreground">8000000</div>
      <p className="text-xs text-muted-foreground tabular-nums">Rp 8.000.000</p>
      <p className="text-xs text-red-600">
        Harga beli wajib diisi untuk kura yang dibeli &mdash; HPP saat dijual dihitung dari sini.
        Isi 0 bila hadiah/warisan.
      </p>
      <p className="text-xs text-muted-foreground">Dipakai menghitung HPP dan margin saat kura ini dijual nanti.</p>
      <p className="text-xs text-muted-foreground tabular-nums">Rp 0 &mdash; dicatat bermodal nol (hadiah/warisan)</p>
    </div>
  ))()],
  /*
    Satu baris layar Isi Harga Barang, dengan nama barang TERPANJANG yang
    benar-benar ada di gudang: "Moringa / kelor bubuk (TIDAK dipakai Duta
    Repro v7 — habiskan, jangan dibeli lagi)". Nama sepanjang itu bukan
    karangan — ia keterangan yang ditulis pemiliknya sendiri ke dalam nama
    barang, dan ia harus membungkus, bukan terpotong, di layar terlipat.
  */
  ["Isi Harga Barang — nama terpanjang", (() => (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-sm font-medium text-foreground break-words">
        Moringa / kelor bubuk (TIDAK dipakai Duta Repro v7 &mdash; habiskan, jangan dibeli lagi)
      </p>
      <div className="flex items-end gap-2 mt-2 flex-wrap">
        <div className="min-w-0 flex-1" style={{ minWidth: "128px" }}>
          <p className="text-[11px] text-muted-foreground">Harga per gram</p>
          <div className="h-9 mt-0.5 rounded-md border border-border bg-card px-3 flex items-center text-sm text-muted-foreground">19.6</div>
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums pb-2 flex-shrink-0">
          &times; 16000 gram = <b className="text-foreground">Rp 313.600</b>
        </p>
      </div>
    </div>
  ))()],
  /*
    Kartu Rincian Estimasi Aset dengan bentuk kawanan yang SEBENARNYA
    (18 Okt 2026): Sulcata menumpuk di pita 50–55, tiga Aldabra memegang
    seperenam nilainya, dan satu kelompok bernama panjang — "Sulcata · Het
    Caramel Albino · 75–80 cm · Belum diketahui · proven · WC" — yang
    memaksa baris "kelompok teratas" membungkus di HP terlipat.

    Angka ekornya dibuat mendekati kenyataan supaya persentasenya tidak
    bulat: porsi 84,8% / 14,6% / 0,4% / 0,2% jauh lebih mudah membuat baris
    melimpah daripada 50% / 50%.
  */
  ["RincianAset — kawanan nyata 18 Okt", (() => {
    const ekor = (n, o) => Array.from({ length: n }, (_, i) => ({
      id: `${o.species}${o.shell_length_cm}${o.gender}${i}`, code: `K${i}`, status: "aktif",
      morph: "normal", asal_genetik: "wc", is_proven: false, ...o,
    }));
    const kura = [
      ...ekor(31, { species: "sulcata", shell_length_cm: 52, gender: "betina", purchase_price: 8000000 }),
      ...ekor(13, { species: "sulcata", shell_length_cm: 57, gender: "betina", purchase_price: 8000000 }),
      ...ekor(7, { species: "sulcata", shell_length_cm: 56, gender: "betina", is_proven: true, purchase_price: 8000000 }),
      ...ekor(8, { species: "sulcata", shell_length_cm: 62, gender: "jantan", purchase_price: null }),
      /* Kelompok bernama terpanjang yang bisa terbentuk dari skema ini. */
      ...ekor(1, { species: "sulcata", morph: "het_caramel_albino", shell_length_cm: 76,
        gender: "belum_diketahui", is_proven: true, purchase_price: null }),
      ...ekor(1, { species: "aldabra", shell_length_cm: 76, gender: "betina", asal_genetik: "", purchase_price: null }),
      ...ekor(2, { species: "aldabra", shell_length_cm: 68, gender: "jantan", asal_genetik: "", purchase_price: null }),
      ...ekor(1, { species: "leopard", shell_length_cm: 39.5, gender: "betina", asal_genetik: "", purchase_price: 5000000 }),
      ...ekor(1, { species: "red_foot", shell_length_cm: 23, gender: "betina", asal_genetik: "", purchase_price: null }),
    ];
    const harga = [
      { kunci: "sulcata|normal|50|betina|-|wc", harga_min: 10000000, harga_maks: 12500000 },
      { kunci: "sulcata|normal|55|betina|-|wc", harga_min: 12500000, harga_maks: 15000000 },
      { kunci: "sulcata|normal|55|betina|proven|wc", harga_min: 15000000, harga_maks: 17500000 },
      { kunci: "sulcata|normal|60|jantan|-|wc", harga_min: 9000000, harga_maks: 12000000 },
      { kunci: "sulcata|het_caramel_albino|75|belum_diketahui|proven|wc", harga_min: 95000000, harga_maks: 140000000 },
      { kunci: "aldabra|normal|75|betina|-|?", harga_min: 75000000, harga_maks: 100000000 },
      { kunci: "aldabra|normal|65|jantan|-|?", harga_min: 60000000, harga_maks: 90000000 },
      { kunci: "leopard|normal|35|betina|-|?", harga_min: 5000000, harga_maks: 7000000 },
      { kunci: "red_foot|normal|20|betina|-|?", harga_min: 2500000, harga_maks: 3500000 },
    ];
    return (
      <RincianAset
        kura={kura}
        harga={harga}
        asetKura={nilaiAsetKura({ kura, harga })}
        modal={modalKerja({ kura, warehouse: [], modalKandang: null })}
      />
    );
  })()],
  /*
    Satu baris layar Isi Harga Beli Kura berikut kepala rombongan dan kotak
    isian massalnya — bagian yang paling sempit ruangnya, karena kotak angka
    132px dan keterangan ekornya berbagi satu baris.

    Isinya diambil dari kura yang benar-benar ada: "Red Foot - 02" adalah
    kode TERPANJANG di kawanan ini (13 huruf, dengan spasi dan tanda hubung
    yang bisa patah di tempat salah), dan AL02 keterangan terpanjangnya —
    "76 cm · betina · proven · Aldabra". Rombongan "Sumber tidak dicatat"
    adalah judul terpanjang dari kesembilan nilai `source`.
  */
  ["Isi Harga Beli — baris terpanjang", (() => (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Sumber tidak dicatat &middot; 13 ekor</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">13 diisi = <b className="text-foreground">Rp 104.000.000</b></p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-2.5 mb-2 flex items-end gap-2 flex-wrap">
        <div className="min-w-0 flex-1" style={{ minWidth: "132px" }}>
          <p className="text-[11px] text-muted-foreground">Satu harga untuk 22 ekor</p>
          <div className="h-9 mt-0.5 rounded-md border border-border bg-card px-3 flex items-center text-sm text-muted-foreground">8000000</div>
        </div>
        <div className="h-9 px-3 rounded-md border border-border flex items-center text-sm flex-shrink-0">Kosongkan</div>
      </div>
      {[["Red Foot - 02", "23 cm · betina · Red Foot"], ["AL02", "76 cm · betina · proven · Aldabra"]].map(([kode, rincian]) => (
        <div key={kode} className="rounded-xl border border-border bg-card p-3 flex items-end justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex-1" style={{ minWidth: "120px" }}>
            <p className="text-sm font-medium text-foreground break-words">{kode}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{rincian}</p>
          </div>
          <div className="flex-shrink-0" style={{ width: "132px" }}>
            <p className="text-[11px] text-muted-foreground">Harga beli</p>
            <div className="h-9 mt-0.5 rounded-md border border-border bg-card px-3 flex items-center text-sm text-muted-foreground">75000000</div>
          </div>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Isi <b className="text-foreground">0</b> untuk hadiah, warisan, atau kura yang harga belinya tidak bisa lagi
        ditelusuri. Nol adalah jawaban yang sah dan menghentikan penandaannya &mdash; dibiarkan kosong tidak.
      </p>
      {/* Baris yang sudah dinyatakan hasil tetasan sendiri: kotak tanggal,
          peringatan belum siap, dan keterangan terpanjang di layar ini —
          ketiganya berbagi satu baris selebar 132px di HP terlipat. */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-end justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex-1" style={{ minWidth: "120px" }}>
            <p className="text-sm font-medium text-foreground break-words">8KECIL</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 break-words">15 cm &middot; betina</p>
          </div>
          <div className="flex-shrink-0" style={{ width: "132px" }}>
            <p className="text-[11px] text-muted-foreground">Tanggal menetas</p>
            <div className="h-9 mt-0.5 rounded-md border border-border bg-card px-3 flex items-center text-sm text-muted-foreground">dd/mm/yyyy</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
          <span className="text-[11px] text-primary">&larr; Ternyata dibeli, isi harganya</span>
          <span className="text-[11px] text-amber-700 dark:text-amber-400">tanggal menetas belum diisi</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">
          Tanggal menetas dipakai menghitung umur di peternakan, dan HPP kura hasil sendiri dihitung dari
          situ &mdash; bukan dari tanggal beli. Tanpa tanggalnya, biaya pemeliharaannya hilang dari HPP tanpa
          tanda apa pun, jadi barisnya belum bisa disimpan. Asal genetiknya ikut diisi CB.
        </p>
      </div>
    </div>
  ))()],
  ["NilaiInisiatifSekaligus — antrean nyata", <NilaiInisiatifSekaligus
    settings={{ poin_tambahan_maks_harian: 30, poin_tambahan_opsi: [0, 5, 10, 15] }}
    logs={[
      ...Array.from({ length: 83 }, (_, i) => ({ id: "r" + i, item_label: "Cari rumput", period_key: "2026-0" + (7 + (i % 3)) + "-" + String((i % 28) + 1).padStart(2, "0"), done_by: "sholehuddin sholeh", done_by_email: "s@x", is_extra: true, approval_status: "pending" })),
      ...Array.from({ length: 40 }, (_, i) => ({ id: "p" + i, item_label: "Pakan adabra", period_key: "2026-08-" + String((i % 28) + 1).padStart(2, "0"), done_by: "sholehuddin sholeh", done_by_email: "s@x", is_extra: true, approval_status: "pending" })),
      ...Array.from({ length: 22 }, (_, i) => ({ id: "q" + i, item_label: "Kasik pakan adabra", period_key: "2026-09-" + String((i % 28) + 1).padStart(2, "0"), done_by: "Angsolo", done_by_email: "a@x", is_extra: true, approval_status: "pending" })),
      { id: "z1", item_label: "Nambal tempat minum yg bocor w1w2 e5", period_key: "2026-09-15", done_by: "sholehuddin sholeh", done_by_email: "s@x", is_extra: true, approval_status: "pending" },
    ]}
  />],
  ["PanelMenunggu — nyata 12 Okt", <PanelMenunggu antrean={susunAntrean({
    inisiatif: 210,
    slip: [{ status: "draft" }, { status: "draft" }],
    checklist: [{}, {}],
  })} />],
  ["PanelMenunggu — keempat barisnya sekaligus", <PanelMenunggu antrean={susunAntrean({
    inisiatif: 1250,
    slip: [{ status: "draft" }, { status: "approved" }, { status: "approved" }],
    checklist: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
  })} />],
  /*
    EggGrid dengan clutch yang sebenarnya dikeluhkan 22 Okt 2026: A35 × A47,
    25 butir, bertelur 6 September, candling-nya lewat H+30.

    Belum pernah diukur sebelumnya. Dua puluh lima tombol telur ditambah
    bilah ringkasan dan dua tombol massal adalah baris terpanjang yang bisa
    dibuat layar ini, dan keterangan "sudah jadi kura" yang baru ditambahkan
    duduk di baris yang sama dengan kedua tombol itu.
  */
  ["EggGrid 25 butir — clutch 6 September", <EggGrid breeding={{
    id: "uji", status: "bertelur", egg_count: 25, egg_laying_date: "2026-09-06",
    egg_records: Array.from({ length: 25 }, (_, i) => ({
      egg_number: i + 1,
      status: i === 0 ? "menetas" : i === 1 ? "gagal" : i < 6 ? "fertile" : i < 9 ? "infertil" : "belum_dicek",
      check_date: i < 9 ? "2026-10-20" : null,
      hatch_date: i === 0 ? "2026-10-20" : null,
      notes: "",
      tortoise_id: i === 0 ? "t1" : null,
      tortoise_code: i === 0 ? "BB-2026049" : null,
    })),
  }} />],
  /*
    Lencana asal di Silsilah, keempat bentuknya sekaligus, pada baris yang
    juga memuat kode kura dan ukurannya.

    Yang terpanjang bukan CB/WC melainkan cadangan "cara diperoleh" yang
    ditambahkan 23 Okt 2026 untuk 36 kura yang asal genetiknya belum
    ditentukan — "🛒 Sumber tidak dicatat" tiga kali lebih panjang daripada
    "❓ Asal?" yang digantikannya, dan ia duduk di baris yang sama dengan
    "Red Foot - 02", kode terpanjang di kawanan ini.
  */
  ["Silsilah — lencana asal terpanjang", (() => (
    <div className="space-y-2">
      {[
        ["Red Foot - 02", "23 cm", "🛒 Sumber tidak dicatat"],
        ["A95", "46 cm", "🛒 Beli lokal"],
        ["B106", "56 cm", "🌍 WC"],
        ["BB-2026049", "5,8 cm", "🐣 CB"],
        ["8KECIL", "15 cm", "❓ Asal?"],
      ].map(([kode, ukuran, lencana]) => (
        <div key={kode} className="rounded-xl border border-border bg-card p-3 flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{kode}</span>
          <span className="text-[11px] text-muted-foreground">{ukuran}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md border font-bold bg-muted text-muted-foreground border-border">{lencana}</span>
        </div>
      ))}
    </div>
  ))()],
  /*
    Spanduk nomor kembar di tab Pembeli, dengan nama profil terpanjang yang
    benar-benar ada sesudah penandaan 24 Okt 2026 —
    "[KEMBAR — HAPUS SAYA] Mr lee new hope" — tepat di atas kartu ringkasan
    yang menyempit jadi 150px.
  */
  ["PembeliTab — spanduk nomor kembar", (() => (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3">
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <b className="tabular-nums">4 nomor HP</b> dipakai lebih dari satu profil. Riwayat belanja orang yang
          sama terbelah dua, dan yang terpakai adalah profil yang kebetulan terambil lebih dulu &mdash;
          gabungkan atau hapus salah satunya.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-semibold break-words">[KEMBAR &mdash; HAPUS SAYA] Mr lee new hope</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 break-words">0821-2035-2060 &middot; 2 pembelian &middot; Rp 1.200.000</p>
      </div>
      <div className="grid gap-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {[["👥", "14", "Total Pembeli"], ["🌱", "4", "Baru (30 Hari)"], ["🔄", "2", "Repeat Buyer"], ["💰", "Rp 52.821.248", "Total Belanja"]].map(([ikon, nilai, label]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="text-2xl mb-1">{ikon}</div>
            <div className="text-sm font-bold break-words">{nilai}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </div>
  ))()],
  ["EggLabelGenerator 12 clutch", <EggLabelGenerator breedings={LABEL12} allActiveBreedings={LABEL12} open onClose={() => {}} />],
  ["PanduanPakanPage tanpa data", <PanduanPakanPage />],
  ["DailyTaskTemplatePage tanpa data", <DailyTaskTemplatePage />],
  ["WhatsAppLogPage tanpa data", <WhatsAppLogPage />],
  ["PanduanPenyakitDetailPage tanpa data", <PanduanPenyakitDetailPage />],
  ["TortoiseLabelPage tanpa data", <TortoiseLabelPage />],
  ["StockPredictionPage tanpa data", <StockPredictionPage />],
  ["PengaturanPoinPage tanpa data", <PengaturanPoinPage />],
  ["IncompleteDataPage tanpa data", <IncompleteDataPage />],
  ["IsiHargaBeliPage tanpa data", <IsiHargaBeliPage />],
  ["SystemMaintenancePage tanpa data", <SystemMaintenancePage />],
  ["CatatBiayaPage tanpa data", <CatatBiayaPage />],
  ["TemuanFotoPage tanpa data", <TemuanFotoPage />],
  ["ActivityLogPage tanpa data", <ActivityLogPage />],
  ["DeathRecordsPage tanpa data", <DeathRecordsPage />],
  ["EditProfilePage tanpa data", <EditProfilePage />],
  ["HRPage tanpa data", <HRPage />],
  ["InfoPage tanpa data", <InfoPage />],
  ["OtomatisasiPage tanpa data", <OtomatisasiPage />],
  ["PrinterConfigPage tanpa data", <PrinterConfigPage />],
  ["PengaturanWhatsAppPage tanpa data", <PengaturanWhatsAppPage />],
  ["LayarTimPage tanpa data", <LayarTimPage />],
  ["PembelianPage tanpa data", <PembelianPage />],
  ["UnifiedStokPage tanpa data", <UnifiedStokPage />],
];
