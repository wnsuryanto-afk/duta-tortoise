# Poin Inisiatif: AI mengisi angkanya — dan 300 catatan yang tidak pernah bisa dinilai

**6 Oktober 2026**

Pemilik: *"Untuk SOP insidentil, sebaiknya ada nilai poinnya. Cara menghitung
nilai poinnya coba pakai AI, supaya poinnya terisi otomatis."*

Yang dikerjakan: usulan poin dari AI (bagian 1–3), satu temuan yang perlu
keputusan pemilik (bagian 4), penjaganya (bagian 5) — lalu, karena penjaga
tata letak ternyata berbohong selama berbulan-bulan, tiga layar yang mati
total dan 58 tulisan terpotong yang selama ini tidak terlihat (bagian 6–8).

---

## 1. Yang sebenarnya terjadi: 300 catatan, 93 hari, nol poin

Sapuan tabel `MaintenanceLog` hari ini:

| | |
|---|---|
| Catatan Inisiatif (`is_extra: true`) | **300** |
| Yang sudah pernah dinilai | **0** |
| Yang `poin_earned`-nya bukan nol | **0** |
| Hari berbeda yang terwakili | **93** (23 Juni – 6 Oktober) |
| Yang berfoto | **289** |
| Data uji / dikecualikan | **0** — semuanya pekerjaan nyata |

Pembagiannya: **sholehuddin sholeh 227**, **Angsolo 73**. Isinya bukan
pekerjaan sepele — "Cari rumput" 82 kali, "Pakan adabra" 39, "Bersihkan tempat
cuci rumput" 30, "Bersihkan tempat tamu" 29, dan di antaranya "Nambal kolam
azola", "Nambal tempat minum yg bocor", "Pasang gantungan slang".

Tiga setengah bulan orang mencatat pekerjaan di luar checklist, berfoto, dan
mendapat **nol** — setiap kali.

Penyebabnya dua, keduanya di kode, dan keduanya diperbaiki di sini.

### Sebab pertama: angkanya harus ditentukan dari nol, setiap baris

Penilai membuka baris, melihat empat tombol kosong (0 / 5 / 10 / 15), dan harus
memutuskan sendiri apakah "Siram odot" itu 5 atau 10 — untuk setiap baris,
setiap hari. Pekerjaan yang kecil tapi tidak pernah habis. Hasilnya bukan
penilaian yang buruk; hasilnya **tidak ada penilaian sama sekali**.

### Sebab kedua: hanya Inisiatif HARI INI yang pernah tampil

Baris Inisiatif dibangun dari log hari ini saja. Siapa pun yang mencatat
inisiatif hari Sabtu dan tidak kebetulan dilihat penilai hari Sabtu itu juga,
pekerjaannya **tidak pernah bisa dinilai lagi** — bukan ditolak, hanya tidak
pernah ditampilkan kembali. Dari 300 catatan, 296 di antaranya sudah lewat
tanggalnya.

Fungsi `inisiatifMenunggu()` di `lib/poinInisiatif.js` ditulis justru untuk
daftar ini, dan tidak pernah dipakai satu kali pun.

## 2. AI mengisi angkanya — usulan, bukan keputusan

`src/lib/usulPoinInisiatif.js` + `src/components/sop/UsulPoinAI.jsx`.

Begitu baris penilaian terbuka, AI membaca **judul, catatan kiper, dan foto
buktinya**, lalu mengembalikan satu angka dari daftar yang sah beserta satu
kalimat alasan dan tingkat keyakinan. Angkanya **langsung terpasang** di tombol
poin, jadi penilai cukup menekan "Simpan penilaian".

```
💡 Usul AI: 10 poin   [keyakinan sedang]
   Mencari dan mengangkut rumput untuk pakan, sekitar satu jam.
   Usulan saja — Anda yang memutuskan dan menyimpan.      [Pakai 10] [Ulang]
```

Pedoman yang dikirim ke model memakai aturan peternakan ini, bukan aturan yang
dikarangnya sendiri: pilihan poin yang sah diambil dari `poin_tambahan_opsi`,
dan pekerjaan **perbaikan** (menambal bocor, memperbaiki kran) dinilai lebih
tinggi daripada mengangkut atau merapikan dengan durasi sama, karena
menghindarkan kerusakan yang lebih besar.

**Satu ketukan, bukan nol ketukan.** Ini angka penilaian atas pekerjaan orang.
AI mengisi supaya penilai tidak mulai dari kosong; yang memutuskan tetap
manusia, alasannya selalu ikut tampil, dan angkanya tetap bisa diubah.

