# Satu baris setelan, tujuh kunci cache, dan nama perusahaan yang tidak mau berubah

**7 Oktober 2026**

Ini lanjutan dari laporan 6 Oktober. Di sana saya menutup dengan satu hal yang
sengaja dicatat sebagai belum dikerjakan:

> **Tujuh kunci cache untuk satu baris CompanySettings.** `company-settings`,
> `-main`, `-main-all`, `-keadaan`, `-musim`, `-hpp`, `-cost` — tujuh permintaan
> untuk satu baris yang sama, dan setiap penyimpanan harus ingat membatalkan
> ketujuhnya. Yang lupa satu akan menampilkan angka lama tanpa suara.

Setelah ditelusuri, ternyata bukan "akan". Sudah terjadi, di tiga tempat yang
bisa ditunjuk.

---

## 1. Jebakannya: nama kunci yang tampak bertingkat

Seluruh aplikasi membaca **satu baris**: `CompanySettings` dengan
`setting_key: "main"`. Tetapi baris itu diambil lewat tujuh kunci cache, karena
setiap layar baru dulu membuat kuncinya sendiri:

| Kunci | Pembaca |
|---|---|
| `company-settings` | 10 — OwnerDashboard, KepalaFeederDashboard, `useTestMode`, `useCostPerTortoise`, HRPage, FinancePage, PettyCashPage, TestModeBanner, TestModeSettings, AISaranToggle |
| `company-settings-main` | 15 — `useCompanySettings()`: slip gaji, KOP surat, laporan gaji, nilai poin, persetujuan SOP |
| `company-settings-main-all` | PengaturanPoinPage |
| `company-settings-keadaan` | `useKeadaanJadwal` |
| `company-settings-musim` | TreatmentPage |
| `company-settings-hpp` | PengaturanHPP |
| `company-settings-cost` | hitungan biaya per ekor |

Nama-nama itu **tampak** seperti susunan bertingkat, dan di situ seluruh
masalahnya: TanStack Query mencocokkan kunci **per bagian**, bukan per awalan
teks. `["company-settings"]` dan `["company-settings-main"]` masing-masing satu
bagian, dan teksnya berbeda — jadi menyegarkan yang satu **tidak menyentuh**
yang lain sama sekali.

Yang menulis kode itu hampir pasti mengira sebaliknya. Pola bertingkat memang
ada di TanStack Query, hanya bentuknya `["company-settings", "main"]` — dua
bagian, bukan satu bagian bertanda hubung.

## 2. Delapan penulis, tidak satu pun menyegarkan ketujuhnya

| Yang menyimpan | Yang disegarkan | Yang tertinggal |
|---|---|---|
| HRPage (identitas perusahaan) | `company-settings` | enam lainnya, termasuk `-main` |
| PengaturanPoinPage (nilai poin, target, bonus) | `-main`, `-main-all` | lima lainnya, termasuk `company-settings` |
| AISaranToggle | `company-settings`, `-main` | lima lainnya |
| TestModeSettings / TestModeBanner | `company-settings` | enam lainnya |
| TreatmentPage (musim bertelur) | `-musim`, `company-settings` | lima lainnya |
| FinancePage (fallback HPP) | `company-settings` | enam lainnya |
| PengaturanHPP (fallback HPP) | `-hpp`, `-cost` | lima lainnya |

Tiga akibat yang bisa ditunjuk:

### Nama perusahaan yang baru disimpan tidak muncul di slip gaji

HRPage menyimpan **seluruh** identitas perusahaan — nama, alamat, kota, telepon,
email, logo, nama dan jabatan direktur — lalu menyegarkan `company-settings`
saja.

Tetapi KOP surat, slip gaji, dan laporan gaji membacanya lewat
`useCompanySettings()`, yaitu kunci `-main`. Dan `useCompanySettings` punya
`staleTime: 30 detik`, jadi dalam setengah menit berikutnya **slip gaji masih
mencetak nama perusahaan yang lama** — dan setelah itu pun hanya berubah bila
ada yang memicu pengambilan ulang.

Ini justru hal yang hook itu ditulis untuk mengurusnya. Catatan di atasnya
berbunyi: *"Jangan pernah ambil record pertama tanpa filter — record lain adalah
sampah yang bisa salah ditampilkan di KOP surat, footer, tanda tangan, dan
nilai_per_poin."* Yang dijaga adalah baris mana yang dibaca; yang tidak terjaga
adalah apakah yang dibaca itu masih yang terbaru.

### Rupiah bonus di beranda pemilik memakai nilai poin yang lama

PengaturanPoinPage menyimpan `nilai_per_poin` lalu menyegarkan `-main` dan
`-main-all`. OwnerDashboard membacanya lewat `company-settings` dengan
**`staleTime` 15 menit DAN `refetchInterval: false`** — pengambilan ulang
otomatisnya dimatikan dengan sengaja, untuk menghemat permintaan.

