# Audit 13 modul area Kura: mana yang perlu, mana yang bisa disatukan, mana yang perlu dimaksimalkan

**Permintaan pemilik, 30 September 2026:** cek semua modul di area Kura — apa
yang bisa disederhanakan tanpa mengurangi fungsi, apakah fungsinya diperlukan,
dan apakah ada fungsi yang perlu dimaksimalkan.

**Tidak ada data yang diubah.**

---

## Angka yang melatari seluruh audit

| | |
|---|---|
| Halaman di area Kura | **13** |
| Baris kode seluruhnya | **±5.500** |
| Catatan `Breeding` di database | **10** |
| Halaman yang menganalisis 10 catatan itu | **5** |

Lima dari tiga belas halaman ada untuk membaca sepuluh baris yang sama.

---

## Tabel lengkap

| # | Modul | Baris | Data nyata | Vonis |
|---|---|---|---|---|
| 1 | **Daftar Kura** | 1.071 | 178 kura, 5 tab | **inti** — sudah menyerap Kandang |
| 2 | **Catatan Sakit** | 349 | 18 catatan | **perlu** |
| 3 | **Panduan Penyakit** | 153 + 229 | 19 protokol aktif | **perlu** — rujukan, bukan alur kerja |
| 4 | **Breeding & Telur** | 866 | 10 clutch, **6 tab** | **inti breeding** |
| 5 | **Kalender Breeding** | 254 | 10 clutch | **bisa disatukan** ke #4 |
| 6 | **Produksi Indukan** | 484 | dibangun 29 Sep | **perlu** — satu-satunya yang menjawab produksi |
| 7 | **Inkubator** | 321 | **2 pembacaan, terakhir 1 Juni** | **perlu, tapi mati** → lihat bawah |
| 8 | **Silsilah** | 382 | 49 kura punya induk — **semuanya bayi, dari 2 pasangan** | **perlu, dangkal karena data** |
| 9 | **Cetak Label QR** | 232 | alat mandiri | **perlu, jangan disentuh** |
| 10 | **Catatan Kematian** | 431 | 3 kura mati | **bisa disatukan** ke #1 |
| 11 | **Deteksi Kura Diam** | 189 | laporan backend | **perlu** |
| 12 | **Ranking Indukan** | 350 | 8 pasangan dari 10 clutch | **bisa disatukan** ke #13 |
| 13 | **Laporan Breeding** | 245 | 10 clutch | **bisa disatukan** ke #12 |

---

## 1. Yang paling perlu dimaksimalkan: Inkubator

Ini temuan terpenting dari audit, dan bukan soal tampilan.

| | |
|---|---|
| Clutch yang **sedang dierami** sekarang | **7** |
| Telur di dalamnya | **145** |
| Telur tertua masuk inkubator | **12 Agustus 2026** |
| Catatan suhu/kelembapan yang pernah dibuat | **2** |
| Pembacaan terakhir | **1 Juni 2026** — 121 hari lalu |

**Belum ada satu pun pembacaan sejak telur pertama dari kelompok ini masuk.**

Sulcata menetas pada 80–105 hari di suhu 31°C. Suhu menentukan bukan hanya
berhasil-tidaknya menetas, tetapi juga lamanya. Kalau nanti ada clutch yang
gagal, tidak ada satu angka pun yang bisa menjelaskan kenapa.

Halaman Inkubator dan formulir pencatatnya **sudah lengkap sejak lama** — ini
bukan alat yang kurang. Yang kurang sesuatu yang mengingatkan bahwa ia ada:
pola yang sudah berulang di aplikasi ini (RempesanLog nol catatan, Perkawinan
nol catatan).

**Sudah dikerjakan:** kartu penagih di halaman Breeding & Telur yang menyebut
angka nyatanya dan menautkan langsung ke pencatatnya. Ia **tidak muncul sama
sekali** ketika tidak ada telur yang dierami — kartu yang selalu ada berhenti
dibaca.

Ambangnya sengaja **tidak dikarang**. Berkas ini tidak memutuskan "berapa hari
sekali seharusnya dicatat" — itu keputusan pemeliharaan. Yang dipakai fakta
yang tidak perlu ambang: **apakah ada pembacaan sejak telur tertua masuk.**
Kalau tidak ada, kalimatnya bukan "sudah lewat jadwal" melainkan "belum pernah
sekalipun".

---

## 2. Yang bisa disatukan tanpa kehilangan fungsi

### a. Laporan Breeding + Ranking Indukan → satu

Keduanya membaca **10 catatan yang sama** dan menjawab **pertanyaan yang sama**
— pasangan mana yang paling produktif — dengan dua tata letak:

