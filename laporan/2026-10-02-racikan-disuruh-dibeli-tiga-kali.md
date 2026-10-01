# Satu aturan, empat pembaca, dan saya hanya memperbaiki satu

2 Oktober 2026 · ditemukan saat memeriksa akibat migrasi Duta Repro v5

---

## Ringkasan

Tanggal 1 Oktober saya memperbaiki cacat "racikan yang disuruh dibeli": RACIKAN Duta Repro
(VIT-REP00) tidak bisa dibeli dari mana pun — ia diracik dari lima bahan — tetapi ia bertanda
wajib-ada dengan minimum 3.000 g dan stoknya nol, jadi setiap saringan "di bawah minimum"
menangkapnya dan menyuruh membelinya.

Perbaikan itu benar, tetapi **saya memasangnya di satu dari empat tempat yang membaca
"di bawah minimum"**. Tiga sisanya tetap menyuruh membeli barang jadinya, dan yang satu
berjalan **setiap pagi**.

| Pembaca | Dulu | Sekarang |
|---|---|---|
| `KeputusanHariIni.jsx` — kartu beranda | sudah benar 01-10 | tetap benar |
| `UrgentAlerts.jsx` — peringatan gawat beranda | "Perlu Dibeli" | **diperbaiki** |
| `cekStokHarian` — notifikasi pagi, **menyala, jalan tiap hari 07:00** | "HABIS — perlu dibeli" | **diperbaiki** |
| `belanjaOtomatis` — pembuat baris belanja, sakelar masih mati | akan membuat barisnya | **diperbaiki** |

---

## Yang paling parah: `belanjaOtomatis`

Dua hal yang masing-masing masuk akal, bergabung menjadi perangkap.

Pemiliknya sudah membatalkan baris belanja racikan **dua kali** — 31 Agustus dan 1 Oktober 2026 —
masing-masing dengan keterangan panjang yang menjelaskan bahwa barang itu diracik, bukan dibeli.

Sementara itu `belanjaOtomatis` sengaja **tidak** memperhitungkan baris yang DIBATALKAN saat
memeriksa "apakah barang ini sudah ada di daftar". Keterangannya ada di kodenya sendiri:

> Saringan lama `status !== "sudah_dibeli"` ikut menghitung baris yang DIBATALKAN, sehingga
> barang yang pemilik batalkan tidak akan pernah ditawarkan lagi oleh fungsi ini — selamanya,
> tanpa pesan apa pun.

Itu keputusan yang benar: pembatalan sekali tidak boleh mengunci sebuah barang selamanya.
Tetapi digabung dengan tidak adanya aturan racikan, hasilnya: **begitu sakelar belanja otomatis
dinyalakan, baris itu kembali untuk ketiga kalinya — sendirian, setiap hari, dan pembatalan
pemiliknya tidak bisa menghentikannya.**

Sakelarnya masih mati (`belanja_otomatis_enabled: false`), jadi ini belum terjadi. Yang
diperbaiki adalah kodenya, bukan sakelarnya.

---

## Perbaikannya

Aturannya dipindahkan dari satu layar ke **definisi golongan stok yang dipakai semuanya**.
`golonganStok()` sekarang mengembalikan golongan keempat:

```js
golonganStok(daftar, idRacikan)
  → { habis, menipis, wajibTanpaMinimum, perluDiracik }
```

`perluDiracik` **didahulukan**: barang hasil resep tidak ikut masuk `habis`/`menipis`/
`wajibTanpaMinimum`, supaya angka "perlu dibeli" benar-benar hanya berisi yang bisa dibeli.

`golonganStok` adalah **kembaran** — `src/lib/stokMenipis.js` ↔ `base44/shared/stok.ts` — dan
`scripts/cek-kembar.mjs` sudah membandingkannya. `idBarangRacikan` dan `diracikSendiri` ikut
dipindahkan ke pasangan itu (diteruskan dari `daftarBelanja.js` supaya pemanggil lama tetap
jalan), lalu ditambahkan ke daftar fungsi yang dijaga: **27 fungsi kembar, semua cocok.**

