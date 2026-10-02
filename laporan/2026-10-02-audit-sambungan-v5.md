# Audit sambungan Duta Repro v5 antar modul

2 Oktober 2026 · dari pertanyaan "apakah sudah diganti semua? cek modul lain, stok barang, supaya semua terkoneksi"

---

## Hasil

Sambungannya **sudah benar**, kecuali tiga hal yang ditemukan dan diperbaiki hari ini. Satu di
antaranya menyatakan hal yang keliru tentang asam folat.

## Yang diperiksa dan sudah benar

**Resep & gudang sepakat.** Jumlah bahan v5 = 21.000,5 g terhadap hasil 21.000 g (selisih 0,5 g,
pembulatan dokumen — di dalam toleransi 1%). Minimum stok kelima bahan semuanya **≥ kebutuhan
satu batch**, jadi peringatan menipis berbunyi sebelum batch berikutnya gagal:

| Bahan | Butuh/batch | Stok | Minimum | Cukup untuk |
|---|---|---|---|---|
| Tepung hijauan VIT-REP20 | 11.398 g | **0** | 12.000 | **0 batch** |
| Kalsium karbonat VIT-REP07 | 5.250 g | 30.500 | 5.500 | 5 batch |
| Moringa VIT-REP03 | 4.200 g | 16.000 | 4.400 | 3 batch |
| Vitamin E VIT-REP01 | 150 g | **0** | 160 | **0 batch** |
| Vitamin D3 VIT-REP02 | 2,5 g | **0** | 10 | **0 batch** |

Tiga bahan memblokir produksi, dan ketiganya **sudah ada di daftar belanja bertanda "segera"**.

**Penggolongan stok benar di keempat layar.** Diuji dengan data sungguhan lewat `golonganStok()`:

```
HABIS perlu dibeli:  Tepung hijauan | Vitamin E | Vitamin D3
MENIPIS:             Cuttlebone (2 dari 20)
PERLU DIRACIK:       RACIKAN Duta Repro v5 (batch jadi)
```

Racikan jadinya masuk "perlu diracik", bukan "perlu dibeli" — perbaikan kemarin bekerja.

**Delapan bahan yang dibuang konsisten**: Fermipan, fenugreek, tepung kedelai, dextrose,
maltodextrin, asam folat, jahe, kunyit — semuanya `is_mandatory: false`, `minimum_stock: 0`,
stok fisik utuh.

**Dua arsip tidak mengganggu.** Arsip v4 dan generasi pertama ber-`output_item_id: null`, jadi
tidak ikut terdaftar sebagai barang racikan, dan tidak bisa diracik karena gerbang `bolehDiracik()`.

**Backend bersih.** `cekStokHarian` dan `belanjaOtomatis` sudah membaca resep. `kunciBahanSOP`
memakai `required_skus` dan keduanya terisi benar (cuttlebone → VIT-0110, racikan → VIT-REP00).

## Tiga yang diperbaiki

### 1. Layar kiper menyatakan racikan mengandung asam folat — padahal tidak

`GuidedHariIni.jsx` menulis kalimat ini secara tertulis mati:

> "Kalsium, **asam folat**, dan vitamin E sudah termasuk di dalam racikan Duta Repro yang
> diberikan hari ini. Jangan memberi tambahan lagi — dosisnya bisa dobel."

v5 membuang asam folat sepenuhnya. Kalimat itu menyuruh kiper **tidak** menambah folat dengan
alasan sudah ada di racikan, padahal tidak ada sama sekali.

**Koreksi atas diri sendiri:** saya sempat menyebut ini "dibaca kiper tiap hari". Itu salah, dan
saya mengujinya sebelum melanjutkan. `suplemenMundur` bernilai **0** pada semua keadaan nyata —
baik racikan ada maupun habis, bahkan andai jadwal Vitamin E dihidupkan — karena kalimat itu
hanya muncul untuk jadwal ber-`gender_filter: "betina"` yang mundur, dan sekarang tidak ada satu
pun. Jadi cacatnya **laten**, bukan aktif.

Tetap diperbaiki: yang disebut sekarang **nama jadwal yang benar-benar mundur**, dibaca dari data
yang sama yang memundurkannya. Resep boleh berubah lagi nanti; kalimatnya ikut sendiri.

### 2. Asam folat masih di daftar belanja tanpa keterangan

`VIT-REP10` bertanda "minggu ini", `notes: null`. Gudangnya sudah ditandai tidak wajib dan
minimum 0 pada 1 Oktober, tetapi baris belanjanya terlewat — jadi **gudang berkata "jangan beli
lagi" sementara daftar belanja berkata "beli"**.

Sekarang ditahan dengan alasannya, perlakuannya disamakan dengan spirulina, temulawak, dan
rosella yang sudah ditahan 1 September. Tidak dihapus: kalau DUTA FEMALE PLUS kelak dihidupkan,
bahan ini dipakai lagi — 0,4 g per batch 1.000 kapsul, dan stok 5 g cukup untuk 12 batch.

### 3. Dua catatan basi

`SOPTask` pemberian racikan masih memotong stok atas nama **"RACIKAN Vitamin Reproduksi Betina"**
— nama sebelum diganti. Komentar `daftarBelanja.js` masih menulis **"hasil meracik 12 bahan"**
dan menyebut Fermipan sebagai pemblokir. Keduanya diperbaiki; yang kedua ditulis ulang supaya
tidak lagi menghafal isi resep, karena komentar yang menghafal akan basi tiap kali resepnya
berubah.

## Satu yang sengaja tidak disentuh

`SOPTask.pakan_terpakai` memotong **1.380 g/hari** — angka untuk **92 betina**. Dokumen v5
memakai 93; data hidup hari ini **89** (85 di antaranya sulcata). Tiga angka untuk satu kawanan,
dan yang memotong stok adalah angka beku yang tidak ikut berubah saat seekor kura mati.

Belum berbahaya: `potong_stok_pakan_enabled` masih `false`, SOPTask-nya nonaktif, stok racikan
nol. Tidak diperbaiki karena pilihannya bukan aritmetika melainkan keputusan peternakan: kawanan
betina berisi 1 red foot, 2 aldabra, dan 1 leopard, sementara formulasinya disusun atas data
sulcata 20–50 kg. Begitu angkanya ditentukan, perbaikannya kecil — hitung dari data hidup, bukan
dari angka yang diketik sekali.
