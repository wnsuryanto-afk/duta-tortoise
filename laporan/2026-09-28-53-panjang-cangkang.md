# 53 kura tanpa panjang cangkang — data tidak hilang

**Pertanyaan pemilik, 28 September 2026:** lencana "Data Belum Lengkap 53" muncul di
halaman Kura, terutama panjang cangkang. *"Sebelumnya data sudah ada semua?"*

**Jawaban singkat: tidak ada yang hilang.** Panjang cangkang ke-53 kura itu memang
tidak pernah ada, sejak impor awal 14 Mei 2026.

---

## Bukti bahwa tidak ada yang terhapus

**1. Angkanya cocok persis.**
55 record `Tortoise` berkolom `shell_length_cm` kosong. Dua di antaranya berstatus
mati (B119, F14), jadi yang terhitung 53 — sama dengan lencananya.

**2. Semuanya dari impor yang sama.**
Ke-55 dibuat `2026-05-14T09:16:56`. Semuanya punya `weight_grams`, tidak satu pun
punya `shell_length_cm`. Impornya memang membawa berat, tidak membawa panjang.

**3. Pembaruan massal tidak menghapus kolom itu.**
Ada dua operasi massal yang mencurigakan karena `updated_date`-nya identik sampai
milidetik:

| Waktu | Menyentuh record kosong | Menyentuh record berisi |
|---|---|---|
| 2026-09-16T06:03 | ya | ya (C9 54,5 cm tetap utuh) |
| 2026-09-27T05:06:46.942 | 11 record | **20 record, semuanya tetap berisi** |

Kalau operasi itu menulis payload tanpa `shell_length_cm`, ke-20 record itu ikut
kosong. Mereka tidak kosong. Tidak ada penghapusan.

**4. Di riwayat pengukuran pun tidak ada.**
Dari ke-55 kura, hanya SATU yang pernah punya baris panjang cangkang di mana pun:

> **B106** — 17 Mei 2026 — 60 cm, berat 150 g

Enam puluh sentimeter dengan berat 150 gram mustahil. Baris itu sudah dikecualikan
pada 15 September 2026 **atas keputusan pemilik sendiri**, dengan alasan tertulis:
*"satuan/panjangnya tidak bisa dipastikan, dan ada catatan lain yang lebih dipercaya
untuk kura & tanggal yang sama."*

Jadi profil B106 yang kosong itu benar, bukan rusak.

---

## Penyalinannya sendiri bekerja

Ada automation `onMeasurementSaved` (workflow *Auto-update Tortoise setelah Timbang*)
yang menghitung ulang `weight_grams` dan `shell_length_cm` di profil kura dari
SELURUH riwayat, per kolom, tiap kali `MeasurementHistory` ditulis. Aturannya di
`base44/shared/ukuran.ts`.

Buktinya B32: diukur 53,5 cm pada 3 dan 14 September, dan profilnya memang 53,5 cm.

**Artinya: begitu salah satu dari 53 kura itu diukur, angkanya akan langsung muncul
di profil.** Tidak ada yang perlu diperbaiki di jalur penyalinan.

---

## Kenapa ke-53 itu tidak akan terisi sendiri

Pada **17 September 2026** rotasi penimbangan kura dewasa sehat dihentikan dengan
sengaja. Alasannya ditulis lengkap di `src/lib/jadwalTimbang.js`: kura dewasa 20–37 kg
sulit dipegang, tugasnya sering terlewat, dan rotasinya tidak pernah menyelesaikan
satu putaran pun. Janji "semua tersapu tiap 60 hari" diganti tiga pemicu yang
benar-benar bisa dikerjakan:

1. dilaporkan tidak makan
2. sedang diobati (dosis obat dibagi berat — ini menyentuh keselamatan)
3. baby & juvenile tiap 14 hari

Konsekuensinya jujur: **kura dewasa sehat tidak ditimbang rutin lagi, jadi ke-53
panjang cangkang itu tidak akan terisi tanpa keputusan terpisah.**

Terlihat di data sejak 1 Agustus 2026 — 94 pengukuran sah, hampir semuanya baby:

| Jenis | Jumlah |
|---|---|
| Baby (timbang massal 2 mingguan) | ±84 |
| Dewasa (sisa rotasi lama) | ±10 |

---

## Yang diperbaiki hari ini

Kartu kura masih memakai aturan lamanya sendiri — `lewat 30 hari → lencana MERAH
"Perlu ditimbang!"` — padahal `jadwalTimbang.js` menyebut dirinya satu-satunya
definisi resmi dan sudah menyatakan sebaliknya sejak 17 September.

Akibatnya **110 kura dewasa sehat** menyalakan alarm merah untuk pekerjaan yang sudah
diputuskan tidak perlu. Empat puluh empat di antaranya menunjukkan **443 hari** dan
tidak akan pernah padam.

Alarm yang tidak bisa dipadamkan mengajari orang mengabaikan warna merah — termasuk
saat yang menyala adalah kura yang benar-benar sakit. Kartunya sekarang memakai
`alasanTimbang()`, definisi yang sama dengan daftar tugas kiper.

Yang tetap menyala: kura sakit yang beratnya sudah ≥7 hari, dan baby/juvenile yang
lewat 14 hari. Tanggal penimbangan terakhir tetap ditampilkan — yang berhenti adalah
menyebutnya mendesak padahal bukan.

---

## Keputusan yang menunggu pemilik

Tidak ada data yang diubah dalam laporan ini. Kalau panjang cangkang ke-53 kura itu
memang diperlukan, pilihannya:

- **Sekali sapu, bukan rutin** — satu kali pengukuran panjang untuk 53 kura dewasa.
  Panjang tidak berubah cepat pada kura dewasa, jadi sekali ukur bertahan lama.
  Ini tidak menambah beban harian karena bukan tugas berulang.
- **Biarkan** — kalau panjang cangkang tidak dipakai untuk keputusan apa pun, lencana
  "Data Belum Lengkap" bisa berhenti menghitung kolom itu untuk kura dewasa.

Yang jelas: ini bukan data yang hilang dan perlu dipulihkan. Ini data yang belum
pernah diambil.
