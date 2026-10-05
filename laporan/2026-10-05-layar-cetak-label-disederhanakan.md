# Layar cetak label: satu printer, dan desainnya kelihatan sebelum dicetak

**5 Oktober 2026**

Tiga permintaan: QR di kartu clutch bisa diklik langsung ke desainnya, opsi
printer disederhanakan karena hanya L385 yang bisa dipakai, dan ada pratinjau
desain labelnya.

---

## 1. Bawaan layarnya adalah printer yang tidak bisa dipakai

```js
const [printerMode, setPrinterMode] = useState("thermal");
```

Setiap kali layar cetak dibuka, pilihan pertamanya adalah **printer termal
XP-420B** — printer yang untuk saat ini tidak bisa dipakai. Jadi langkah
pertama selalu mengganti pilihan yang salah.

Pilihan jenis printer **dicabut**. Yang tersisa hanya Epson L385: cetak di
kertas A4, potong di garis putus-putus. Satu baris keterangan menggantikan satu
dropdown.

Penggambar termalnya **tidak dihapus** — paletnya masih ada di
`labelRingkas.js` dan masih diuji `cek-label.mjs` — supaya jalurnya tinggal
dipasang lagi kalau gulungan termalnya dipakai lagi nanti.

## 2. Pratinjau

Label dicetak lalu ditempel; begitu keluar dari printer tidak ada layar yang
bisa mengoreksinya. Sebelum ini bentuknya baru terlihat **setelah** menekan
"Buat Label" dan membuka berkas unduhannya.

Sekarang desainnya **tergambar begitu layar dibuka**, memakai data clutch yang
sebenarnya — bukan contoh — dan ikut berubah saat ukurannya diganti. Kalau
ukurannya diganti lagi sebelum gambar yang lama selesai, hasil yang
kedaluwarsa itu dibuang, tidak menimpa yang baru.

## 3. Ukuran: tombol, bukan dropdown

Pilihannya cuma tiga dan yang membedakannya adalah **berapa yang muat per
lembar** — angka itu perlu kelihatan sekaligus, bukan satu per satu saat
dropdown dibuka:

| | Per lembar A4 | |
|---|---|---|
| **50 × 30 mm** | **36** | Muat di kotak telur tanpa menutupi telurnya |
| 40 × 30 mm | 45 | Paling kecil — untuk kotak mungil |
| 100 × 50 mm | 10 | Besar — menutupi hampir seluruh sisi kotak |

Angkanya dihitung dari milimeternya oleh `rencanaLembarA4()`, satu fungsi yang
dipakai tombolnya, keterangannya, **dan** penggambar lembarnya. Sebelumnya
"2 kolom × 5 baris = 10" ditulis tetap di keterangan sementara lembarnya
dihitung sendiri — dua angka untuk satu hal.

## 4. Urutan tombolnya dibalik

"Unduh Lembar A4" sekarang tombol utama, dan "unduh PNG satu per satu" turun
jadi pilihan kecil di bawahnya. Yang dipakai sehari-hari adalah lembarnya.

## 5. QR di kartu clutch bisa diklik

QR di kartu clutch **kelihatan seperti bisa diklik** — ia gambar desain yang
sedang dibicarakan — tapi mengkliknya tidak melakukan apa-apa; hanya tombol
"Cetak Label" di ujung kanan yang berfungsi.

Sekarang **seluruh jalurnya satu tombol**: di mana pun ditekan, layar desain
labelnya yang terbuka. Tulisannya ikut berubah dari "Scan QR untuk buka
rincian pembiakan" (yang menerangkan QR-nya, bukan apa yang terjadi kalau
ditekan) jadi **"Ketuk untuk lihat desain & cetak"**.

## 6. Lembar A4 kemungkinan besar keluar kosong di iPad

`html2canvas` dipanggil dengan `scale: 2` untuk semuanya. Untuk satu label itu
wajar — 591 × 354 jadi 1182 × 708. Untuk **lembar A4** 300 DPI (2480 × 3508)
hasilnya **4960 × 7016 ≈ 35 megapiksel**, dan Safari di iPad memotong kanvas di
sekitar **16,7 megapiksel**. Kanvas yang melewatinya tidak melempar error — ia
cuma keluar **kosong**.

Perangkat yang dipakai memesan lembarnya adalah iPad. Jadi tombol yang paling
penting di layar ini kemungkinan besar menghasilkan kertas kosong, tanpa pesan
kesalahan apa pun.

300 DPI sudah kualitas cetak; `scale: 2` cuma menggandakannya tanpa guna.
Lembar A4 sekarang digambar `scale: 1` → **8,7 MP**, di bawah batasnya.

Penjaganya membaca angka yang **benar-benar dioper** di kodenya, bukan
mengulang hitungannya sendiri:

```
Kanvas lembar A4: 8.7 MP (scale 1), di bawah batas Safari iPad 16.7 MP.
```

Dikembalikan ke `scale 2` → merah: *"34.8 megapiksel — di atas batas Safari
iPad 16.7 MP, lembarnya keluar kosong"*.

## 7. Satu penjaga yang tidak bisa merah, dibuang

Versi pertama penjaga lembar A4 memeriksa `kolom × lebar <= daerah cetak`.
Itu **benar menurut definisi** — kolom memang dihitung sebagai
`floor(daerah / lebar)` — jadi penjaganya tidak akan pernah bisa merah.
Ketahuan karena saya mengujinya: mengubah daerah cetak ke seluas kertas tidak
membuatnya gagal.

Diganti dengan yang bisa salah sungguhan: **daerah cetak harus menyisakan tepi
di dalam A4 yang sebenarnya**. Printer inkjet rumahan tidak mencetak sampai
tepi; kalau daerahnya disetel 210 × 297, baris terluar terpotong printernya.
Diuji merah.
