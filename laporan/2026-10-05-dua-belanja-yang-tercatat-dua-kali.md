# Dua belanja yang tercatat dua kali

**5 Oktober 2026 · laporan, bukan perubahan data**

Dua baris `FinanceTransaction` bertanggal `"null"` sudah dibetulkan menjadi
**4 Oktober 2026**, sesuai perintah. Saat memeriksa hasilnya, dua belanja
ternyata tercatat **dua kali**. Tidak ada yang saya hapus — keputusannya milik
pemilik.

---

## 1. Kamera Xiaomi CW300 — Rp 1.298.000, dua baris

| | Baris A | Baris B |
|---|---|---|
| id | `6ac249a28211b1ea450b805e` | `6ac2490a25652836242e00d1` |
| tanggal | 13 September 2026 | **4 Oktober 2026** ← yang baru dibetulkan |
| keterangan | Multiple — Xiaomi Outdoor Camera CW300 | Xiaomi Smart Life Official Store — Xiaomi Outdoor Camera CW300 |
| jumlah | Rp 1.298.000 | Rp 1.298.000 |
| qty × harga | 2 × Rp 649.000 | 2 × Rp 649.000 |
| dibuat | 4 Okt 2026, 12:42:10 | 4 Okt 2026, 12:39:38 |
| foto nota | `c79f6d611_2022489.jpg` | `2501aa2cc_2022491.jpg` |

Barang, jumlah, qty dan harga satuannya sama persis. Keduanya dibuat dalam
**jarak 2 menit 32 detik** dari dua berkas tangkapan layar yang namanya
berurutan.

**Akibat perbaikan tanggal kemarin:** Rp 1.298.000 yang sama sekarang berdiri
di **dua bulan berbeda** — September dan Oktober. Laba-rugi kedua bulan itu
sama-sama menanggungnya.

Saya tidak bisa memastikan ini salah catat. Mungkin memang dua kamera dipesan
terpisah. Yang bisa saya pastikan: datanya tidak membedakannya, dan hanya
pemilik yang tahu berapa kamera yang benar-benar datang.

## 2. Susu Bubuk Kedelai Soya Kaori 1kg — Rp 130.700, dua baris

| | Baris A (jalur pembelian) | Baris B (jalur pecah-nota) |
|---|---|---|
| id | `6aa972fd8268fa95cb045785` | `6ac248e4faaa703aa9999e6b` |
| tanggal | 15 September 2026 | **8 September 2024** |
| keterangan | Pembelian 1 barang via Shopee — Mustika Djamue — dibayar deny verdinand | Mustika Djamue — Susu Bubuk Kedelai Soya Kaori 1kg Org |
| kategori | `vitamin_suplemen` | `lainnya` |
| `reference_id` | `6a9d5f1058a7b0f708588603` | *kosong* |
| dicatat oleh | dverdinand@gmail.com | wnsuryanto@gmail.com |

Baris A datang dari alur pembelian yang benar: ia punya `reference_id` ke
pesanannya dan kategori yang tepat. Baris B dibuat oleh pemecah nota AI pada 4
Oktober, tanpa `reference_id`, dengan kategori `lainnya`, dan **tanggalnya
salah dua tahun** — AI membaca 2024 untuk nota September 2026.

Tanggal 2024 itu menutupi masalahnya: belanja ini **tidak muncul di laporan
tahun mana pun**, sehingga ketika dilihat per bulan ia tidak tampak ganda.

## Lima nilai lain dari sesi impor yang sama — bersih

Rp 179.998 · Rp 199.497 · Rp 90.000 · Rp 66.884 · Rp 60.000 — masing-masing
muncul **tepat satu kali**. Hanya dua di atas yang ganda.

---

## Yang sudah saya perbaiki di kode

Kartu "Hasil Scan" di halaman keuangan dulu hanya menyebut **nama toko dan
jumlah item**. Tanggalnya tidak pernah ditampilkan — padahal pilihan "pecah
jadi beberapa transaksi" **menulis langsung ke buku besar tanpa layar
periksa**. Jadi tanggal 2024 itu masuk tanpa satu pun mata melihatnya.

Sekarang kartu itu mencetak **tanggal yang akan dipakai**, dalam bahasa
Indonesia, dan bila AI tidak memberi tanggal yang sah ia menyebut apa yang
dibacanya. Bila tanggalnya lebih dari 120 hari ke belakang atau berada di masa
depan, muncul peringatan merah:

> ⚠ Tanggal ini 2 tahun lebih awal dari saat pesanan dicatat — biasanya AI
> salah membaca format tanggal struk.

Tombolnya **tidak dikunci**. Pemilik tetap boleh melanjutkan — asal ia melihat
dulu apa yang dilanjutkan. Hanya tampilan yang berubah; tidak ada alur yang
diubah dan tidak ada data yang disentuh.

Pemeriksa tanggal ini sudah dipakai di layar pembelian dan kas kecil sejak
sebelumnya. Halaman keuangan adalah satu-satunya yang terlewat, dan justru di
situ ada jalur yang menulis tanpa diperiksa.

---

## Yang perlu diputuskan pemilik

1. **Kamera Xiaomi:** dua baris Rp 1.298.000 — dua kamera betulan, atau satu
   nota tercatat dua kali? Bila ganda, mana yang dibuang. Baris B (4 Okt)
   punya nama toko yang jelas; baris A (13 Sep) tanggalnya lebih dekat ke
   pembelian sebenarnya.
2. **Susu soya:** baris B (`6ac248e4…`) hampir pasti duplikat — baris A punya
   `reference_id`, kategori benar, dan tanggal yang masuk akal. Perlu izin
   untuk menghapus baris B.
