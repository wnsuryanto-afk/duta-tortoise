# Ongkos kirim: siapa yang menanggung — dan tiga cacat di sisi laba

**6 Oktober 2026**

Pemilik: *"Ongkos kirim tidak selalu saya yang menanggung, ada pilihan pembeli
atau penjual. Dan coba cek logika juga di sisi penjualan dan laba ruginya."*

---

## 1. Ongkir selalu dibebankan ke peternakan

```js
total: modal + perawatan + obat + biayaKirim   // biayaKirim = ongkir, tanpa syarat
```

Setiap penjualan dihitung **seolah peternakan yang membayar kurirnya**. Tidak
ada cara menyatakan sebaliknya.

Padahal bila pembeli yang menanggung, pengaruhnya ke laba **nol** — pada kedua
cara yang mungkin:

| Cara | Masuk | Keluar | Pengaruh ke laba |
|---|---|---|---|
| Pembeli bayar kurir langsung | — | — | nol (uang tidak lewat peternakan) |
| Pembeli mengganti ke peternakan | +ongkir | −ongkir | nol |

Jadi aturannya satu kalimat: **ongkir masuk HPP hanya bila ditanggung
penjual.**

Kolom baru `ongkir_ditanggung` pada entity Sale, pilihan `penjual` / `pembeli`,
**bawaan `penjual`** — itulah perilaku sebelum kolomnya ada, sehingga penjualan
lama yang kolomnya kosong dihitung persis seperti semula dan **angkanya tidak
berubah surut**. Penjaganya menguji justru itu.

Pilihannya muncul di layar hanya kalau ongkirnya diisi, di dua tempat:
wizard penjualan dan form penjualan sederhana.

## 2. Rumus yang sama ditulis tiga kali

`SaleForm` menghitung `hpp + shipping_cost` **dua kali** — sekali untuk
pratinjau laba, sekali lagi saat menyimpan — dan `hitungHppKura` punya
salinannya sendiri. Rumus yang disalin adalah rumus yang akan berbeda-beda saat
salah satunya diubah; menambahkan syarat "ditanggung siapa" ke tiga tempat
berarti dua kesempatan untuk kelewatan.

Sekarang satu fungsi: `ongkirUntukHpp(ongkir, ditanggung)` di `lib/hppKura.js`,
dipakai ketiganya.

## 3. `profit` tersimpan, tapi tidak ada yang membacanya — dan bisa basi

Catatan penjualan menyimpan `profit` dan `margin_percent`. **Tidak satu layar
pun membacanya**: laporan penjualan dan laba rugi sama-sama menghitung sendiri
`price − hpp`.

Akibatnya, mengedit penjualan lewat `SaleForm` memperbarui `hpp` sementara
`profit` tertinggal di nilai lamanya — dan selisihnya tidak terlihat di mana
pun, karena yang ditampilkan selalu hasil hitung ulang. Yang akan tertipu
adalah pembaca berikutnya: laporan baru, ekspor, atau pertanyaan langsung ke
data.

`SaleForm` sekarang ikut menulis ulang keduanya.

## 4. Label "Total HPP+Ongkir" jadi salah

Laporan penjualan memajang **"Total HPP+Ongkir"** dan **"Ongkir"** — satu angka
yang menjumlahkan ongkir semua penjualan sebagai biaya. Sejak pembeli bisa
menanggungnya, angka itu menyatakan biaya yang sebagian **tidak pernah
dikeluarkan peternakan**.

Sekarang: **"Total HPP"**, lalu ongkir dipisah menjadi **"Ongkir ditanggung
penjual"** dan — hanya bila ada — **"Ongkir ditanggung pembeli"**.

---

## Penjaga

`cek-ronda.mjs` menguji enam kasus `ongkirUntukHpp` dan empat sifat
`hitungHppKura`:

- ditanggung penjual → masuk penuh; ditanggung pembeli → nol;
- **kolom kosong (penjualan lama) → masuk penuh**;
- nilai teks, kosong, dan tidak masuk akal;
- selisih total penjual vs pembeli tepat sebesar ongkirnya;
- nilai aslinya tetap dilaporkan terpisah (`ongkirNilai`) supaya layar bisa
  menulis "dibayar pembeli" tanpa angka itu memakan laba;
- penjualan tanpa kolomnya sama sekali menghasilkan total yang **sama persis**
  dengan "penjual".

Diuji merah dua arah: melucuti syaratnya, dan membalik bawaannya ke "pembeli" —
yang kedua langsung ditangkap oleh pemeriksaan "penjualan lama tidak boleh
berubah angkanya".

---

## Yang saya temukan tapi TIDAK saya ubah

**Ongkir yang ditanggung peternakan tidak pernah tercatat sebagai pengeluaran
di buku besar.**

Saat penjualan disimpan, yang dibuat hanya satu transaksi **pemasukan** sebesar
`price`. `hpp` — termasuk ongkirnya — tidak pernah menjadi baris pengeluaran.
Untuk modal dan perawatan itu memang benar: biayanya sudah dicatat saat
dikeluarkan (pembelian pakan, obat, gaji). Tetapi **ongkos kirim dibayar pada
saat penjualan**, dan tidak ada yang mencatatnya kecuali seseorang
memasukkannya sendiri lewat kas kecil.

Akibatnya laba rugi berbasis kas **melebih-lebihkan laba sebesar ongkir yang
ditanggung peternakan**, sementara tabel margin penjualan di halaman yang sama
sudah menguranginya. Dua angka laba di satu halaman, dan yang satu tidak tahu
soal ongkir.

Ini perlu keputusan, bukan tebakan saya: apakah penyimpanan penjualan sebaiknya
otomatis membuat transaksi pengeluaran untuk ongkir yang ditanggung penjual?
Kalau ya, kategorinya apa — `operasional` atau kategori ongkir sendiri?
