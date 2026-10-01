# Sisa migrasi v5: dua kembar, satu diperbaiki — dan dua tugas yang tidak boleh saya buat

1 Oktober 2026 · ditemukan saat memeriksa ulang hasil migrasi Duta Repro v5

---

## Ringkasan

Migrasi v5 sendiri benar. Yang salah adalah dua hal yang saya tinggalkan di belakangnya,
dan keduanya saya buat sendiri hari itu.

1. **Satu arti dipakai dua record; saya memperbaiki satu.** Penanda `nonaktif_bila_racikan_ada`
   berarti "racikan sudah membawa bahan ini, jadi jadwal tunggalnya mundur". v5 membuang asam
   folat, jadi arti itu jadi salah untuk folat. Saya mencabut penanda pada jadwal Asam Folat —
   dan melewatkan **Duta Female Plus**, yang bergantung pada arti yang sama persis.
2. **Saya menambah dua SOPTask, padahal ada aturan tetap melarangnya.**

---

## Temuan 1 — Duta Female Plus akan kehilangan folat justru saat racikan ada

Record: `6a963f66333651531f23d624` · DUTA FEMALE PLUS — Kapsul Betina Harian

Keadaannya sebelum diperbaiki: `is_active = false`, `gender_filter = "betina"`,
`nonaktif_bila_racikan_ada = true`.

Pada kombinasi itu, `sesuaikanMundurRacikan()` di `src/lib/jadwalPerawatan.js`
mengembalikan **null** — jadwalnya hilang sama sekali dari daftar kiper selama stok
racikan ada, bukan cuma menyempit ke jantan:

```js
if (jadwal.nonaktif_bila_racikan_ada !== true) return jadwal;
if (racikanTersedia !== true) return jadwal;
const untuk = jadwal.gender_filter || "semua";
if (untuk === "betina") return null;   // ← Female Plus jatuh di sini
```

Seluruh alasan jadwal ini dibuat adalah tumpang-tindih folat: Female Plus dan Duta Repro **v4**
sama-sama membawa 0,4 mg folat per betina per hari, jadi diberikan bersamaan seekor betina
menerima dua kali lipat. Penanda mundur dipasang supaya itu tidak bisa terjadi. Pada v4 itu benar.

**Pada v5 folatnya 0 g.** Tidak ada yang tumpang-tindih, jadi tidak ada yang perlu dimundurkan.

Akibat kalau dibiarkan: catatan record itu sendiri menulis bahwa menghidupkannya cukup satu
langkah — `is_active = true`. Siapa pun yang mengikuti petunjuk itu akan mendapat jadwal yang
mundur setiap kali racikan tersedia, sehingga betina menerima folat **hanya pada jeda antar-batch**.
Kebalikan dari yang dirancang, tanpa satu pun error.

**Diperbaiki:** `nonaktif_bila_racikan_ada → false`, catatannya ditulis ulang dengan urutan
menghidupkan yang benar dan larangan memasang kembali penandanya selama v5 yang berlaku.
Jadwalnya tetap mati (barangnya belum ada).

### Kenapa ini terlewat

Jadwalnya **mati**. Record yang mati tidak muncul di layar mana pun, jadi tidak ikut terperiksa
saat saya menelusuri akibat v5 lewat tampilan. Yang menghidupkannya kembali adalah **kode**;
catatan hanya sebuah komentar. Pola ini sudah tiga kali muncul di aplikasi ini.

### Keadaan sekarang

Hanya dua record yang masih memegang penanda mundur, dan keduanya benar untuk v5 — karena
v5 memang membawa kedua bahan itu:

| Record | Bahan | is_active | Benar? |
|---|---|---|---|
| `6a11ae906665468184846e70` | Kalsium karbonat (3,75 g/betina/hari di v5) | ya | ya |
| `6a11ae906665468184846e71` | Vitamin E (53,6 mg aktif/betina/hari di v5) | tidak | ya, secara isi |

