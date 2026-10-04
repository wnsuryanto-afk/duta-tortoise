# Tiga perubahan di modul Breeding

**4 Oktober 2026** · halaman Pembiakan & Telur

---

## 1. Kartu peringatan tray dicabut

Kartu kuning **"Telur yang induknya bisa hilang saat menetas"** dihapus dari
halaman, atas permintaan pemilik.

Yang **tidak** dihapus adalah hitungannya. `clutchTanpaTray()` dan
`bentrokTrayAktif()` tetap ada di `src/lib/trayTelur.js` dan tetap diuji
`cek-ronda.mjs`, karena keadaannya belum berubah — pada 2 Okt 2026, 127 dari
208 butir masih tanpa tray dan 40 butir berbagi tray 8 — dan laporan
`2026-10-02-telur-tanpa-tray.md` dibangun dari angka-angka itu. Yang dicabut
adalah kartunya, bukan faktanya.

## 2. Mencari per bulan: induk mana saja yang bertelur

Di sebelah kotak pencarian nama sekarang ada pilihan **bulan**. Memilih
September menampilkan satu baris ringkas:

> **September 2026** · 7 induk · 7 clutch · 136 butir
> `A31 23 butir` `A46 22 butir` `A47 25 butir` `C23 23 butir` `C22 17 butir`
> `A48 13 butir` `B108 13 butir`

Tiga hal yang diputuskan dengan sengaja:

**Satu baris per INDUK, bukan per clutch.** Induk yang bertelur dua kali
dalam satu bulan tampil sekali dengan tanda `2×`. Daftar per clutch akan
menyebut namanya dua kali dan membuat "berapa induk yang bertelur" harus
dihitung ulang dengan mata.

**Hanya bulan yang punya catatan yang muncul** di pilihan. Daftar dua belas
bulan yang sebelas di antaranya kosong membuat orang mengira datanya hilang.
Pilihannya juga dihitung dari *seluruh* catatan, bukan dari yang sudah
disaring — kalau dihitung dari hasil saringan, memilih September menyisakan
September sebagai satu-satunya pilihan, dan tidak ada jalan kembali.

**Bulan dan nama bekerja bersama, tidak saling menghapus.** "A31 bulan
September" adalah satu pertanyaan, bukan dua. Keduanya ikut tersimpan di
alamat halaman, seperti kata pencarian — jawaban yang mau ditunjukkan ke
orang lain harus punya alamat.

Bulannya diambil dengan **memotong teks** tanggalnya (`"2026-09-04"` →
`"2026-09"`), bukan lewat `new Date`. `new Date("2026-10-01")` dibaca tengah
malam UTC; di zona waktu barat Greenwich tanggal itu jatuh ke 30 September,
dan catatan paling awal tiap bulan akan terhitung di bulan sebelumnya. Lima
karakter pertama tidak bisa salah baca.

## 3. Hitung mundur besar di setiap clutch

Tab **Pembiakan** — yang dibuka sehari-hari — sekarang menampilkan angka
besar di sisi kanan tiap kartu:

> perkiraan menetas
> **78**
> hari lagi

Tiga keadaan, dan angkanya selalu berarti hal yang sama dengan kalimat tepat
di bawahnya:

| Keadaan | Angka | Warna |
|---|---|---|
| belum masuk jendela | hari menuju perkiraan mulai menetas | >30 hijau, ≤30 oranye, ≤7 merah |
| sedang di dalam jendela | sisa hari sampai jendela tutup | merah |
| sudah lewat | berapa hari melewati perkiraan | merah |

### Kenapa ini bukan sekadar menambah tampilan

Hitung mundur yang sama **sudah ada** di tab "Telur & Inkubasi", ditulis
langsung di dalam JSX halaman: belasan baris yang menghitung `daysToStart`,
`daysToEnd`, `inHatchRange` dan warnanya. Tab Pembiakan tidak punya angka itu
sama sekali.

Menyalin belasan baris itu ke tab kedua akan membuat dua salinan aturan yang
sama persis — dan aturan yang punya dua salinan selalu berakhir berselisih.
Jadi aturannya dipindahkan ke `src/lib/hitungMundur.js` sekali, dan **kedua
tab memanggilnya**. Yang tersisa di halaman hanya `inHatchRange`, karena ia
juga mewarnai header dan bingkai kartunya.

### Satu cadangan yang arahnya salah

Kode lama memakai `estimated_hatch_date` sebagai cadangan untuk tanggal
**mulai**. Di data yang ada, kolom itu berisi tanggal yang sama dengan
`estimated_hatch_end` pada 12 dari 13 baris — jadi ia tanggal **tutupnya**
jendela, bukan bukanya. Cadangan yang salah arti tidak pernah ketahuan selama
kolom aslinya terisi, dan `estimated_hatch_start` terisi di seluruh 13 baris.
Sekarang ia jadi cadangan untuk tanggal akhir, sesuai isinya.

### Yang diperiksa dan ternyata TIDAK rusak

Saya sempat menduga kode lama salah hitung sore hari, karena ia membandingkan
tanggal dengan `new Date()` yang membawa jam. Diuji langsung: `parseISO`
date-fns membaca "YYYY-MM-DD" sebagai tengah malam **lokal**, bukan UTC, jadi
jawabannya sama pada jam 06:00 maupun 17:30. **Kode lama benar**, dan
pemindahan ini bukan perbaikan bug — ia menghapus salinan kedua dan memberi
tab Pembiakan angka yang belum pernah dipunyainya.

Fungsi barunya tetap menurunkan kedua sisi ke "hari" lebih dulu, dan itu
diuji di tiga zona waktu (Jakarta, New York, Kiritimati UTC+14) supaya tetap
benar kalau kelak dipanggil dengan `Date` yang membawa jam.

## Penjagaannya

`cek-ronda.mjs` bertambah **5 kasus saringan bulan** dan **10 kasus hitung
mundur**, termasuk batas-batas yang mudah salah: hari pertama jendela
menetas, hari terakhir jendela (masih di *dalam*, bukan lewat), dan catatan
tanpa tanggal yang tidak boleh masuk bulan mana pun.

Regresi diuji merah dulu: mengganti perhitungan hari dengan `new Date()`
mentah membuat tujuh kasus gagal, termasuk hari terakhir jendela yang
terbaca "lewat".

`cek-render.mjs` dan `cek-lebar.mjs` naik dari 81 ke **90 komponen** — empat
kasus `BulanBertelur` dan tujuh kasus `HitungMundurMenetas`, semuanya lolos
di layar 360px. 21 penjaga hijau.
