# Tepung hijauan: dicari di v4, ternyata tidak pernah ada di sana

2 Oktober 2026 · dari permintaan "jabarkan racikan hijau-hijauan, itemnya apa saja"

---

## Pertanyaannya

Tepung hijauan kering giling (VIT-REP20) adalah **54,27%** dari batch Duta Repro v5 — bahan
terbesarnya, 11.398 g. Pemiliknya minta isinya dijabarkan, dan menunjuk resep v4: *"Coba cek
ramuan yang sebelumnya, sebelum diganti. Itu sudah ada semua di sana."*

Tidak ada di sana. Dibuktikan dari dokumen aslinya.

## Bukti

Dokumen "Duta Repro — Formulasi v4, 22 September 2026" dicari kata per kata:

| Kata | Muncul |
|---|---|
| hijauan | **1×** — dan bukan sebagai bahan: *"Taburkan merata di atas pakan hijauan basah pagi agar menempel"* |
| rumput, odot, napier, alfalfa, daun, jerami, giling | **0×** |

Di v4, "hijauan" adalah **pakan yang ditaburi**, bukan isi racikan. Komposisi v4 lengkap: kalsium
karbonat 7.000 g, tepung kedelai 3.150, moringa 3.150, maltodextrin 2.765, dextrose 1.680,
Fermipan 1.680, fenugreek 1.050, jahe 210, kunyit 210, Vitamin E 101, Vitamin D3 3,5, asam folat
0,57. Pembawanya **maltodextrin**, dibantu tepung kedelai dan dextrose.

## Dari mana angka 11.398 g sebenarnya berasal

Bukan takaran yang dirancang — **sisa ruang**:

```
8 bahan yang dibuang v5        10.745,57 g
kalsium turun 7.000 → 5.250     +1.750,00 g
D3 turun 3,5 → 2,5                  +1,00 g
moringa naik 3.150 → 4.200      −1.050,00 g
Vitamin E naik 101 → 150           −49,00 g
                                ───────────
SISA                           11.397,57 g   ≈ 11.398 g  (beda 0,43 g, pembulatan)
```

Karena itu isinya **tidak mungkin** ada di v4: ruangnya baru lahir setelah v4 dibongkar. Dokumen
v5 pun tidak menjabarkannya, hanya menyebut sumbernya — *"Rumput odot/napier atau daun kering
yang sudah biasa dipakai"*.

## Yang dikerjakan

**1. v4 diarsipkan ke aplikasi** (`PelletRecipe`, nonaktif). Record v4 yang lama sudah ditimpa
saat migrasi, sehingga angkanya tidak tersimpan di mana pun — pertanyaan "resep sebelumnya
isinya apa" buntu. Sekarang tidak buntu lagi: 12 bahan beserta gram, persen, fungsi, langkah
pengenceran tiga tahap, dan alasan v5 meninggalkannya.

**2. Cacat yang hampir saya buat sendiri, lalu saya perbaiki.** Arsip itu bernama "JANGAN
DIRACIK" — dan `is_active` ternyata **tidak pernah dibaca** oleh layar mana pun. Keempat resep
tampil sama saja, dan ketiga yang sudah dinonaktifkan sejak dulu (Duta Female Plus, Herbal
Boost, Daily Boost) tetap punya tombol **"Buat Pelet" yang benar-benar memotong stok**.

Menekannya pada arsip v4 akan memotong 7 kg kalsium, 3,15 kg tepung kedelai, maltodextrin,
dextrose dan Fermipan, lalu menghasilkan batch yang sudah ditinggalkan — tanpa satu pun
peringatan. Pola yang sama lagi: **penjaganya nama, yang menjalankan tombol.**

Aturannya sekarang satu fungsi, `bolehDiracik()`. `!== false` dan bukan `=== true`: resep lama
dibuat sebelum kolom itu ada, jadi nilainya `undefined` — memakai `=== true` akan mematikan
tombol pada resep yang sah, kesalahan yang arahnya berlawanan dan sama buruknya.

**3. Alfalfa dicoret** (dikerjakan lebih dulu, data saja). Dokumen v5 menyebut tepung alfalfa
sebagai pengganti tepung hijauan; SOP pakan kebun ini melarangnya — *"alfalfa (protein tinggi =
pyramiding)"*. Pada 54% batch, itu berarti alfalfa jadi lebih dari separuh suplemen harian untuk
kura yang aturan pakannya melarangnya. Pengganti yang boleh tinggal pelet kura digiling halus.

## Penjaga yang gagal lebih dulu, lalu diperbaiki

Uji pertama untuk tombol Buat Pelet hanya mencari kata `bolehDiracik(r)` di mana pun dalam
berkas. Dicoba dengan melepas gerbang tombolnya: **penjaganya tetap hijau** — karena lencana
"nonaktif" di kartu yang sama juga memakai kata itu. Yang dicocokkan sekarang gerbang tombolnya
sendiri, dan regresinya sudah dibuktikan merah.

Kalau tidak diuji dengan merusaknya lebih dulu, penjaga itu akan terlihat bekerja selamanya
tanpa pernah menjaga apa pun.

## Yang masih menunggu keputusan

Isi tepung hijauan belum bisa ditulis siapa pun selain pemiliknya. Hijauan yang ADA di aplikasi:
Rumput (128,97 kg, dicari tiap hari ±64 kg), Rumput Gajah/Sudan RPT-0001, Hay/Jerami RPT-0002,
Daun Pepaya SYR-0001, Kaktus/Opuntia SYR-0002, serta kembang sepatu dan azolla yang dipanen
lewat SOPTask tetapi belum punya record stoknya sendiri.

Keputusan "tidak usah dihitung segar" sudah dicatat: resep turunannya nanti dalam berat kering,
dengan keterangan bahwa pemotongan stok rumput lebih kecil daripada pemakaian sebenarnya.
