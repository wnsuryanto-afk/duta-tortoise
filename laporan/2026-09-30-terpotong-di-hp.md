# Tulisan yang terpotong di HP

30 September 2026

## Yang dicari

Anda dua kali menanyakan hal yang sama: **apakah ada yang terpotong.**

Tidak satu pun penjaga yang sudah ada bisa menjawabnya. `vite build`
memeriksa apakah kodenya sah, `eslint` apakah variabelnya ada,
`cek-render` apakah komponennya mau tampil. Ketiganya berhenti sebelum
melihat hasilnya. Sebuah layar bisa lolos ketiganya dengan tulisan yang
putus di tengah huruf.

Jadi 67 layar dirender di Chromium selebar **360px** — HP paling sempit
yang dipakai di lapangan — lalu tiap elemen diukur.

## Temuan

### 1. Setiap penyaring di aplikasi memotong tanpa tanda

Pemicunya satu baris di komponen bersama `ui/select.jsx`:

```
[&>span]:line-clamp-1     bersama     whitespace-nowrap
```

`line-clamp` memasang elipsisnya pada **baris**. `whitespace-nowrap`
memastikan tulisannya tidak pernah pindah baris. Jadi elipsisnya tidak
pernah muncul, dan yang tersisa hanya `overflow: hidden` — potongan
keras, tanpa satu pun tanda bahwa ada yang hilang.

Diukur langsung di peramban: `text-overflow: clip`, bukan `ellipsis`.

Akibatnya di layar 360px:

| Layar | Tertulis | Terbaca |
|---|---|---|
| Dokter Hewan | Semua Spesialisasi (115px) | `Semua Spesialisas` di kotak 104px |
| Kura & Kandang | Semua Tempurung | `Semua Tempurun` |
| Kura & Kandang | Semua Gender | `Semua Gende` |
| Editor Bahan SOP | Stok Pakan | `Stok Paka` |

Dan ini bukan keadaan tepi. Placeholder-nya pendek ("Spesialisasi",
"Tempurung") dan muat; yang tidak muat adalah **nilai bawaannya** —
yang dilihat setiap orang yang belum menyentuh penyaring itu.

### 2. Yang diperiksa lalu ternyata baik-baik saja

Dua hal awalnya terbaca sebagai cacat dan ternyata bukan. Keduanya
dicatat di sini supaya tidak "diperbaiki" lain kali:

- **Tabel Laporan Penjualan** menyembul 139px lewat tepi layar, dan
  **strip penyaring status kura** 232px. Keduanya punya induk yang bisa
  digulung mendatar — memang begitu cara tabel lebar dibuat bisa dicapai
  di HP.
- **Kartu dasbor** dan **sambutan layar terpandu** menyembul 40px. Yang
  menyembul lingkaran buram hias `-top-10 -right-10`, dan `overflow-hidden`
  di situ memang maksudnya memotong.

## Yang dikerjakan

`[&>span]:line-clamp-1` → `[&>span]:truncate [&>span]:min-w-0`, dan
`shrink-0` pada panahnya. Satu baris di komponen bersama, jadi setiap
penyaring di aplikasi ikut berubah: tulisan yang tidak muat sekarang
diakhiri elipsis yang terlihat, bukan dipotong diam-diam.

Lalu empat kotak yang memang terlalu sempit diperbaiki satu per satu:

- **Kura & Kandang** — Gender dan Tempurung disamakan `w-40` dengan empat
  penyaring lain di baris yang sama. Sempat dicoba `w-auto`: pemotongannya
  memang hilang, tetapi dua pil jadi menempel panahnya sementara empat
  lainnya tidak, dan barisnya terbaca ranggas. Lebar seragam lebih baik.
- **Dokter Hewan** — dua penyaringnya semula `w-40` dan `w-36`, sudah tidak
  seragam sejak awal. Keduanya dibuat menyesuaikan isinya, jadi seragam
  satu sama lain dan tidak ada yang terpotong.
- **Editor Bahan SOP** — `w-28` (112px) menyisakan 64px untuk tulisan,
  sedangkan "Stok Pakan" butuh 71px. Nama itu dipakai di seluruh aplikasi
  (menu "Stok & Gudang"), jadi kotaknya yang dilebarkan, bukan namanya
  yang dipendekkan.

Hasilnya: 14 temuan → 0.

## Supaya tidak terulang

`scripts/cek-lebar.mjs`, penjaga ke-19 — dan satu-satunya yang benar-benar
melihat hasilnya, bukan kodenya. Ia menyalakan server ujinya sendiri,
merender 67 kasus di Chromium 360px, lalu menolak tulisan yang terpotong
tanpa jalan keluar.

Tiga hal sengaja tidak dihitung, masing-masing dengan alasan tertulis di
berkasnya: apa pun di dalam jalur gulung mendatar, elemen tanpa tulisan
(lingkaran hias), dan isi SVG (label sumbu Recharts meleset 3px karena
mesin grafiknya).

Penjaga ini sudah diuji bisa merah: `line-clamp-1` dikembalikan dan
Tempurung disempitkan lagi ke `w-36` — langsung tertangkap,
`terpotong +11px "Semua Tempurung"`.

Seluruh rangkaian 19 penjaga jalan 58 detik.

## Catatan

Tidak ada data historis yang diubah.