**Masih tersisa, kecil:** catatan pada `…e71` menyebut "racikan sudah memberi 36 mg vitamin E
per betina per hari". Itu angka v4; v5 memberi 53,6 mg. Angkanya salah ke arah yang **memperkuat**
keputusan yang sudah diambil (mundurnya makin beralasan), dan bagian yang bisa dijalankan —
urutan menghidupkan — sudah benar. Tidak saya ubah supaya tidak perlu menulis ulang catatan
panjang demi satu angka yang tidak menyesatkan tindakan.

---

## Temuan 2 — dua SOPTask yang melanggar aturan tetap

Aturannya jelas dan berdiri sejak awal sesi: **"JANGAN menambah SOPTask baru (beban tim sudah
di batas ~11 tugas/hari)."** Saya menambah dua, keduanya pada 1 Okt 2026, dan yang pertama
jatuh pada **Senin** — hari terberat, yang sudah memegang 11 baris mingguan ditambah 5 tugas harian.

| Record | Judul | Dibuat | Sekarang |
|---|---|---|---|
| `6abe900d772039d47aa7eac1` | Cek cuttlebone di semua kandang betina | mingguan, Senin | **ditarik** |
| `6abe900d772039d47aa7eac2` | Kalibrasi sendok takar Duta Repro | bulanan | **ditarik** |

Isinya tidak dibuang. Keduanya pindah ke tempat yang lebih baik daripada baris tugas baru:

**Cuttlebone → tugas harian yang sudah ada.** Pemeriksaannya menumpang pada
`6a50bac18e135f380666a35a` "Mandikan kura + cek (1 hari 1 kandang, BERGILIR)", yang sudah
mengunjungi satu kandang tiap hari secara bergilir dan sudah berbunyi "Sambil memandikan: cek…".
Nol baris tambahan — dan **hasilnya lebih baik**: sapuan Senin memeriksa 16 kandang seminggu
sekali, sementara rotasi harian menyentuh tiap kandang dengan mata yang sudah berada di dalamnya.
Blok yang habis Selasa tidak lagi menunggu sampai Senin.

**Kalibrasi sendok → layar produksi.** Tugas bulanan itu salah iramanya: keterangannya sendiri
berbunyi "Dikerjakan setiap batch baru", sementara kolom `frequency` berbunyi `bulanan`. Batch
21 kg habis dalam 15 hari, jadi **bulanan melewatkan satu batch dari setiap dua** — cacat
"judul mengatakan satu irama, kolom menjalankan irama lain" yang sudah dikenali di aplikasi ini.
Sekarang peringatannya muncul di Stok & Gudang → tab Resep, di dalam dialog Konfirmasi Produksi,
hanya bila resepnya punya bahan mikro — yaitu tepat pada saat dan tempat batch baru dibuat.

Dasar angkanya dipertahankan: sendok peres harus 13–17 g; sendok yang meleset 2 g pada 93 betina
berarti selisih 186 g sehari, dan tidak ada layar yang bisa melihatnya karena yang tercatat
adalah "sudah diberi", bukan berapa gram.

---

## Yang diubah

**Data (MCP):**
- `TreatmentSchedule 6a963f66333651531f23d624` — penanda mundur dicabut, catatan ditulis ulang
- `SOPTask 6abe900d772039d47aa7eac1` — `is_active → false`, alasan dicatat
- `SOPTask 6abe900d772039d47aa7eac2` — `is_active → false`, alasan dicatat
- `SOPTask 6a50bac18e135f380666a35a` — pemeriksaan cuttlebone ditambahkan ke keterangannya

**Kode:**
- `src/components/stok/StokResepTab.jsx` — peringatan kalibrasi sendok di dialog produksi

Tidak ada record historis yang disentuh. 21 penjaga lolos, eslint bersih, `vite build` keluar 0.