### Tiga jebakan keluaran AI yang ditutup

1. **Angka di luar daftar.** Model akan dengan senang hati menjawab 12 ketika
   pilihannya 0/5/10/15. `bacaUsul()` tidak memakai angka model sebagai poin —
   ia memilih yang **terdekat dari daftar sah** (seri dimenangkan yang lebih
   kecil) dan menandai `dibetulkan`, yang ditampilkan apa adanya di layar.
2. **`null` yang terbaca sebagai nol.** `Number(null)` adalah `0`, dan 0 **ada**
   di daftar pilihan. Tanpa pemeriksaan tipe, model yang menjawab `null`
   terbaca sebagai "mengusulkan 0 dengan sah" — penilai melihat usulan nol yang
   tampak meyakinkan. Karena itu `typeof mentah === "number"` diperiksa lebih
   dulu. Ini pola yang sama dengan teks `"null"` yang pernah lolos pemeriksaan
   kebenaran di aplikasi ini sampai mematikan satu halaman penuh.
3. **Jawaban tanpa alasan.** Usulan tanpa alasan selalu diturunkan ke keyakinan
   **rendah**, dan kalimatnya diganti menjadi "AI tidak memberi alasan —
   periksa sendiri sebelum memakai."

### Yang tidak pernah dilakukan berkas usulan

`UsulPoinAI.jsx` **tidak menyentuh `MaintenanceLog`, tidak menulis
`approval_status`, tidak menulis `poin_earned`.** Ia hanya mengisi angka di
layar. Yang menyimpan tetap `handleApproveExtra`, lewat tombol yang ditekan
manusia. Penjaganya menguji justru itu (bagian 5).

Saklarnya `poin_tambahan_usul_ai` di CompanySettings, bawaan **menyala**.
Terpisah dari `ai_saran_enabled` — mematikan catatan AI untuk kiper tidak boleh
sekaligus mematikan pengisian poin untuk penilai; keduanya tidak berhubungan.

## 3. Tunggakan 296 catatan sekarang bisa dinilai

Bagian baru di bawah daftar Inisiatif hari ini, hanya untuk yang boleh menilai:

> **Inisiatif menunggu dinilai · 296**
> Dari hari-hari sebelumnya. Sebelum ini hanya Inisiatif hari ini yang tampil,
> jadi yang terlewat sehari tidak pernah bisa dinilai lagi.

Lima baris sekaligus, dengan tombol "Tampilkan 5 lagi". **Dibatasi dengan
sengaja**: setiap baris yang tampil meminta satu usulan ke AI, dan membuka 296
tunggakan dalam satu tarikan berarti 296 pemanggilan sekaligus. Ada juga batas
60 pemanggilan per sesi tab — sesudahnya penilaian manual tetap jalan, hanya
usulannya berhenti. Usulan yang sudah diambil disimpan per id log, jadi
render ulang tidak menanyakan hal yang sama dua kali.

### Satu cacat kuota yang ikut ditutup

Batas harian 30 poin/orang dulu dihitung dari `allLogsToday` — daftar log
**hari ini**. Begitu tunggakan tanggal lain ikut bisa dinilai, daftar itu tidak
memuat tanggal log yang sedang dinilai sama sekali, sehingga kuota akan selalu
terbaca penuh dan batas harian berhenti berlaku untuk seluruh penilaian
tunggakan.

Sekarang kuota diambil **segar** untuk orang dan tanggal log itu pada saat
menyimpan. Itu juga menutup celah kedua: daftar di layar bisa berumur satu
menit, dan dua penilai yang menilai dua inisiatif orang yang sama pada menit
yang sama akan sama-sama melihat kuota yang sama lalu melewatinya bersama.

## 4. Temuan: poin Inisiatif tidak sampai ke slip gaji — belum diubah

Ini perlu diketahui sebelum 296 tunggakan dinilai.

Poin Inisiatif tersimpan di `MaintenanceLog.poin_earned`. Satu-satunya layar
yang membacanya adalah **"Poin Saya"** milik kiper sendiri
(`GuidedPoinSaya.jsx`).

Sedangkan uangnya dihitung dari tempat lain:

| Yang membayar | Sumber poinnya |
|---|---|
| Slip gaji (`hitungGaji`, `poinChecklist`) | `DailyChecklist.approved_points` |
| Bonus bulanan (`BonusBulanIni`, `statusBonus`) | `DailyChecklist` juga |
| Poin Saya (layar kiper) | `MaintenanceLog.poin_earned` |