| Laporan Breeding (245 baris) | Ranking Indukan (350 baris) |
|---|---|
| Ringkasan tahun: sesi kawin, total telur, menetas, tingkat penetasan | Tab: Pasangan / Induk Jantan / Induk Betina |
| Ringkasan **per pasangan**: telur, menetas, tingkat penetasan, induk sakit, tanggal bertelur terakhir | Peringkat **per pasangan** dengan skor: hatch rate 40% + telur 30% + clutch/tahun 30% |

Yang unik di Laporan Breeding: penanda **induk sakit 90 hari** dan
**tanggal bertelur terakhir**. Keduanya muat sebagai kolom di Ranking Indukan.
Ranking sudah punya tab per jantan dan per betina, yang tidak dimiliki Laporan.

**Usul:** pindahkan dua kolom itu ke Ranking Indukan, lalu `/breeding-report`
jadi pengalihan. Hemat ±245 baris, tidak ada fungsi hilang.

### b. Catatan Kematian ↔ tab "Kematian" di Daftar Kura

Sama persis dengan kasus Kandang yang sudah disatukan 29 September.

| Tab Kematian (di Daftar Kura) | Halaman Catatan Kematian (431 baris) |
|---|---|
| nama, kode, kandang terakhir, tanggal, penyebab | + spesies, jenis kelamin, tanggal lahir, berat terakhir, riwayat kesehatan |
| — | + saringan tahun / penyebab / urutan |
| — | + **formulir mencatat kematian** |

Halaman jauh lebih lengkap; tabnya versi tipis. Lebih buruk lagi: **tab itu
membaca entity `DeathRecord` yang berisi nol catatan**, jadi `deathMap`-nya
selalu kosong dan ia selalu jatuh ke kolom di `Tortoise`.

**Usul:** tab "Kematian" mengalihkan ke halaman, persis seperti `/enclosure`
mengalihkan ke tab Kandang. Satu jalan masuk, satu tampilan lengkap.

### c. Kalender Breeding ↔ tab "Riwayat" di Breeding & Telur

Kalender Breeding menampilkan **timeline per batch** (kawin → bertelur →
perkiraan menetas → menetas) plus daftar riwayat. Tab "Riwayat" di Breeding &
Telur menampilkan `EggGrid` dan `ClutchOffspringSection` per clutch.

Ini **paling sedikit tumpang tindihnya** dari ketiganya: timelinenya benar-benar
berbeda dari kisi telur. **Usul: jangan disatukan** — tapi timeline itu lebih
berguna sebagai tab di dalam Breeding & Telur daripada sebagai halaman
tersendiri di menu.

---

## 3. Yang TIDAK boleh disederhanakan

- **Cetak Label QR** (232 baris). Mandiri, tidak menyentuh data, jarang dipakai
  tapi tak tergantikan saat dipakai. Ukuran 50×30mm untuk printer XP-420B
  bukan detail yang bisa dititipkan ke halaman lain.
- **Panduan Penyakit** (19 protokol). Rujukan, bukan alur kerja. Nilainya
  justru pada tidak berubah.
- **Deteksi Kura Diam**. Satu-satunya yang menjawab "kura mana yang tidak
  tersentuh siapa pun" — pertanyaan yang tidak dijawab halaman lain.
- **Produksi Indukan**. Baru dibangun kemarin dan satu-satunya yang menjawab
  pertanyaan produksi.

---

## 4. Silsilah: bekerja, tetapi dangkal karena data

| | |
|---|---|
| Kura yang punya `parent_male`/`parent_female` | **49** |
| Di antaranya kura **dewasa** | **0** |
| Pasangan induk yang tercatat | **2** (A36×C24, A29×C14) |

Jadi pohonnya hanya bisa dua tingkat: bayi → induknya. Tidak ada kakek. Itu
bukan cacat kode — 120 kura dewasa memang tidak punya catatan induk, dan
sebagian besar dibeli, bukan hasil tetasan sendiri.

**Satu hal yang perlu diketahui:** 20 bayi tercatat berinduk **A29 × C14** —
pasangan yang menurut susunan kandang sekarang **tidak sekandang** (A29 di E4,
C14 di E5). Silsilah mereka bersandar pada catatan yang sama yang sudah
ditandai "tidak cocok dengan kandang sekarang" di halaman Produksi Indukan.

---

## Ringkasan usul — SEMUANYA SUDAH DIKERJAKAN

Pemilik memutuskan 30 September 2026: kerjakan semuanya.