Akibatnya angka rupiah bonus di beranda pemilik tetap dihitung dengan nilai poin
yang lama, sampai halaman dimuat ulang dari awal. Pemilik yang baru saja
mengubah Rp 50 menjadi Rp 100 per poin akan melihat angka yang sama persis dan
menyimpulkan simpanannya tidak jalan.

### Biaya per ekor memakai angka cadangan yang lama — dua arah

PengaturanHPP menyimpan `hpp_fallback_per_ekor` lalu menyegarkan `-hpp` dan
`-cost`; `useCostPerTortoise` membacanya lewat `company-settings`. Jadi biaya
per ekor — yang dipakai menghitung HPP, dan HPP yang dipakai menentukan harga
jual — tetap memakai angka lama.

Dan sebaliknya: FinancePage menyimpan **field yang sama** sambil menyegarkan
`company-settings` saja, sehingga layar PengaturanHPP yang menampilkannya ikut
tertinggal. Dua layar menyimpan satu angka, masing-masing menyegarkan separuh
pembaca, dan keduanya menampilkan angka yang berbeda.

**Tidak ada galat di satu pun kasus.** Yang terjadi hanya angka dan nama yang
sudah diganti tetap tampil seperti sebelum diganti — jenis cacat yang paling
lama tidak ketahuan, karena satu-satunya gejalanya adalah orang yang menyimpan
dua kali lalu menyangka dirinya salah ingat.

## 3. Perbaikannya: satu tempat, bukan delapan daftar

`src/lib/kunciSetelan.js`:

```js
export const KUNCI_SETELAN = [
  "company-settings", "company-settings-main", "company-settings-main-all",
  "company-settings-keadaan", "company-settings-musim",
  "company-settings-hpp", "company-settings-cost",
];

export function segarkanSetelan(qc) { … }   // menyentuh KETUJUHNYA
```

Kedelapan penulis sekarang memanggil `segarkanSetelan(qc)` — tidak ada lagi
yang menyusun daftarnya sendiri. `useCompanySettings` pun mengambil nama
kuncinya dari `KUNCI_UTAMA` di berkas yang sama, supaya kunci itu tidak bisa
berubah tanpa ikut berubah di daftar yang menyegarkannya.

**Jumlah kuncinya belum dikurangi**, dan itu disengaja. Menggabungkan tujuh
kunci menjadi satu berarti mengubah bentuk data yang dibaca 20 berkas sekaligus
— pengeditan besar pada berkas yang tidak sedang dikerjakan, tepat jenis
perubahan yang paling mudah membawa cacat baru. Yang diperbaiki sekarang adalah
akibatnya: tujuh kunci boleh tetap ada, asal penyegarannya satu.

## 4. Penjaga

**`cek-kunci` — tiga pernyataan baru:**

| Pernyataan | Diuji-merah dengan |
|---|---|
| Setiap penulis CompanySettings memanggil `segarkanSetelan()` | HRPage dikembalikan ke invalidasi sendiri → merah (dua temuan: tidak memanggil, dan menyusun sendiri) |
| Tidak ada yang menyusun invalidasi `company-settings` sendiri | sama seperti di atas → merah |
| Setiap kunci `["company-settings…"]` di kode terdaftar di `KUNCI_SETELAN` | `useCostPerTortoise` diberi kunci `-baru` → merah, menyebut berkas dan barisnya |
| Daftarnya sendiri terbaca | `KUNCI_SETELAN` diganti variabel lain → merah |

**`cek-ronda` — 7 kunci setelan, diuji perilakunya:** `segarkanSetelan`
dipanggil dengan QueryClient tiruan, dan setiap kunci di `KUNCI_SETELAN` harus
benar-benar tersentuh. Plus: `KUNCI_UTAMA` wajib ada di dalam daftar, dan
pemanggilan tanpa QueryClient tidak boleh melempar — penyimpanannya sudah
berhasil, dan penyegaran yang gagal bukan alasan menggagalkannya.

Diuji-merah: tubuh `segarkanSetelan` dipotong menjadi satu kunci → 7 temuan;
`KUNCI_UTAMA` digeser ke luar daftar → 1 temuan. Keduanya hijau lagi setelah
dikembalikan.

Pemeriksaan bentuk saja tidak cukup di sini: fungsi yang tubuhnya kosong akan
lolos penjaga statis dengan mulus, dan tidak menyegarkan apa pun.

---

# Bagian kedua: satu penyuntingan printer yang membatalkan seluruh cache

Setelah CompanySettings dibereskan, saya menyapu kunci cache lainnya untuk
melihat apakah polanya berulang. Hasilnya dua temuan di satu halaman, dan satu
kesimpulan yang juga perlu dikatakan: sapuan menyeluruhnya **tidak** bisa
dijadikan penjaga.

## 5. `invalidateQueries(["printers"])` — gaya v4 di aplikasi v5

Tiga pemanggilan di PrinterConfigPage memakai bentuk lama:

```js
qc.invalidateQueries(["printers"]);        // simpan, hapus, jadikan default
```