Bonus poin peternakan **menyala** (`poin_bonus_enabled: true`, `nilai_per_poin:
50`). Jadi niat angkanya memang uang — tetapi jalur Inisiatif berhenti di satu
layar.

Bahwa ini cacat, bukan rancangan, terbaca dari `lib/claimIncidentalTask.js`:
tugas insidentil dari Owner **sengaja** dialirkan ke `DailyChecklist` hari itu,
dengan catatan tertulis *"TIDAK membuat jalur poin terpisah"*. Inisiatif
justru jalur terpisah itu.

**Belum diubah, karena ini keputusan uang, bukan keputusan kode.** Yang
dilakukan sekarang: layar penilaian mengatakannya apa adanya kepada penilai —

> Poin Inisiatif tampil di "Poin Saya" kiper; bonus bulanan dan slip gaji
> belum menghitungnya.

Usul bila pemilik setuju menyambungkannya: penilaian Inisiatif yang disetujui
ikut ditulis ke `DailyChecklist` tanggal itu sebagai satu baris
`completed_tasks`, persis cara `claimIncidentalTask` bekerja — satu jalur poin,
bukan dua. Perkiraan nilainya: 300 catatan × 5 poin × Rp 50 ≈ **Rp 75.000**
untuk 3,5 bulan, dibagi dua orang. Kecil sebagai uang; tidak kecil sebagai
jawaban atas "apakah inisiatif saya dihitung".

## 5. Penjaga

**`cek-ronda.mjs` — 9 kasus `bacaUsul()`:** angka sah 10 dan 0, di luar daftar
12 → 10, jauh di atas 10000 → 15, teks "sepuluh", `null`, string kosong,
negatif −5 → 0, hasil kosong. Setiap kasus memeriksa tiga hal: poinnya benar,
`dibetulkan` benar, dan hasilnya **selalu** salah satu pilihan yang sah. Plus:
usulan tanpa alasan harus berkeyakinan rendah.

Diuji-merah dua kali: menghapus pemeriksaan `typeof` → 2 kasus merah
(`null` dan string kosong terbaca sah); menghapus penggeseran ke daftar sah →
6 kasus merah.

**`cek-keyakinan.mjs` — bagian baru, 5 pernyataan:**

| Pernyataan | Diuji-merah dengan |
|---|---|
| `UsulPoinAI.jsx` ada | berkasnya dipindahkan → merah |
| Memanggil `bacaUsul()` | diganti pemakaian langsung → merah |
| Tidak membaca `hasil.poin` langsung | sama seperti di atas → merah |
| Tidak menyimpan penilaian sendiri | ditambah `MaintenanceLog.update` → merah |
| Terpasang di `TugasHariIni` | impor dihapus (tag tetap) → merah; tag dihapus (impor tetap) → merah |

Dua baris terakhir dipisah dengan sengaja: penjaga foto pernah tetap **hijau**
ketika importnya dihapus, karena tag JSX-nya masih ada di berkas.

---

# Bagian kedua: penjaga tata letak yang berbohong

Yang berikut ini tidak diminta. Ia ditemukan karena satu penjaga menyala merah
saat memeriksa pekerjaan di atas, lalu hijau lagi ketika dijalankan ulang —
dan penjaga yang jawabannya berubah-ubah adalah penjaga yang harus dibuka.

## 6. 110 dari 123 layar dilaporkan "bersih" tanpa pernah digambar

`cek-lebar` memasang setiap komponen di peramban sungguhan, lalu mengukur
tulisan yang terpotong. Cara kerjanya: ganti kasus, tunggu, ukur isi
`#bingkai`.

Kasus ke-13 — `KeeperDashboard tanpa data` — **melempar galat**. React 18
melepas SELURUH akar ketika tidak ada batas galat, jadi `#bingkai` lenyap dari
DOM. Dan `ukur()` dulu berbunyi:

```js
const bingkai = document.getElementById("bingkai");
if (!bingkai) return [];        // ← "tidak ada temuan"
```

Bingkai yang hilang dan bingkai yang bersih mengembalikan jawaban yang sama
persis. Sesudah kasus ke-13, **110 kasus berikutnya dilaporkan tidak ada
tulisan terpotong tanpa pernah sekali pun digambar** — dan laporannya tetap
menutup dengan "122 kasus diperiksa".

