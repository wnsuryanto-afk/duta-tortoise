# Satuan yang berubah arti

30 September 2026

## Cacat tanpa error

Kasbon punya kolom `weekly_deduction`. Layar menyebutnya "Potongan per
Periode". Nilainya Rp 100.000.

Selama gaji dibayar **mingguan**, itu berarti Rp 100.000 **per minggu** —
sekitar Rp 400.000 sebulan. Spreadsheet September memang memotong
3 × Rp 100.000.

Begitu gaji jadi **bulanan**, angka yang sama berarti Rp 100.000 **sebulan**.

Nilainya tidak berubah. **Satuannya yang berubah arti.** Pelunasan melambat
empat kali lipat, dan tidak ada satu pun layar yang menyebutnya, tidak ada
satu pun error, tidak ada satu pun angka yang terlihat janggal.

Kasbon Ali sisa Rp 600.000. Dengan Rp 100.000/bulan: **lunas 6 bulan lagi**.
Dengan Rp 400.000/bulan: **2 bulan lagi**.

## Yang diputuskan

Iwan memilih **Rp 400.000 per bulan** setelah diberi tiga pilihan beserta
akibatnya pada gaji 1 Oktober. Itu bukan kenaikan beban — itu koreksi
satuan, menyamakan kecepatan pelunasan dengan yang selama ini berjalan.

Kasbon Ali diperbarui: `weekly_deduction` 100.000 → 400.000.
**`deduction_log` tidak disentuh** — ketiga entri Rp 100.000-nya tetap apa
adanya, karena itu riwayat, bukan setelan.

## Sepuluh salinan, dan yang kesepuluh paling berbahaya

Saat angkanya dikoreksi, ternyata ia tersalin di **sepuluh tempat**.
Sembilan di frontend, semuanya sebagai literal telanjang `100000`.

Yang **kesepuluh** ditemukan oleh penjaga, bukan oleh mata saya — dan
justru di jalur yang benar-benar memotong:

```
base44/functions/onSalarySlipPaid/entry.ts:121
    const ded = Math.min(kasbon.weekly_deduction || 100000, sisaK);
```

Itu otomatisasi yang menulis `deduction_log` saat slip ditandai dibayar,
dan statusnya `is_active: true`. Kalau yang kesepuluh terlewat, **layar
akan menjanjikan Rp 400.000 sementara server memotong Rp 100.000** — dua
angka yang sama-sama sah, jadi tidak ada error, tidak ada yang tahu.

Ini pola yang sama yang sudah berkali-kali muncul di aplikasi ini: jaminan
yang ada di satu pemanggil dan tidak ada di pemanggil sebelahnya.

## Yang dikerjakan

Sepuluh salinan jadi satu di tiap sisi:

- `src/lib/hitungGaji.js` → `POTONGAN_KASBON_BAWAAN` (frontend, 9 pemakai)
- `base44/shared/gaji.ts` → kembarannya (backend, 1 pemakai)

Keduanya memang harus ada dua kali: frontend dan backend berjalan di
runtime berbeda dan tidak bisa saling mengimpor. Yang tidak boleh adalah
keduanya **berselisih nilai**.

Sekalian, kata "periode" diganti "bulan" di seluruh layar kasbon, dan
lamanya pelunasan ditulis apa adanya:

- Formulir kasbon: *"Lunas dalam ~6 bulan — lebih dari setengah tahun"*,
  dengan warna peringatan di atas 6 bulan.
- Kartu kasbon: *"Potongan/bulan: Rp 400.000 · ~2 bulan lagi"*.

Rp 600.000 terbaca ringan sampai disebut "6 bulan lagi".

## Penjaga

`scripts/cek-gaji.mjs` bertambah dua pemeriksaan:

1. Potongan kasbon bawaan tidak boleh ditulis sebagai angka telanjang di
   mana pun selain `hitungGaji.js`.
2. Nilai di `hitungGaji.js` dan di `base44/shared/gaji.ts` harus sama
   persis, dan kembarannya tidak boleh hilang.

Ketiganya sudah diuji bisa merah: nilai diselisihkan, kembaran disembunyikan,
dan angka telanjang disalin kembali ke server — semuanya tertangkap.

## Catatan

Riwayat potongan tidak diubah sama sekali. Yang diubah hanya tarif ke
depan, atas keputusan pemilik yang diambil setelah melihat angkanya.
