# Halaman mati karena tanggal bertuliskan "null"

**4 Oktober 2026** · Catat Pengeluaran · diperbaiki

---

## Yang Anda lihat

Halaman **Catat Pengeluaran** berganti layar merah:

> **Terjadi Kesalahan** — Halaman ini mengalami error.
> `Invalid time value`

Bukan satu baris yang rusak. **Seluruh halaman** tidak bisa dibuka.

## Sebabnya: dua karakter yang tidak terduga

Dua baris FinanceTransaction tersimpan dengan tanggal **teks `"null"`** —
bukan nilai kosong, melainkan empat huruf n-u-l-l:

| Dibuat | Keterangan | Jumlah | Tanggal |
|---|---|---:|---|
| 4 Okt 12:39 | Xiaomi Smart Life Official Store — Xiaomi Outdoor Camera CW300 | Rp 1.298.000 | `"null"` |
| 4 Okt 12:39 | Xiaomi Smart Life Official Store — Proteksi Elektronik | Rp 60.000 | `"null"` |

Keduanya masuk lewat **pemisah invoice** di halaman Keuangan, yang
menuliskannya begini:

```js
date: inv.tanggal || form.date,
```

Pembaca invoice AI mengembalikan tanggal sebagai **teks**, dan saat tidak
menemukannya di struk ia mengembalikan teks `"null"`. Menurut `||`, teks
`"null"` adalah nilai yang **benar** — ia tidak kosong — jadi tanggal
cadangan tidak pernah dipakai dan `"null"` lolos utuh ke basis data.

Di layar, `new Date("nullT00:00:00")` menghasilkan tanggal tidak sah,
`format()` melemparnya, dan React mengganti seluruh halaman dengan layar
kesalahan.

## Tiga perbaikan

**1. Penulisnya menyaring.** `tanggalISOAman()` hanya menerima bentuk
`YYYY-MM-DD` yang benar-benar terurai; apa pun selain itu memakai tanggal
cadangan. Teks `"null"` dan `"undefined"` ditolak secara eksplisit, karena
keduanya lolos dari `||`.

**2. Pembacanya tidak bisa mati.** `tanggalTampil()` mengembalikan tanda
hubung alih-alih melempar — termasuk bila pemformatnya sendiri yang
melempar. Dipasang di tiga tempat yang memformat tanggal **tersimpan**:
Catat Pengeluaran, Tugas Insidentil (tenggat), dan Poin Saya.

Satu baris data yang rusak tidak boleh membuat halaman yang memuat ratusan
baris lain tidak bisa dibuka.

**3. Penjaganya.** `cek-ronda.mjs` bertambah **9 kasus tanggal tak
terpercaya** (termasuk `"null"`, `"undefined"`, `"2026-13-45"`, dan tanggal
berjam yang harus dipotong bukan ditolak), plus penolakan terhadap
`date: inv.tanggal || …` yang kembali ditulis di halaman Keuangan.

Keduanya diuji merah. Pemeriksaan "pemformat yang melempar" sempat ikut
**melempar** alih-alih melapor — penjaga yang mati dengan jejak tumpukan
alih-alih satu kalimat membuat orang menebak apa yang rusak; sekarang ia
melapor.

## Yang belum diperbaiki: dua baris datanya sendiri

Keduanya **tidak saya ubah** — aturan Anda: jangan ubah data historis, buat
laporan saja.

Tapi keduanya perlu keputusan Anda, karena **Rp 1.358.000 pengeluaran nyata
sedang tidak terhitung di bulan mana pun**: tanggal `"null"` membuatnya
jatuh dari laporan biaya September maupun Oktober.

Tanggal yang benar kemungkinan **4 Oktober 2026** (saat dicatat) atau
tanggal pesanan Xiaomi yang sebenarnya. Sebut saja yang mana, dan keduanya
saya betulkan dalam satu perintah.

Satu lagi yang perlu Anda lihat: baris **"Mustika Djamue — Susu Bubuk Kedelai
Soya Kaori 1kg"** (Rp 130.700) tersimpan bertanggal **8 September 2024** —
dua tahun lebih awal, pola khas AI salah membaca format tanggal struk.
Aplikasi ini sudah punya pemeriksanya (`tanggalMencurigakan`), tapi hanya
dipasang di alur screenshot pesanan, bukan di alur invoice ini. Memasangnya
di sini juga adalah langkah berikutnya yang wajar — saya tahan dulu karena
ia mengubah alur kerja, bukan sekadar menambal.

## Hasil

24 penjaga hijau, `npx vite build` lolos, 122 komponen merender tanpa error.
