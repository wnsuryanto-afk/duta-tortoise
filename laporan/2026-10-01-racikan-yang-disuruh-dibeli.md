# Racikan yang disuruh dibeli — dan baris yang kembali sendiri

1 Oktober 2026

## Racikannya tidak bisa dibuat ulang

Setelah menemukan stok RACIKAN Duta Repro nol, pertanyaan berikutnya:
bisakah diracik ulang? Saya hitung resepnya terhadap stok sungguhan.

Batch 21 kg butuh 12 bahan. **Sembilan cukup, tiga kurang:**

| Bahan | Butuh | Stok | |
|---|---|---|---|
| Fermipan — VIT-REP04 | 1.680 g | 1.000 g | **kurang 680 g** |
| Vitamin E — VIT-REP01 | 101 g | 0 g | **kurang 101 g** |
| Vitamin D3 — VIT-REP02 | 3,5 g | 0 g | **kurang 3,5 g** |

Jadi racikannya tertahan sampai ketiganya datang.

**Kabar baiknya: ketiganya sudah ada di daftar belanja, bertanda
"segera".** Fermipan bahkan sudah dengan catatan yang menghitung
kekurangannya persis. Bagian ini bekerja.

## Yang tidak bekerja

Di urutan paling atas daftar belanja, tertanggal 20 September:

> **RACIKAN Vitamin Reproduksi Betina — 3.000 gram — segera**
> *"Otomatis dari beranda — stok habis."*

VIT-REP00 adalah **hasil racikan**, bukan barang yang bisa dipesan. Tidak
ada toko yang menjualnya.

Dan ini bukan pertama kalinya. Baris yang sama persis sudah pernah
dibatalkan **31 Agustus**, dengan keterangan yang menjelaskan duduk
perkaranya lengkap:

> *"VIT-REP00 adalah racikan yang DIBUAT SENDIRI dari 12 bahan, bukan
> barang yang dibeli — baris ini masuk otomatis karena stoknya nol dan
> ditandai wajib. Yang perlu dibeli adalah bahannya (Fermipan, Vitamin E,
> Vitamin D3), lalu diproduksi lewat Stok & Gudang → tab Resep."*

Tiga minggu kemudian ia masuk lagi.

**Keterangan itu menunggu dibaca; yang memasukkannya kembali adalah
tombol.** Pola yang sama persis dengan jadwal Vitamin E pagi ini: sebuah
catatan yang benar, lengkap, dan tidak menghalangi apa pun.

## Yang dikerjakan

Aturannya sekarang dihitung dari datanya sendiri: **barang yang menjadi
`output_item_id` sebuah resep tidak pernah lagi ditawarkan untuk
dibeli.** Empat barang jadi dikenali otomatis dari keempat resep yang
ada.

Pengecualiannya dipasang di tempat daftarnya DISUSUN, bukan hanya di
tombolnya — menawarkan "beli racikan Duta Repro" lalu menolak saat
ditekan sama membingungkannya dengan memasukkannya.

Baris 20 September dibatalkan, dengan alasan dan daftar bahan yang
benar-benar perlu dibeli ditulis di catatannya.

## Penjaga

`cek-ronda.mjs` bertambah enam kasus, dan sengaja menguji **dua arah**:

- Barang jadi (VIT-REP00, kapsul Female Plus) **harus** dikecualikan
- Bahannya (Vitamin E, Vitamin D3, Fermipan) **harus tetap** ditawarkan

Arah kedua sama pentingnya. Mengecualikan bahan ikut-ikutan akan membuat
racikannya tidak pernah bisa dibuat lagi — kegagalan yang lebih sunyi
daripada yang diperbaiki.

Diuji bisa merah untuk keduanya: pengecualian dicabut → VIT-REP00 masuk
lagi; pengecualian dilebarkan → Vitamin E dan Fermipan langsung hilang
dari daftar belanja.

## Catatan

Satu baris daftar belanja dibatalkan, dengan alasannya tertulis. Tidak
ada data lain yang diubah. Ketiga baris bahan yang benar tidak disentuh.