### Satu cacat yang hampir saya buat sendiri

Mengeluarkan racikan dari `perluDibeli` di `UrgentAlerts.jsx` tanpa menambahkannya ke
`hasAlerts` akan **menukar satu cacat dengan cacat yang lebih buruk**: racikan wajib-ada
berstok nol berhenti disebut salah, lalu berhenti disebut sama sekali, dan kartunya berkata
"✅ Semua dalam kondisi baik". Jadi `perluDiracik` ikut dihitung sebagai alert, dan punya
bloknya sendiri — "Perlu Diracik", biru, dengan kalimat "Racik di Stok & Gudang → tab Resep.
Yang dibeli adalah bahannya."

Notifikasi pagi juga dapat bagiannya sendiri: **"PERLU DIRACIK — bukan dibeli"**, terpisah
dari "HABIS — perlu dibeli".

---

## Penjaga

`cek-ronda.mjs` menguji tiga hal, dan yang ketiga yang paling penting:

1. barang jadi masuk `perluDiracik` dan **tidak** ikut `habis`;
2. **bahannya tetap** masuk `habis` — kalau bahan ikut dikecualikan, racikannya tidak akan
   pernah bisa dibuat lagi;
3. **tanpa daftar resep, barang jadi itu jatuh kembali ke `habis`** — bukti bahwa yang
   memindahkannya adalah data resep, bukan pencocokan nama.

Regresi dibuktikan merah. Dengan aturannya dimatikan, penjaga menyebut keadaan lamanya persis:

```
golonganStok: perluDiracik seharusnya hanya barang jadi, terbaca ""
golonganStok: habis seharusnya hanya BAHANnya, terbaca "RACIKAN Duta Repro v5 | Vitamin E 50% (bahan)"
```

---

## Yang diubah

**Kode:**
- `src/lib/stokMenipis.js` — `perluDiracik`, + `idBarangRacikan`/`diracikSendiri`
- `base44/shared/stok.ts` — kembarannya
- `src/lib/daftarBelanja.js` — meneruskan kedua fungsi yang pindah
- `src/components/dashboard/UrgentAlerts.jsx` — blok "Perlu Diracik", ikut `hasAlerts`
- `base44/functions/cekStokHarian/entry.ts` — bagian "PERLU DIRACIK — bukan dibeli"
- `base44/functions/belanjaOtomatis/entry.ts` — barang hasil resep dilewati
- `scripts/cek-kembar.mjs` — dua fungsi baru ikut dijaga
- `scripts/cek-ronda.mjs` — uji golongan stok + regresinya

Tidak ada data yang diubah. 21 penjaga lolos, eslint bersih, `vite build` keluar 0,
keempat berkas backend lolos parse.

---

## Catatan: satu angka yang belum saya sentuh

`SOPTask` pemberian Duta Repro memotong stok **1.380 g/hari** (`pakan_terpakai`), angka yang
benar untuk **92 betina**. Dokumen v5 menghitung **93**. Data hidup hari ini: **89 betina**
(85 di antaranya sulcata).

Tiga angka untuk satu kawanan, dan yang memotong stok adalah angka beku yang tidak ikut
berubah ketika seekor kura mati atau terjual. Belum berbahaya: `potong_stok_pakan_enabled`
masih `false`, SOPTask-nya nonaktif, dan stok racikannya nol — tiga lapis "belum hidup".

Saya belum memperbaikinya karena pilihannya bukan aritmetika: **siapa yang dapat racikan ini?**
Formulasinya disusun atas data sulcata 20–50 kg, sementara kawanan betina berisi 1 red foot,
2 aldabra, dan 1 leopard. 89, 85, atau sesuatu di antaranya — itu keputusan peternakan, bukan
keputusan kode. Begitu angkanya ditentukan, perbaikannya kecil: hitung dari data hidup
(`jumlah betina × 15 g`), bukan dari angka yang diketik sekali.
