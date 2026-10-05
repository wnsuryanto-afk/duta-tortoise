# Semua foto bisa diketuk — satu penangkap, bukan 95 perubahan

**5 Oktober 2026**

Pemilik mengetuk foto clutch di halaman Breeding dan tidak terjadi apa-apa.
Itu bukan satu tempat yang kelewatan.

---

## Berapa banyak yang diam

**107 gambar di 75 berkas.** Foto telur, foto clutch, bukti transfer, bukti
pembayaran gaji, foto temuan, foto penyakit, selfie absen, foto alat, foto
stok, QR, pratinjau label. Hampir semuanya hanya bisa dilihat sebesar
petaknya — sekitar 56 × 56 piksel untuk thumbnail kartu.

Dua viewer sudah ada sebelumnya, tapi hanya dipakai di empat tempat:

| Viewer | Dipakai di |
|---|---|
| `TortoisePhotoLightbox` | galeri foto kura, kartu kura |
| `PhotoPreviewModal` | persetujuan SOP, tugas hari ini |

## Kenapa satu penangkap, bukan 95 `onClick`

Menambahkan "bisa diklik" di 95 tempat berarti **95 kesempatan untuk
kelewatan** — dan yang kelewatan tidak ketahuan sampai ada yang mencoba
mengetuknya lalu tidak terjadi apa-apa. Persis keluhan hari ini.

`PembesarFoto` dipasang **sekali** di akar aplikasi, membungkus Router, dan
mendengarkan klik di tingkat dokumen. Setiap gambar di seluruh aplikasi — yang
sekarang ada maupun yang ditambahkan besok — langsung bisa diketuk.

## Gambar di dalam tombol sengaja TIDAK diperbesar

Banyak foto duduk di dalam kartu atau tombol yang mengetuknya sudah berarti
sesuatu: membuka halaman kura, memilih baris, membuka galeri yang sudah punya
viewernya sendiri. Kalau gambarnya ikut memperbesar, **satu ketukan melakukan
dua hal**, dan yang kalah adalah yang sebenarnya dimaui orang.

Jadi di dalam elemen yang bisa ditekan, aksi elemen itu yang menang. Kalau
suatu saat ada gambar di dalam tombol yang memang harus bisa diperbesar,
tandai `data-zoom="on"` — pengecualian yang **tertulis**, bukan perilaku yang
kebetulan. Untuk mematikannya: `data-zoom="off"`.

Petunjuk kursor (`zoom-in`) ikut satu aturan CSS, bukan kelas di 95 tempat —
dan sengaja tidak muncul di gambar dalam tombol, karena memang bukan gambarnya
yang menanggapi ketukan di situ.

## Dialog foto SOP yang memotong

`PhotoPreviewModal` punya dialognya sendiri: `max-w-md` dengan gambar `w-full`.
Foto **tegak** — dan foto bukti dari ponsel hampir selalu tegak — melebihi
tinggi layar lalu **terpotong**, tanpa cara memperbesar atau menggeser.

Sekarang ia meneruskan ke viewer yang sama dengan seluruh aplikasi. Nama dan
props-nya tidak diubah, jadi kedua pemanggilnya tidak ikut disentuh.

## Kenapa tidak ada lagi yang terpotong

Viewernya memakai `object-contain` dengan `max-w-full max-h-full`: gambar
diperkecil sampai **muat utuh** di layar, tidak pernah dipotong — berapa pun
perbandingan sisinya. Ditambah cubit/ketuk-dua-kali untuk memperbesar, geser,
dan tombol unduh.

Thumbnail di kartu tetap memakai `object-cover` (terpotong) — itu memang
disengaja supaya petaknya rapi; yang utuh adalah yang muncul saat diketuk.

## Penjaga: `cek-foto.mjs`

Karena perbaikannya satu penangkap, yang dijaga ikut berpindah: bukan "apakah
tiap gambar diberi onClick", melainkan **apakah penangkapnya terpasang dan
aturannya benar**.

1. `PembesarFoto` diimpor, dipasang, dan **membungkus Router** — kalau tidak,
   halaman di dalamnya tidak tercakup.
2. Tidak ada viewer foto kedua yang lebih lemah: `PhotoPreviewModal` harus
   **mengimpor dan merender** viewer bersama, dan tidak boleh membatasi
   lebarnya sendiri. Viewernya harus memakai `object-contain` + `max-h-full`.
3. **14 kasus aturan diuji di DOM sungguhan** di Chromium — `closest()`
   terhadap tombol dan viewer tidak bisa dinilai dari untaian kode: foto biasa,
   jalur relatif, data URL gambar, sumber kosong, jangkar `#`, data URL bukan
   gambar, ditandai `off`, di dalam tombol / tautan / label, ditandai `on` di
   dalam tombol, di dalam viewer, tombol bersarang jauh, dan elemen bukan
   `<img>`.
4. Jangkauan dilaporkan: **107 gambar, 0 ditandai tidak bisa diperbesar.**

Diuji merah tiga arah: mencabut `<PembesarFoto>` dari App, melucuti aturan
tombol, dan mencabut impor viewer dari `PhotoPreviewModal`.

### Dua kesalahan saya sendiri di penjaga ini

- Versi pertama membaca berkas **tanpa mengupas komentar**, lalu menuduh
  `PhotoPreviewModal` "masih membatasi lebar dialognya sendiri" — padahal
  `max-w-md` yang ditemukannya ada di komentar yang **menjelaskan cacat
  lamanya**. Diperbaiki memakai pengupas komentar bersama, yang memang sudah
  diwajibkan `cek-penjaga.mjs`.
- Versi pertama memeriksa viewer bersama dengan mencari namanya saja. Mencabut
  impornya meninggalkan tag JSX-nya utuh, jadi penjaganya **tetap hijau walau
  komponennya sudah rusak** — ketahuan saat diuji merah. Sekarang impornya dan
  pemakaiannya dicari terpisah.