| Tindakan | Hasil |
|---|---|
| Penagih pemantauan inkubator | ditambahkan di halaman Breeding & Telur |
| Laporan Breeding → Ranking Indukan | **−245 baris, −1 menu** |
| Tab Kematian → alihkan ke halamannya | **−1 tampilan kembar, −1 kueri entity kosong** |
| Kalender Breeding → tab "Timeline" | **−1 menu**, timeline tetap utuh |

**Area Kura: 13 halaman → 10.**

---

## Yang dipindahkan, bukan dibuang

### Laporan Breeding → Ranking Indukan

| Dari Laporan Breeding | Ke mana |
|---|---|
| Sesi bertelur, total telur, berhasil menetas, tingkat penetasan | **kartu ringkasan** di atas Ranking Indukan |
| Kolom "Induk Sakit (90 hari)" | baris kartu pasangan: *"⚕️ N clutch saat induk sakit"* |
| Kolom "Tgl Bertelur Terakhir" | baris kartu pasangan: *"🗓️ terakhir 26 Sep 2026"* |
| Grafik telur vs menetas per bulan | **tidak disalin** — bentuk yang sama sudah hidup sebagai `BreedingStatsSection` di tab "Statistik". Menyalinnya berarti membuat salinan ketiga dari gambar yang sama; kartu "Tingkat penetasan" menautkannya. |

### Tab Kematian → halaman Catatan Kematian

Tabnya versi tipis (nama, kandang, tanggal, penyebab); halamannya menambah
spesies, jenis kelamin, tanggal lahir, berat terakhir, riwayat kesehatan,
saringan tahun/penyebab, dan satu-satunya formulir untuk **mencatat** kematian.
Tidak ada yang hilang — yang hilang hanya versi tipisnya.

Ikut terbuang: kueri `DeathRecord.list()` di Daftar Kura. Entity itu berisi
**nol catatan** dan satu-satunya pembacanya tab yang kini tidak ada — 200 baris
ditarik setiap kali halaman paling sering dibuka itu dimuat, untuk peta yang
selalu kosong.

### Kalender Breeding → tab "Timeline"

Isinya **tidak** tumpang tindih dengan tab lain: timeline per batch (kawin →
bertelur → perkiraan menetas → menetas) benar-benar berbeda dari kisi telur di
tab "Riwayat". Yang dihapus hanya pintunya yang terpisah.

Sebagai tab ia menerima `batches` dari induknya, jadi sepuluh catatan yang sama
tidak ditarik dua kali dalam satu halaman. Penjaga aksesnya (`isManagerLevel`)
dibiarkan utuh supaya tetap ikut kalau kelak dipakai di tempat lain.

---

## Yang diperiksa sebelum menghapus

**Izin.** Setiap peran yang punya bagian `breeding-report` juga punya
`breeding` (owner, admin, manajer, investor); setiap peran yang punya
`breeding-calendar` adalah manajer dan punya `breeding` (owner, admin,
manajer). **Tidak ada satu orang pun yang kehilangan akses.**

**Tautan lama.** `RingkasanPagi` menunjuk `/breeding-calendar`; diarahkan
langsung ke `/breeding?tab=timeline` supaya tidak perlu lompat dua kali.

**Sepuluh pengalihan diuji di browser sungguhan, semuanya lulus:**

| Alamat | Mendarat di |
|---|---|
| `/breeding-report` | `/breeder-ranking` |
| `/tortoise?tab=kematian` | `/death-records` |
| `/tortoise?tab=kandang` | tetap Daftar Kura, tab Kandang |
| `/tortoise` | tetap Daftar Kura |
| `/enclosure` | `/tortoise?tab=kandang` (pengalihan 29 Sep masih utuh) |
| `/enclosure?edit=enc-N` | `/tortoise?tab=kandang&edit=enc-N` |
| `/breeding-calendar` | `/breeding?tab=timeline` |
| `/breeding` | tab bawaan "pembiakan" |
| `/breeding?tab=statistik` | tab Statistik |
| `/breeding?tab=ngawur` | jatuh ke tab bawaan, **bukan layar kosong** |

Dua yang terakhir sengaja: tab yang disimpan di alamat harus punya daftar sah,
kalau tidak satu salah ketik menghasilkan halaman kosong tanpa pesan.

**Penjaga repo.** Lima penjaga gagal sebelum dan sesudah perubahan ini —
persis yang sama (`cek-impor`, `cek-kolom-hantu`, `cek-batch`, `cek-batas`,
`cek-laporan`), semuanya sudah ada lebih dulu. `cek-kembar` tetap hijau.
