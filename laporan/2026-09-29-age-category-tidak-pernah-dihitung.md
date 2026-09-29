# Kolom yang skemanya sendiri sebut "auto-calculated", dan tidak pernah dihitung

**Pemeriksaan 29 September 2026.** Bermula dari satu hal yang terlihat saat
membangun halaman Produksi Indukan: `age_category` kosong di hampir semua kura.

**Tidak ada data yang diubah.**

---

## Apa yang dijanjikan, dan apa yang ada

Skema `Tortoise.age_category` menuliskan aturannya sendiri:

> *"Kategori umur: baby (0-12 bln), juvenile (1-3 thn), dewasa (>3 thn).
> **Auto-calculated dari birth_date**."*

Kalimat terakhir tidak benar.

| Yang diperiksa | Hasil |
|---|---|
| Kura **aktif** | 136 |
| `age_category` terisi | **16** — semuanya `baby`, tukik 2026 |
| `age_category` **null** | **120** |
| Kode yang menghitungnya dari `birth_date` | **tidak ada satu pun** |

Rumusnya sendiri sebenarnya sudah ditulis — `calcAgeCategory` di
`components/tortoise/AgeDisplay.jsx` — dan hanya dipakai untuk **mewarnai satu
lencana** di kartu kura. Yang mengambil keputusan tidak pernah memanggilnya,
dan letaknya menjelaskan kenapa: sebuah pustaka jadwal tidak akan mengimpor
berkas komponen hanya untuk bertanya berapa umur seekor kura.

---

## Akibatnya pada jadwal timbang

`jadwalTimbang.golonganRutin()` menentukan siapa masuk jadwal timbang
14-harian. Ia memeriksa dua hal:

1. `age_category` bernilai `baby` atau `juvenile`
2. panjang tempurung di bawah 20 cm — cadangan

Kura yang gagal **dua-duanya** tidak sekadar salah golongan. Ia **hilang dari
daftar timbang sama sekali**, karena kura dewasa yang sehat dan makan memang
tidak pernah masuk daftar.

Dan justru kolom cadangan itulah yang paling sering kosong: **53 kura tidak
punya panjang tempurung**. Jadi dua kolom yang kosong bertemu, dan yang jatuh
di antaranya adalah kura yang paling perlu diikuti pertumbuhannya.

---

## Berapa kura yang benar-benar terdampak: satu, bukan tiga

Tulisan pertama saya di dalam kode menyebut **tiga** kura: Yuwono, Red Foot -
02, dan H3. **Ujinya yang membetulkan saya.**

| Kura | Lahir | Umur 29 Sep 2026 | Menurut aturan skema | Masuk jadwal? |
|---|---|---|---|---|
| **H3** | 2024-01-01 | 2 th 9 bln | juvenile | **tidak → sekarang ya** |
| 8 KECIL | 2024-01-01 | 2 th 9 bln | juvenile | sudah ya (tempurung 15 cm) |
| Yuwono | 2023-05-01 | 3 th 4 bln | **dewasa** | tidak, dan tetap tidak |
| Red Foot - 02 | 2023-05-01 | 3 th 4 bln | **dewasa** | tidak, dan tetap tidak |

Yuwono dan Red Foot - 02 sudah lewat batas tiga tahun, jadi menurut aturan
aplikasi ini sendiri mereka memang dewasa. Mereka tetap di luar jadwal — tetapi
bukan karena cacat ini, melainkan karena batas umurnya. Itu **sisa masalah yang
dibiarkan terbuka**, bukan sesuatu yang diperbaiki diam-diam: menggeser batas
"dewasa" untuk sulcata — yang sebenarnya baru matang pada umur belasan tahun —
adalah keputusan pemeliharaan, bukan keputusan kode.

### Nilai sebenarnya ada di masa depan, bukan pada satu kura itu

Enam belas tukik 2026 hari ini bernilai `age_category: "baby"`, ditulis sekali
saat menetas dan **tidak pernah diperbarui sesudahnya**. Tanpa perbaikan ini,
mereka akan terbaca "baby" selamanya — masih ditimbang tiap 14 hari pada umur
sepuluh tahun, dan ikut terhitung sebagai bayi di setiap layar yang
menghitungnya.

