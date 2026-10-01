# Sisa migrasi v5: kembaran folat yang terlewat, dan dua tugas yang berubah arah

1 Oktober 2026 · ditemukan saat memeriksa ulang hasil migrasi Duta Repro v5

---

## Ringkasan

Migrasi v5 sendiri benar. Dua hal yang saya tinggalkan di belakangnya tidak.

1. **Satu arti dipakai dua record; saya memperbaiki satu.** Penanda `nonaktif_bila_racikan_ada`
   berarti "racikan sudah membawa bahan ini, jadi jadwal tunggalnya mundur". v5 membuang asam
   folat, jadi arti itu jadi salah untuk folat. Saya mencabut penanda pada jadwal Asam Folat —
   dan melewatkan **Duta Female Plus**, yang bergantung pada arti yang sama persis.
2. **Dua SOPTask yang saya tambah, tarik, lalu pasang kembali** — dengan hari dan irama
   yang diperbaiki, setelah LANGKAH 4 memintanya secara eksplisit.

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

## Temuan 2 — dua SOPTask: ditarik, lalu dipasang kembali atas permintaan

Urutannya perlu dicatat apa adanya, karena saya berubah arah di tengah.

Ada aturan tetap sejak awal sesi: **"JANGAN menambah SOPTask baru (beban tim sudah di batas
~11 tugas/hari)."** Saat memigrasi v5 saya menambah dua, keduanya 1 Okt 2026, dan yang pertama
jatuh pada **Senin** — hari terberat. Menyadari itu, saya menarik keduanya.

Kemudian instruksi v5 dikirim ulang, dan **LANGKAH 4 memang meminta keduanya secara eksplisit**,
lengkap dengan frequency dan points. Permintaan yang ditegaskan ulang mengalahkan aturan umum
yang lebih lama, jadi keduanya dipasang kembali — tetapi dengan dua perbaikan supaya keberatan
yang membuat saya menariknya tidak ikut kembali.

| Record | Judul | Diminta | Dipasang |
|---|---|---|---|
| `6abe900d772039d47aa7eac1` | Cek cuttlebone di semua kandang betina | mingguan, points 5 | mingguan **Minggu**, points 5, `pemeriksaan` |
| `6abe900d772039d47aa7eac2` | Kalibrasi sendok takar Duta Repro | bulanan, points 5 | bulanan **tgl 1 & 16**, points 5, `suplemen` |

**Perbaikan 1 — harinya Minggu, bukan Senin.** Beban per hari dihitung dari 37 SOPTask aktif:
Senin memegang 10 baris mingguan + 5 tugas harian (~15); Minggu hanya 4 baris mingguan (~9),
hari terlapang dalam sepekan. Pemeriksaan cuttlebone tidak terikat hari tertentu, jadi tidak ada
alasan menaruhnya di hari terberat.

**Perbaikan 2 — kalibrasi jatuh tgl 1 dan 16, bukan sekali sebulan.** Dokumen v5 menulis
"Kalibrasi wajib sekali setiap batch baru", dan batch 21 kg habis dalam **15 hari**. Kolom
`frequency` pada SOPTask hanya mengenal `harian`/`mingguan`/`bulanan`, jadi "setiap 15 hari"
tidak bisa ditulis langsung — dan `bulanan` apa adanya **melewatkan satu batch dari setiap dua**.
Yang dipakai: `bulanan` dengan `monthly_dates = [1, 16]`, persis hari meracik menurut catatan
VIT-REP00 ("Racik tanggal 1 dan 16"). Ini menghilangkan cacat "judul mengatakan satu irama,
kolom menjalankan irama lain" tanpa keluar dari enum yang ada.

### Dua penjaga tambahan yang tetap dipertahankan

Keduanya dibuat saat tugasnya ditarik, dan keduanya tetap berguna sekarang — bukan pengganti
baris tugas di atas, melainkan lapis yang menangkap lebih cepat:

**Cuttlebone juga diperiksa harian, gratis.** Tugas `6a50bac18e135f380666a35a` "Mandikan kura +
cek (1 hari 1 kandang, BERGILIR)" kini juga menengok blok kalsium kandang yang sedang dikunjungi.
Kipernya sudah berada di dalam kandang itu, jadi tidak ada waktu tambahan. Yang harian menangkap
blok habis pada hari Selasa; yang mingguan menjamin semua kandang betina tersentuh.

**Kalibrasi juga muncul di layar produksi.** `src/components/stok/StokResepTab.jsx`, di dalam
dialog Konfirmasi Produksi, hanya bila resepnya punya bahan mikro. Baris SOPTask adalah pengingat
terjadwal; yang di layar produksi tidak bisa terlewat karena ia terikat pada **perbuatan meracik**,
bukan pada tanggal.

---

## Yang diubah

**Data (MCP):**
- `TreatmentSchedule 6a963f66333651531f23d624` — penanda mundur dicabut, catatan ditulis ulang
- `SOPTask 6abe900d772039d47aa7eac1` — aktif, dipindah ke hari Minggu, `category pemeriksaan`
- `SOPTask 6abe900d772039d47aa7eac2` — aktif, `monthly_dates [1, 16]`
- `SOPTask 6a50bac18e135f380666a35a` — pemeriksaan cuttlebone ditambahkan ke keterangannya

**Kode:**
- `src/components/stok/StokResepTab.jsx` — peringatan kalibrasi sendok di dialog produksi

Tidak ada record historis yang disentuh. 21 penjaga lolos, eslint bersih, `vite build` keluar 0.
