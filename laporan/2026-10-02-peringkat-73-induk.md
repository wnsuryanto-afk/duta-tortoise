# Peringkat 1–10: apa yang paling mendesak untuk 73 induk yang belum produktif

2 Oktober 2026 · semua angka dihitung dari data hidup, bukan perkiraan

---

## Angka 73 itu terbukti, dan artinya bukan yang dikira

| | |
|---|---|
| Betina hidup | **89** |
| − belum cukup umur (< 6 th) | 7 — Red Foot-02, F23, HF1, H3, RD besar, 8 KECIL, HF6 |
| **Betina dewasa** | **82** |
| − pernah tercatat bertelur | 9 — A31, A46, A47, A48, B108, C14, C22, C23, C24 |
| **BELUM tercatat bertelur** | **73** |

**"Belum tercatat" tidak sama dengan "belum bertelur".** Itu perbedaan terpenting dalam laporan
ini, dan sampai ada yang memeriksa kandang, tidak ada satu pun cara membedakannya.

## Sebarannya per kandang — polanya tajam

| Kandang | Betina dewasa | Jantan dewasa | Pernah | **Belum** |
|---|---|---|---|---|
| N | 17 | 9 | 4 | **13** |
| Bonsai 2 | 8 | 3 | 0 | **8** |
| Bonsai 1 | 8 | 3 | 0 | **8** |
| **E1** | 7 | **0** | 0 | **7** |
| Bonsai 3 | 6 | 2 | 0 | **6** |
| Bonsai 4 | 6 | 2 | 0 | **6** |
| W5 | 4 | 1 | 0 | 4 |
| E2, E3, E4, W4 | 3 tiap | 1 tiap | 0 | 3 tiap |
| L2 | 2 | 2 | 0 | 2 |
| E5, W2, W1 | 3 tiap | 1 tiap | 1 tiap | 2 tiap |
| W3 | 3 | 1 | 2 | 1 |

Seluruh catatan bertelur hanya pernah datang dari **N, W1, W2, W3, E5**. Dari **Bonsai 1–4
(28 betina dewasa, 10 jantan dewasa) tidak pernah ada satu pun** — bukan sedikit, nol.

---

# PERINGKAT

### 1. Otomatisasi Task Kondisional — **208 telur dierami tanpa satu pun catatan suhu**

| | |
|---|---|
| Clutch aktif | 10, semuanya di Inkubator 1 |
| Telur | **208** |
| Pembacaan suhu seumur hidup | **2** |
| Terakhir dibaca | **1 Juni 2026 — 123 hari lalu**, sebelum satu pun telur ini ada |
| Menetas pertama | **31 Okt 2026 — 29 hari lagi** |

Tugas pencatatnya **sudah ada** ("Catat suhu & kelembapan inkubator"), dibuat 29 Agustus, dan
`created_date` sama persis dengan `updated_date` — **dibuat dalam keadaan mati dan tidak pernah
sekali pun disentuh lagi.** Mesin yang mestinya menyalakannya juga sudah lengkap dan benar
(`kelolaTaskKondisional` menyalakan saat ada clutch aktif, mematikan setelah menetas), tetapi
sakelarnya `task_kondisional_enabled: false`.

Jadi seluruhnya sudah dibangun, benar, dan mati. Suhu menentukan bukan hanya berhasil-tidaknya
menetas, tetapi juga jenis kelamin anaknya. Ini tidak menambah 73 — ia melindungi satu-satunya
hasil yang kebun ini punya sekarang, dan batas waktunya 29 hari.

**Satu sakelar.**

### 2. Ronda harian tidak pernah memeriksa telur

Keempat kandang Bonsai sekarang sudah masuk ronda harian (diperbaiki sesi ini) dan dikerjakan
tiap hari. Tetapi itemnya hanya **"Kebersihan <kandang>"**. Tidak ada satu pun item yang menyuruh
melihat tanda bertelur atau galian.

Sulcata mengubur telurnya. Tanpa ada yang mencari, satu clutch tidak terlihat. Inilah penjelasan
paling masuk akal untuk 28 betina Bonsai yang nol: bukan tidak bertelur, tetapi tidak ada yang
menengok.

**Ini yang membuat angka 73 bisa dipercaya atau tidak.** Selama belum ada, setiap keputusan lain
di bawah dibangun di atas angka yang belum tentu benar.

### 3. Kandang E1 — 7 betina dewasa, **nol jantan dewasa**