---

## Yang diperbaiki

`lib/umurKura.js` — satu tempat yang tahu umur kura, dipakai oleh jadwal
timbang, pustaka produksi indukan, dan lencana di kartu kura.

**Urutannya sengaja dibalik dari yang biasanya benar: tanggal lahir DULU,
kolom tersimpan belakangan.** Biasanya nilai yang pernah ditulis manusia
didahulukan. Di sini tidak, karena golongan umur adalah fungsi dari umur — ia
tidak pernah merupakan keputusan yang perlu dilindungi. Nilai yang tersimpan
hari ini pun bukan keputusan: ia snapshot saat menetas. Kolom tersimpan tetap
dipakai ketika tanggal lahirnya tidak ada, karena di situ ia satu-satunya yang
tahu.

Ikut terbawa: `betinaDewasa()` di pustaka produksi indukan dulu membaca
`age_category` mentah, artinya setiap kura tanpa kolom itu dianggap dewasa.
Sekarang ia memakai aturan yang sama.

---

## Yang diuji

25 uji memakai data nyata kebun, semuanya lulus. Yang paling berguna justru
yang **gagal lebih dulu**:

| Uji | Yang ditangkapnya |
|---|---|
| "tiga kura muda masuk jadwal" | **gagal** — ternyata hanya satu; dua lainnya sudah 3 th 4 bln |
| "betinaDewasa mengecualikan yang masih tumbuh" | **gagal** — Red Foot - 02 memang dewasa menurut aturannya |
| "SEBELUM: H3 tidak punya alasan timbang" | **gagal** — ujinya sendiri cacat: ia mengaku menguji perilaku lama padahal memanggil fungsi yang sudah diperbaiki, jadi tidak pernah bisa gagal karena alasan yang benar. Diganti dengan yang membuktikan klaim sesungguhnya: kura yang gagal saringan memang jatuh ke "tidak ada alasan sama sekali", bukan pindah golongan. |

Sisanya menjaga batas-batasnya: 11 bulan = baby, 13 bulan = juvenile, 2,9 th =
juvenile, 3,1 th = dewasa, tanggal lahir di masa depan dan tanggal ngawur
sama-sama `null`, tukik 2026 tetap baby, dan kura dewasa 18 tahun tetap tidak
masuk jadwal.

---

## Keputusan pemilik, 29 September 2026: juvenile sampai 6 tahun

Pertanyaannya: apakah batas "dewasa >3 tahun" masuk akal untuk sulcata?

**Jawaban pemilik: tidak — juvenile sampai 6 tahun.**

Enam cocok dengan bukti kebun ini sendiri: betina pertama yang pernah bertelur
di sini berumur **6,4 tahun**, jadi di bawah enam tahun belum ada satu pun yang
terbukti dewasa. Batasnya kini tetapan bernama (`BATAS_JUVENILE`) supaya
pergeseran berikutnya cukup satu baris dan alasannya tetap menempel.

### Beban tim: 6 kura tambahan, semuanya tanpa panjang tempurung

| | Batas 3 th | Batas 6 th |
|---|---|---|
| Masuk jadwal timbang | 18 | **24** |
| Per hari | 1,3 | **1,7** |

Yang bertambah — dan ini menyambung ke masalah 53 panjang tempurung yang hilang:

| Kura | Umur | Panjang tempurung |
|---|---|---|
| HF6, HF1, F23, RD besar | 5 th 8 bln | **belum diisi** |
| Yuwono, Red Foot - 02 | 3 th 4 bln | **belum diisi** |

Keenamnya tidak punya panjang tempurung. Jadi menimbang mereka sekaligus
mengisi kolom yang selama ini membuat mereka tidak terlihat.

### Akibat yang tidak terduga, dan justru berguna

Yuwono adalah **satu-satunya jantan di kandang E1** (14 betina). Pada umur
3 tahun 4 bulan ia kini juvenile — jadi ia berhenti dihitung sebagai calon
ayah, dan tujuh betina dewasa di E1 pindah dari "ayah pasti Yuwono" ke "ayah
tidak bisa dipastikan".

