# Gudang masih berukuran v5 — minimum yang menyala terlambat

**5 Oktober 2026 · lanjutan peralihan ke v7**

Resep sudah pindah ke v7. Gudangnya belum. Ketiga cacat di bawah ini baru
kelihatan setelah angkanya dihitung berdampingan.

---

## 1. Minimum stok lebih kecil daripada satu batch

"Stok di atas minimum" dibaca orang sebagai **"aman, bisa jalan"**. Untuk bahan
racikan itu hanya benar kalau minimumnya sendiri setidaknya sebesar satu batch.

| Bahan | Butuh 1 batch v7 | Minimum (ukuran v5) | Selisih |
|---|---|---|---|
| Tepung hijauan — VIT-REP20 | 18.325 g | 12.000 g | **kurang 6.325 g** |
| Kalsium karbonat — VIT-REP07 | 9.520 g | 5.500 g | **kurang 4.020 g** |
| Vitamin E — VIT-REP01 | 150 g | 160 g | cukup |
| Vitamin D3 — VIT-REP02 | 4,6 g | 10 g | cukup |

Artinya stok bisa berada **di atas minimum** dan meracik tetap tidak mungkin —
tanpa satu pun peringatan menyala. Dan terlambat untuk bahan yang harus
**dibeli lebih dulu** berarti betina berhenti menerima racikannya.

Minimum dinaikkan ke satu batch penuh: tepung hijauan **18.400 g**, kalsium
**9.600 g**.

## 2. Moringa masih wajib dibeli, padahal v7 tidak memakainya

`VIT-REP03` masih `is_mandatory: true` dengan minimum **4.400 g**. v7 tidak
memakai moringa sama sekali, jadi barang itu akan terus muncul di daftar
belanja dan ikut menghitung angka **"Barang wajib habis"** di kepala halaman
Stok.

Diubah: `is_mandatory: false`, minimum **0**, dan namanya menyebut keputusannya
— *"TIDAK dipakai Duta Repro v7 — habiskan, jangan dibeli lagi"*. Stok 16 kg
yang ada tetap utuh dan boleh dihabiskan sebagai pakan tambahan.

## 3. Nama barang masih menyebut v5

Keenam barang bertuliskan "(bahan Duta Repro v5)". Nama yang menyebut versi
yang sudah tidak ada membuat orang di gudang ragu apakah barangnya masih
dipakai. Semuanya diperbarui, dan vitamin E sekalian menyebut bentuk yang wajib
dibeli: **dl-alpha-tocopheryl acetate 50%** — dokumennya melarang tokoferol
bebas dan kapsul minyak.

---

## Penjaga: minimum harus menutupi satu batch

Fungsi baru `minimumTidakCukupSebatch(resep, barang)` di
`src/lib/resepRacikan.js`, diuji di `cek-ronda.mjs`:

- dengan minimum v7 → nol temuan;
- dengan minimum ukuran v5 pada resep v7 → **tepat dua temuan** (tepung hijauan
  dan kalsium);
- bahan yang tidak punya barang gudang → dilewati, bukan dianggap kurang.

Poin kedua yang membuatnya berarti: tanpa itu, melucuti aturannya akan tetap
hijau. Diuji — dan memang begitu: mengganti syaratnya dengan `if (false)`
membuat pemeriksaan "harus dua temuan" merah.

## Yang TIDAK saya ubah, dan alasannya

**Minimum racikan jadi (`VIT-REP00`) tetap 3.000 g.** Dengan dosis v7 10 g ×
93 betina = **930 g per hari**, 3.000 g berarti peringatan menyala saat tersisa
**3,2 hari** — sementara batch berikutnya butuh menimbang, mencampur bertingkat,
dan mengemas 30 kantong.

Secara hitungan, peringatan seminggu (±6.500 g) lebih masuk akal. Tetapi itu
keputusan tentang **kapan Anda mau diperingatkan**, bukan koreksi angka yang
salah — jadi saya biarkan dan menanyakannya.