Tiga perbaikan:

1. Bingkai yang hilang sekarang mengembalikan temuan `"bingkai hilang"`,
   bukan daftar kosong.
2. Setiap kasus diperiksa: yang TERGAMBAR harus kasus yang DIMINTA. Nama yang
   tidak cocok atau bingkai yang tidak ada = kasus tidak terukur, dan penjaga
   gagal dengan menyebut namanya.
3. Harness-nya diberi **batas galat** per kasus. Satu kasus yang pecah tidak
   lagi membungkam seratus kasus lain; namanya dicatat dan dilaporkan
   tersendiri.

Ditambah: pengukuran dilakukan **dua kali** dengan satu putaran gambar di
antaranya, dan hanya yang muncul di kedua pengukuran dilaporkan. Sebabnya
nyata — dijalankan bersamaan dengan `vite build`, jeda tetap 250 ms tidak cukup
untuk Chromium yang berebut prosesor, dan penjaga sempat melaporkan 41 temuan
yang hilang begitu dijalankan sendirian. Penjaga yang berteriak tanpa sebab
akan diabaikan secepat penjaga yang diam.

Temuan juga sekarang menyebut **kelas elemen dan kelas induknya**, bukan hanya
tulisannya — tanpa itu yang memperbaiki harus menebak elemen mana di antara
belasan yang berbunyi sama.

## 7. Tiga layar yang mati total, dan sebabnya satu

Begitu batas galat dipasang, empat kasus melempar galat. Tiga di antaranya
cacat nyata di aplikasi, dari **satu sebab yang sama**:

> `queryKey: ["company-settings"]` dipakai belasan berkas dengan **dua bentuk
> data yang berbeda**.

| Bentuk | Berkas | Yang dibaca |
|---|---|---|
| ARRAY | `useTestMode`, `TestModeBanner`, `AISaranToggle`, `OwnerDashboard`, `KepalaFeederDashboard`, `useCostPerTortoise`, `HRPage`, `FinancePage`, `PettyCashPage`, `TestModeSettings` | `settings[0]` |
| OBJEK/null | `GuidedHariIni`, `GuidedPoinSaya`, `BonusBulanIni`, `KeeperDashboard`, `PoinBonusTim` | `settings?.nilai_per_poin` |

TanStack Query menyimpan per KUNCI, bukan per pemanggil. Keduanya membaca dan
menulis satu tempat yang sama, jadi **yang terakhir mengisi cache menentukan
bentuk data bagi semua pembaca** — dan mana yang terakhir berubah menurut
urutan komponen dipasang:

- bentuk objek menang → `settings[0]` pada objek memberi `undefined`, jadi
  **Mode Uji diam-diam mati** di setiap form yang memakai `useTestMode`; pada
  null ia MELEMPAR, dan **layar penuh mati tanpa pesan apa pun**;
- bentuk array menang → `settings?.nilai_per_poin` pada array memberi
  `undefined`, jadi **nilai poin, target bulanan, dan koordinat kandang jatuh
  ke angka bawaan tanpa suara**.

Yang pertama benar-benar terjadi: `KeeperDashboard`, `GuidedHariIni`, dan
`OwnerDashboard` mati dengan `Cannot read properties of null (reading '0')`.

Perbaikannya: kelima berkas bentuk-objek sekarang memakai
`useCompanySettings()` — satu hook yang sudah ada, kunci sendiri
(`["company-settings-main"]`), dan **selalu** mengembalikan objek.
`useTestMode` diberi lapisan kedua (`Array.isArray`), karena `= []` hanya
berlaku untuk `undefined`, bukan untuk `null`.

Kasus keempat, `HubPage`, membongkar `useViewAs()` yang bernilai null di luar
penyedianya. Hook itu sekarang mengembalikan nilai bawaan beku, bukan null —
membongkar null melempar TypeError yang mematikan halaman, dan "penyedianya
selalu ada" yang bergantung pada susunan komponen bukan jaminan.

### Penjaga baru: `cek-kunci`

Satu kunci cache, satu bentuk data — 313 kunci literal diperiksa. Bentuknya
dibaca dari TUBUH `queryFn` saja (versi pertama membaca 12 baris sesudah
`queryKey` dan menuduh tujuh kunci bercampur, padahal yang terbaca adalah
pemakaian SESUDAH query selesai).

Diuji-merah dua kali: mengembalikan `PoinBonusTim` ke bentuk lama → merah;
mengubah `useTestMode` menjadi bentuk objek → merah. Keduanya hijau lagi
setelah dikembalikan.