Itu lebih benar: sulcata jantan seumur itu belum matang. Tetapi kalimatnya
harus jujur. Halaman sempat akan berbunyi **"tidak ada jantan"** padahal
Yuwono ada dan terlihat setiap hari. Dua keadaan itu menuntut tindakan yang
berbeda — yang satu perlu jantan dipindahkan ke sana, yang satu cuma perlu
waktu — jadi keduanya dibedakan: **"jantan belum cukup umur"**.

### Angka halaman Produksi Indukan yang berubah

| | Sebelum | Sesudah |
|---|---|---|
| Betina dewasa | 89 | **82** |
| Belum ada catatan bertelur | 81 | **74** |
| Ayah tidak bisa dipastikan | 47 | **54** |
| Kandang terlacak | 10 | **9** |

Dua gerbang umur di halaman itu — golongan umur, dan umur termuda yang pernah
bertelur — kini **sepakat**: "belum cukup umur" turun dari 7 menjadi 0, karena
yang belum cukup umur sudah tersaring lebih dulu.

---

## Kesalahan saya, dan penjaga yang saya lewatkan

Repo ini punya `scripts/cek-kembar.mjs`: penjaga terhadap pergeseran diam-diam
antara pustaka frontend dan kembarannya di backend, yang ditulis dua kali
karena Deno tidak bisa mengimpor dari `src/`.

**Commit saya sebelumnya melenceng, dan saya tidak menjalankan penjaga itu.**
Saya mengubah `golonganRutin` di `src/lib/jadwalTimbang.js` tanpa menyentuh
`base44/shared/timbang.ts`. Selama satu commit, layar dan otomatisasi malam
menjawab berbeda untuk pertanyaan yang sama. Penjaganya bekerja; yang tidak
bekerja adalah kebiasaan menjalankannya.

### Dan penjaga itu sendiri sudah lumpuh

Memeriksanya menemukan hal yang lebih buruk: `cek-kembar` **selalu merah**,
karena ia mencari `selisihHari` di `jadwalTimbang.js` — padahal di sana fungsi
itu hanya diimpor ulang dari `lib/safeDate.js`. Satu kegagalan tetap,
selamanya. Dan penjaga yang selalu merah sama saja dengan penjaga yang mati:
justru itulah sebabnya pergeseran nyata saya lolos — barisan merahnya sudah
biasa dilihat.

Memaksa kedua badan fungsinya identik juga salah: versi frontend memakai
tengah malam **setempat** (browser di Jakarta), versi backend memakai
`Date.parse` (Deno berjalan di UTC). Perbedaan itu disengaja dan benar.

Yang dijaga sekarang bukan bentuknya melainkan **janjinya**: untuk masukan
`"YYYY-MM-DD"` di kedua sisi — satu-satunya bentuk yang dilempar pemanggil mana
pun — keduanya harus menjawab angka yang sama. **Diuji pada 1681 pasangan
tanggal: nol beda.** Keduanya baru berbeda bila salah satu sisinya berupa waktu
berjam (`...T23:00:00`), dan tidak ada pemanggil yang menghasilkannya.

`cek-kembar` sekarang keluar dengan kode 0. Kemerahannya berarti sesuatu lagi.

### Keadaan penjaga lainnya

Dijalankan berpasangan, dengan dan tanpa perubahan hari ini:

| | Penjaga gagal |
|---|---|
| Tanpa perubahan hari ini | **6** |
| Dengan perubahan hari ini | **5** |

Lima yang tersisa sudah ada sebelumnya dan tidak tersentuh: `cek-impor`
(2 pemakaian tanpa import), `cek-kolom-hantu`, `cek-batch`, `cek-batas`
(satu `.filter()` tanpa limit di `autoAttendance`), dan `cek-laporan`
(`lib/kueriUang.js` membaca Sale/FinanceTransaction tanpa penyaring laporan).
Dicatat di sini supaya tidak hilang lagi.
