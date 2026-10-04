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
import RiwayatBertelurInduk from "@/components/breeding/RiwayatBertelurInduk";
import TombolStokCepat from "@/components/stok/TombolStokCepat";
import BulanBertelur from "@/components/breeding/BulanBertelur";
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
];
