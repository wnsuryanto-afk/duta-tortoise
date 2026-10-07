# Poin Inisiatif berhenti dibayar pada 28 Juli, dan satu karakter yang menyebabkannya

**7 Oktober 2026**

Kemarin saya menulis bahwa poin Inisiatif "belum dihitung slip gaji", dan
menaruhnya sebagai keputusan pemilik: *sambungkan ke slip gaji atau tidak?*

Setelah ditelusuri sampai ke ujungnya, pertanyaannya salah. Poin Inisiatif
**pernah dibayar** — sampai 28 Juli 2026. Yang terjadi sesudah itu bukan
kebijakan, tetapi regresi dari satu perbaikan yang benar.

---

## 1. Jalurnya, dan di mana ia terputus

Setiap `MaintenanceLog` disalin oleh fungsi backend `onMaintenanceDone` menjadi
satu baris di `DailyChecklist.completed_tasks` — dan `DailyChecklist` itulah
yang dibaca slip gaji dan bonus bulanan. Jadi jalurnya SUDAH ada; Inisiatif
tidak pernah berada di luar struktur yang dibayar.

Yang menentukan nilainya satu baris:

```js
const poinEarned = log.poin_earned ?? 0;   // sejak 28 Juli 2026
...
points: poinEarned,
```

Sebelum 28 Juli baris itu berbunyi:

```js
const poinEarned = log.poin_earned || 5;   // default 5 poin per task
```

`ExtraTaskForm` membuat Inisiatif dengan `poin_earned: 0` — dan sudah begitu
sejak 19 Juni. Dengan `||`, nol itu menjadi **5**, dan 5 poin masuk ke
`total_points_claimed` lalu dibayar. Dengan `??`, nol tetap **nol**.

Penggantian `||` menjadi `??` **benar**: `||` membuat nol yang DIPUTUSKAN
(penilai sengaja memberi nol) ikut tertimpa 5. Repo ini bahkan punya catatan
panjang tentang jebakan yang sama di `lib/poinChecklist.js`.

Tetapi tidak ada yang menggantikan 5 itu dengan penilaian sungguhan, karena
tombol penilaiannya ada dan tidak pernah dipakai — satu pun tidak, dalam tiga
setengah bulan. Jadi perbaikan yang benar menutup satu-satunya pembayaran yang
pernah diterima pekerjaan Inisiatif.

| | Catatan | Dibayar |
|---|---|---|
| 23 Juni – 27 Juli | 90 | 5 poin per catatan, lewat `total_points_claimed` |
| 28 Juli – 6 Oktober | 210 | **nol** |

210 catatan: **sholehuddin 143, Angsolo 67**. Bila dinilai 5 poin, itu 1.050
poin ≈ **Rp 52.500**; bila rata-rata 7,5 poin, ≈ Rp 78.750. Kecil sebagai uang.
Tidak kecil sebagai jawaban atas "apakah inisiatif saya dihitung".

### Kenapa tidak ada yang melihatnya

Tiga hal menutupinya sekaligus:

1. layar "Poin Saya" milik kiper membaca `MaintenanceLog.poin_earned`, bukan
   checklist — jadi di sana angkanya terlihat wajar;
2. `onMaintenanceDone` hanya MENAMBAH baris yang belum ada
   (`if (!alreadyExists) push`), jadi penilaian yang datang kemudian tidak
   pernah mengubah angka yang sudah tertulis;
3. tidak ada galat. Hanya satu kolom yang berisi 0.

## 2. Yang diperbaiki

Sesudah penilai menyimpan, poinnya **dituliskan ke baris checklist tanggal
itu**, dan `total_points_claimed` dihitung ulang dari seluruh barisnya — sama
persis dengan cara `onMaintenanceDone` menjaganya konsisten. Pemilik tetap yang
menyetujui klaim itu di layar Approval Poin; tidak ada poin yang menjadi uang
tanpa persetujuannya.

**Yang TIDAK disentuh:** `approved_points` pada checklist yang SUDAH disetujui.
Itu angka yang sudah dibayar, dan mengubahnya diam-diam adalah kesalahan yang
sama dengan memotong poin tanpa alasan. Untuk hari yang sudah disetujui,
barisnya tetap dibetulkan supaya catatannya jujur, dan layar **mengatakannya**:

> Checklist 2026-10-03 sudah disetujui, jadi poin ini belum ikut dihitung —
> setujui ulang checklist hari itu bila ingin dibayarkan.

Jadi keputusan membayar surut tetap milik pemilik, per hari, sadar.

### Satu jebakan yang ikut ditutup