**Yang penjaga ini TIDAK lihat**, dan ditemukan dengan membaca: empat pembaca
`["attendance-today"]` memakai bentuk yang sama tetapi **pemilih baris yang
berbeda** — dua memakai `barisAbsensiSah` (sengaja memilih check-in paling
AWAL bila ada baris absensi kembar), dua memakai `res[0]` (urutan apa pun dari
server). Baris absensi kembar bukan kemungkinan teoretis di aplikasi ini —
itulah sebab `checkInSekali` dan `barisAbsensiSah` ada. Keduanya sekarang
memakai pemilih yang sama.

## 8. 58 tulisan terpotong yang selama ini tersembunyi

Dengan penjaga yang jujur, semua 122 kasus akhirnya benar-benar terukur —
dan hasilnya **4 temuan pada layar 360px** dan **54 pada wadah sempit**.

Empat yang pertama:

| Layar | Tulisan | Sebab |
|---|---|---|
| PanelKasbon (2 kasus) | "Ditolak" keluar 10px dari tepi | lima tombol saringan `flex` tanpa `flex-wrap` — di ponsel tombolnya tidak bisa ditekan sama sekali |
| PeringkatIndukan | "Pasangan Terbaik" +3px | tiga tab sepertiga layar; 115px tersedia, 118px dibutuhkan |
| DeathRecordsPage | "Semua Penyebab" +4px | pemicu `Select` selebar 160px |

54 sisanya **satu sebab yang sama di 14 layar**: titik henti Tailwind membaca
lebar LAYAR, bukan lebar WADAH. `grid-cols-2 md:grid-cols-4` di dalam wadah
320px memberi empat kolom selebar 71px — dikurangi bantalan kartu, tinggal
39px untuk tulisan, dan "Total Aktivitas" terpotong di tengah huruf.

Ini cacat yang sama persis yang dilaporkan pemilik 5 Oktober untuk ubin
ringkasan. Yang baru: sekarang terlihat bahwa ia ada di 14 layar lain —
ActivityLog, InfoPage, SystemMaintenance, PengaturanPoin, PrinterConfig,
OperationalToday, LaporanGajiBulanan, PeringkatIndukan, PembeliTab,
RekapPoinGaji, LaporanBonusReward, LaporanPenjualan, BiayaOperasional,
PengaturanWhatsApp.

Perbaikannya satu konsep, bukan 14 tambalan: `src/lib/kisiWadah.js`.

```js
kisiWadah(150)   // { gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }
```

`auto-fit` + `minmax` tidak punya titik henti sama sekali — ia membagi ruang
yang BENAR-BENAR ada. Wadah 320px memberi dua kolom, wadah 1000px memberi
enam, dan tidak ada ukuran di antaranya yang memotong tulisan. `RingkasanAngka`
yang sudah diperbaiki 5 Oktober ikut dipindahkan ke helper yang sama, supaya
aturannya satu tempat.

Sesudahnya: **0 tulisan terpotong, 122 kasus, keempat lebar wadah.**

---

## Yang perlu keputusan pemilik

1. **Sambungkan poin Inisiatif ke slip gaji?** (bagian 4) Bila ya, 296
   tunggakan yang dinilai akan masuk hitungan; bila tidak, angkanya tetap
   pencapaian di layar kiper saja.
2. **296 tunggakan dinilai semua, atau hanya sejak tanggal tertentu?** Menilai
   semuanya berarti membuka 60 baris per sesi tab, enam sesi.

## Yang belum dikerjakan, dan sengaja dicatat

**Tujuh kunci cache untuk satu baris CompanySettings.** `company-settings`,
`-main`, `-main-all`, `-keadaan`, `-musim`, `-hpp`, `-cost` — tujuh permintaan
untuk satu baris yang sama, dan setiap penyimpanan harus ingat membatalkan
ketujuhnya. Yang lupa satu akan menampilkan angka lama tanpa suara. Bentuknya
sekarang konsisten (penjaga `cek-kunci` menjaganya), tetapi jumlahnya belum
disederhanakan — itu pengeditan 20 berkas yang tidak sedang dikerjakan.

---

**Pemeriksaan akhir:** seluruh **27 penjaga lolos** (`node scripts/cek-semua.mjs`,
"Semua penjaga lolos"), eslint 0 error / 101 peringatan (batas tidak naik), dan
`npx vite build` selesai tanpa galat.