Di TanStack Query **v4** argumen pertama memang kuncinya. Di **v5** — yang
dipakai aplikasi ini (`^5.84.1`) — argumen pertama adalah objek **saringan**,
dan array yang dikirim ke sana tidak punya `queryKey`. Saringan tanpa
`queryKey` cocok dengan **semua** query.

Diuji langsung dengan pustaka yang terpasang, tiga query di cache:

```
invalidateQueries(["printers"])                → printers:true  tortoises:true  sales:true
invalidateQueries({ queryKey: ["printers"] })  → printers:true  tortoises:false sales:false
```

Jadi satu penyuntingan printer membatalkan **seluruh cache aplikasi**, dan
setiap query yang terpasang mengambil ulang datanya. Di ponsel dengan paket
data itu belasan permintaan sekaligus untuk satu baris yang berubah — dan data
segar di layar lain ikut dibuang.

Tidak ada galat dan tidak ada peringatan: v5 menerima argumen itu dengan diam.

## 6. Dua kunci untuk satu tabel printer — dan satu lembar label yang salah ukuran

Halaman Printer & Label membaca `PrinterConfig` lewat `["printers"]`.
`PemilihUkuranLabel` — yang menentukan ukuran label saat mencetak — membacanya
lewat `["printer-config"]`, dengan `staleTime` lima menit.

Dua kunci, satu tabel, dibaca tanpa saringan oleh keduanya. Jadi: ganti ukuran
gulungan di halaman printer, lalu buka dialog cetak dalam lima menit
berikutnya, dan labelnya masih dicetak dengan **ukuran gulungan yang lama**.
Yang terbuang di sini bukan satu permintaan jaringan, tetapi satu lembar label
yang ukurannya salah — pada printer yang gulungannya memang cuma satu jenis.

Diperbaiki dengan menyatukan kuncinya menjadi `["printer-config"]` di kedua
tempat. Tidak perlu daftar kunci seperti CompanySettings: dua pembaca tanpa
saringan memang seharusnya satu kunci.

## 7. Penjaga baru, dan satu penjaga yang SENGAJA tidak dibuat

`cek-kunci` bagian 3: tidak ada `invalidateQueries` / `refetchQueries` /
`removeQueries` / `resetQueries` / `cancelQueries` yang dipanggil dengan array
sebagai argumen pertama. Diuji-merah: satu pemanggilan dikembalikan ke gaya v4
→ merah, menyebut berkas, baris, dan potongan kodenya.

**Yang tidak dibuat, dan kenapa.** Godaannya besar: buat penjaga umum yang
mencari "tabel yang ditulis di satu layar tetapi kunci pembacanya tidak pernah
disegarkan". Saya mengukurnya dulu sebelum menulisnya — dan hasilnya **45 dari
64 tabel** kena, sekitar 200 kunci. Hampir semuanya tidak bercacat: layar di
halaman lain memang mengambil ulang datanya saat dibuka, dan itulah perilaku
bawaan TanStack Query.

Penjaga yang menyalakan 200 temuan untuk beberapa cacat nyata akan diabaikan
dalam seminggu, dan sesudah itu ia lebih buruk daripada tidak ada. Dua temuan
di atas ditemukan dengan **membaca** — satu per satu, memeriksa apakah layar
yang menyimpan benar-benar menampilkan nilai yang baru disimpannya.

Yang membedakan kasus CompanySettings sehingga ia LAYAK dijaga: nama-nama
kuncinya tampak bertingkat padahal tidak, sehingga penulisnya wajar mengira
sudah tercakup; `staleTime`-nya panjang dan pengambilan ulangnya dimatikan; dan
yang ditampilkan adalah nama perusahaan dan nilai uang di layar yang sama
tempat orang baru saja menyimpannya.

---

## Yang masih menunggu keputusan pemilik

Tidak berubah dari 6 Oktober:

1. **Sambungkan poin Inisiatif ke slip gaji?** Poin Inisiatif tersimpan di
   `MaintenanceLog`; slip gaji dan bonus bulanan menghitung dari
   `DailyChecklist`. 296 tunggakan yang dinilai belum menambah upah siapa pun.
2. **296 tunggakan dinilai semua, atau sejak tanggal tertentu saja?**
3. **Tujuh kunci digabung menjadi satu?** (bagian 3) Sekarang aman karena
   penyegarannya satu tempat; menggabungkannya tetap lebih bersih, tetapi
   menyentuh 20 berkas.

---

**Judul laporan ini menyebut setelan saja, tetapi isinya tiga cacat cache**
— CompanySettings (bagian 1–4), gaya v4 yang membatalkan seluruh cache
(bagian 5), dan dua kunci printer (bagian 6). Ketiganya satu keluarga: cache
yang dikira satu tempat padahal beberapa, atau sebaliknya.

**Pemeriksaan akhir:** 27 penjaga lolos (`node scripts/cek-semua.mjs` → "Semua
penjaga lolos"), eslint 0 error / 101 peringatan (batas tidak naik), `npx vite
build` selesai tanpa galat.