Kiper bisa mencatat judul yang sama dua kali sehari — pada 23 Juni "Cari rumput"
tercatat dua kali. Di checklist keduanya mengenai **satu** baris, karena
`onMaintenanceDone` menyatukan baris berjudul sama. Jadi yang dituliskan adalah
**jumlah** poin yang disetujui untuk judul itu hari itu; menuliskan poin satu
catatan saja berarti penilaian kedua menimpa yang pertama, dan kiper kehilangan
poin yang sudah diberikan penilai.

## 3. Temuan kedua: pekerjaan checklist yang dicatat sebagai Inisiatif

"Siram tanaman" adalah tugas SOP **harian** bernilai 5 poin. Di antara 300
catatan Inisiatif ada **8 catatan berjudul persis itu** — dan pada hari-hari itu
tugas SOP-nya sendiri tidak tercentang. Bukan dibayar dua kali: dibayar nol
kali.

Penyebabnya bukan kecurangan dan bukan kelalaian: dua tombol yang sama-sama
berarti "sudah saya kerjakan", dan yang satu kebetulan bernilai nol. Kiper tidak
punya cara tahu bahwa pekerjaan yang baru ia catat sudah ada di daftarnya,
karena judulnya di sana berbunyi lain.

Sekarang pencocoknya (`src/lib/miripTugas.js`) memberi tahu **tiga** pihak:

- **kiper**, di dalam form Inisiatif sebelum ia menyimpan —
  *"Pekerjaan ini sepertinya sudah ada di checklist harian: 'Siram tanaman'
  (5 poin). Kalau memang tugas itu, centang di daftar tugas saja."*
  Peringatan, bukan penghalang: judulnya boleh kebetulan mirip sementara
  pekerjaannya memang berbeda, dan yang tahu bedanya orang yang baru saja
  mengerjakannya;
- **penilai**, di baris Inisiatifnya;
- **AI**, di dalam prompt — supaya usulannya poin terkecil, dengan alasan yang
  menyebutkan bahwa pekerjaan ini semestinya dicentang di checklist.

### Kenapa pencocoknya sempat salah, dan bagaimana diperbaiki

Versi pertama mengukur kemiripan dari sisi yang **lebih pendek**, dan saya
mengujinya dengan sepuluh judul SOP. Diuji dengan ketiga puluh tujuh judul yang
sebenarnya, **empat dari sembilan kecocokannya salah**:

```
"Bersihkan tempat cuci rumput" → "Bersihkan rumput di pagar"      (30 catatan!)
"Bersihkan kandang pagi"       → "Kebersihan jalan area kandang"
"Pangkas pohon buah juwet"     → "Pupuk pohon buah"
"Cabut rumput liar"            → "Potong bunga sepatu & rumput liar"
```

Sebabnya: judul Inisiatif biasanya cuma dua kata penting, dan kata seperti
"bersih", "kandang", "rumput", "pohon" muncul di belasan tugas SOP — dua kata
umum yang sama sudah cukup untuk disebut mirip.

Yang dipakai sekarang mengukur dari **gabungan** kedua sisi: kata yang hanya ada
di salah satu judul ikut menurunkan skornya. "tempat cuci", "juwet", dan "cabut"
adalah pekerjaan yang berbeda, dan sekarang terbaca begitu. Pada data nyata yang
tersisa tiga judul, dan ketiganya benar:

| Judul Inisiatif | Tugas checklist | Catatan |
|---|---|---|
| Siram tanaman | Siram tanaman (5 poin, harian) | 8 |
| Bersihkan kandang bonsai | Pembersihan kandang (8 poin) | 5 |
| Bersihkan kandang pagi | Pembersihan kandang (8 poin) | 3 |

## 4. Yang bukan cacat, dan perlu keputusan pemilik

Dari 300 catatan Inisiatif, **202 adalah empat pekerjaan yang berulang hampir
setiap hari** dan tidak ada di checklist mana pun:

| | Catatan | dalam 93 hari |
|---|---|---|
| Cari rumput | 82 | hampir tiap hari |
| Pakan adabra (+ "Kasik pakan adabra" 22) | 61 | hampir tiap hari |
| Bersihkan tempat cuci rumput | 30 | |
| Bersihkan tempat tamu | 29 | |

Ini bukan inisiatif, ini **pekerjaan rutin yang tidak pernah masuk daftar**.
"Beri makan iguana" ada di checklist harian; memberi pakan Aldabra tidak. Mencari
rumput untuk pakan tidak ada, padahal dikerjakan 82 kali.

Saya **tidak** menambahkannya sebagai SOPTask: beban tim sudah di batas ~11
tugas/hari, dan itu aturan Anda. Tetapi selama keempatnya hidup sebagai
Inisiatif, keempatnya perlu dinilai satu per satu, setiap hari, selamanya — 202
penilaian untuk empat pekerjaan yang jawabannya selalu sama.

**Pilihan yang ada:**