Satu-satunya jantan di E1 adalah Yuwono, **3,4 tahun** — belum cukup umur. Tujuh betinanya
(F25, HF7, AMBON, 8 BESAR, F29, F27, F28) berumur 6,2–6,8 tahun, tepat di usia produktif awal.

Mereka **tidak mungkin** bertelur dalam keadaan sekarang. Ini satu-satunya sebab di seluruh
daftar ini yang pasti, bukan dugaan — dan perbaikannya satu pemindahan jantan.

**7 dari 73, sebab pasti, satu tindakan.**

### 4. Racikan Duta Repro belum pernah dibuat sekali pun

VIT-REP00 stok 0. Tiga bahan memblokir: tepung hijauan (0 dari 11.398 g), Vitamin E (0 dari
150 g), Vitamin D3 (0 dari 2,5 g). SOPTask pemberiannya nonaktif.

Seluruh program suplemen reproduksi — tiga generasi formulasi, dokumen v4 dan v5, perdebatan
dosis — **belum pernah berjalan satu hari pun.**

### 5. Betina tidak menerima Vitamin E sama sekali sekarang

Akibat langsung dari nomor 4, dan perlu disebut sendiri karena inilah zat yang paling terkait
kualitas folikel. Keadaan gizi betina hari ini:

| Zat | Dari racikan | Dari jadwal tunggal | Diterima |
|---|---|---|---|
| Kalsium | belum ada | jadwal aktif | **ya** |
| Vitamin D3 | belum ada | — | hanya dari matahari |
| **Vitamin E** | belum ada | **jadwal dimatikan** | **TIDAK ADA** |
| Asam folat | v5 membuangnya | jadwal dimatikan | tidak ada (disengaja) |

Vitamin E stok 0, sudah bertanda "segera" di daftar belanja.

### 6. Bonsai 1–4 perlu diperiksa sendiri

28 betina dewasa, 10 jantan dewasa, nol clutch. Kalau nomor 2 sudah jalan dan ternyata memang
tidak ada telur di sana, sebabnya bukan pencatatan melainkan kandangnya — substrat, naungan,
atau ruang galian. **38% dari seluruh masalah ada di empat kandang ini.**

### 7. Kepastian ayah di kandang N

17 betina, **9 jantan**. Empat dari sembilan clutch yang pernah tercatat berasal dari N, dan
ayah yang tertulis di keempatnya adalah tebakan. Selama ini tidak terbantahkan, peringkat
pejantan dan keputusan seleksi dibangun di atas tebakan itu.

### 8. Box bertelur hanya disiapkan setelah ada tanda

25 set tersedia di gudang, catatannya berbunyi "siapkan saat betina menunjukkan tanda-tanda akan
bertelur". Tidak ada tugas yang menyiapkannya lebih dulu. Betina yang tidak menemukan tempat
bertelur yang cocok dapat menahan telurnya.

### 9. Cuttlebone 2 dari minimum 20

Resep v5 sengaja tidak mencukupi kalsium untuk induk 45–50 kg yang bertelur — kekurangannya
ditutup cuttlebone bebas pilih. Sekarang tersedia 2 blok untuk 16 kandang betina.

### 10. Musim bertelur sedang berlangsung

September–Mei, dan sekarang Oktober. Tiga clutch baru dalam sepekan terakhir (B108 30 Sep,
A31 1 Okt, C23 2 Okt). Setiap pekan yang lewat tanpa nomor 1–3 beres adalah pekan musim yang
tidak kembali.

---

## Yang bisa dikerjakan di aplikasi vs di kandang

| | Aplikasi | Kandang |
|---|---|---|
| 1 Suhu inkubator | **satu sakelar** | kiper mencatat tiap hari |
| 2 Cek telur | tambah item ronda | kiper menengok |
| 3 E1 tanpa jantan | tampilkan peringatannya | **pindahkan satu jantan** |
| 4 Racikan | sudah siap | beli 3 bahan, lalu racik |
| 5 Vitamin E | — | beli |
| 6 Bonsai | — | periksa kandangnya |
| 7 Ayah di N | — | kurangi jantan atau terima ketidakpastian |
| 8 Box bertelur | tambah tugas | siapkan di muka |
| 9 Cuttlebone | sudah di daftar belanja | beli 18 |

Nomor 1 satu-satunya yang bisa selesai hari ini tanpa membeli apa pun dan tanpa memindahkan
seekor kura pun.