1. masukkan keempatnya ke checklist dengan poin tetap, dan hapus tugas lain yang
   sudah tidak dikerjakan supaya jumlahnya tetap ~11;
2. biarkan sebagai Inisiatif dan nilai lewat usulan AI (satu ketukan per baris);
3. gabungkan menjadi satu tugas checklist, misalnya "Pakan tambahan & kebersihan
   area luar", dengan poin yang mewakili keempatnya.

## 5. Satu aturan yang tadinya ditulis tiga kali

Untuk menuliskan poin ke baris yang benar, saya butuh kunci "tugas yang sama"
yang dipakai `onMaintenanceDone`. Kunci itu ternyata ditulis **tiga kali**: di
`src/lib/photoVerification.js`, di `src/lib/syncPhotoToChecklist.js`, dan di
dalam `onMaintenanceDone` sendiri. Ketiganya identik hari ini — dan di situlah
bahayanya: bila satu digeser, yang terjadi bukan galat. Sisi backend menganggap
tugasnya belum tercatat lalu menambahkannya lagi (poin yang diklaim membengkak),
sementara penulis di sisi frontend tidak menemukan barisnya dan **melewati
penulisan dengan diam** — ketiga jalur itu sudah menangani "baris tidak
ditemukan" sebagai keadaan normal, karena automasinya memang bisa belum selesai.

Sekarang satu tempat (`src/lib/kunciTugas.js`) dengan kembaran backend
(`base44/shared/kunciTugas.ts`), terdaftar di `cek-kembar` sehingga keduanya
tidak bisa melenceng.

Satu hal yang HARUS tetap begitu, dan sekarang dijaga: penanda `"Inisiatif"`
pada kolom `notes` **tidak** boleh dianggap "tanpa kandang". Kalau ia
dikosongkan, kunci Inisiatif "Siram tanaman" menjadi sama dengan kunci tugas SOP
"Siram tanaman" — dan poin Inisiatif akan menimpa 5 poin yang sudah sah di baris
tugas SOP.

## 6. Penjaga

**`cek-ronda` — 34 pemeriksaan baru:**

| Yang diuji | Diuji-merah dengan |
|---|---|
| 18 judul nyata terhadap pencocok tugas | pembagi dikembalikan ke sisi terpendek → 4 kecocokan salah muncul; ambang diturunkan ke 0,3 → 3 salah; `akar()` dimatikan → 2 kecocokan benar hilang |
| 13 kunci baris checklist | penanda "Inisiatif" dikosongkan → poin Inisiatif mengenai baris tugas SOP |
| 3 jumlah poin sejudul sehari | penjumlahan dihapus → penilaian kedua menimpa yang pertama; saringan "approved" dihapus → nilai yang belum disetujui ikut terbayar; saringan data uji dihapus → data Mode Uji ikut |
| `terapkanPoin` | `totalBaru` dihitung dari daftar lama → yang disetujui bukan yang tertulis; `slice()` dihapus → daftar aslinya ikut berubah |
| prompt AI menyebut tugas checklist yang mirip | prompt tanpa tugas mirip tidak boleh menyuruh poin TERKECIL |

**`cek-kembar`** — pasangan `kunciTugas.js` ↔ `kunciTugas.ts` (31 fungsi
diperiksa). Diuji-merah dengan menggeser `normalKandang` di satu sisi.

**`cek-keyakinan`** — tiga pernyataan baru: `ExtraTaskForm` memakai
`tugasMirip()`, `TugasHariIni` mengirim `tugasChecklist` ke form itu, dan
memanggil `tulisPoinInisiatif()` bersama `poinJudulHari()`. Plus satu penjaga
yang **saya perbaiki sendiri**: pemeriksaan "prop `mirip` terkirim" versi
pertama menghitung kemunculan teks dan tetap hijau ketika satu baris Inisiatif
kehilangan propnya — karena kemunculan ketiganya ada pada tag lain. Sekarang
dihitung **per tag**, dan ketiga penghapusan tertangkap satu per satu dengan
nomor barisnya.

---

**Pemeriksaan akhir:** 27 penjaga lolos, eslint 0 error / 101 peringatan (batas
tidak naik), `npx vite build` selesai tanpa galat.

## Keputusan yang menunggu Anda

1. **Empat pekerjaan rutin di bagian 4** — masuk checklist, tetap Inisiatif,
   atau digabung?
2. **210 catatan sejak 28 Juli** — dinilai dan dibayarkan surut (perlu
   menyetujui ulang checklist hari-hari itu), dinilai tanpa dibayar surut, atau
   dibiarkan?
3. Dua transaksi ganda 4 Oktober masih perlu Anda hapus lewat `/catat-biaya`;
   saya tidak punya alat hapus.
