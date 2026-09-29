# Tombol yang menjanjikan Rp 30.000 yang tidak akan dibayar

**Pemeriksaan 29 September 2026.** Bermula dari satu pertanyaan sederhana:
`RempesanLog` punya halaman lengkap, formulir, alur persetujuan, dan tarif per
trip — dan nol catatan. Kenapa?

**Tidak ada data yang diubah.**

---

## Temuan utama

Di layar harian kiper ada tombol sekali tekan:

> 🥬 **Hari ini saya ambil sayur di pasar**
> *Tambahan Rp 30.000. Tekan sekali saja, pada hari Anda benar-benar ke pasar.*

Menekannya memunculkan keterangan:

> *"Trip sayur tercatat. **Upah Rp 30.000 masuk hitungan gaji bulan ini.**"*

**Kalimat itu sudah tidak benar sejak 19 September 2026.**

Tombol itu menulis satu baris `PakanHarian` bersumber `sayur_pasar`. Sampai
19 September, di situlah upah trip memang dihitung. Pada tanggal itu tiga jalur
pembayaran trip yang saling tidak tahu disatukan ke satu sumber:
`RempesanLog` yang sudah **disetujui**. Yang berpindah adalah para PEMBAYAR.
Tombolnya tidak ikut berpindah, dan tetap mengumumkan uang yang tidak akan
sampai.

### Kenapa ini lebih buruk daripada sekadar keliru

Aplikasi sebenarnya sudah punya obatnya: kartu **"belum dicatat rempesannya"**
di dasbor kiper menagih justru hari-hari seperti ini. Tetapi orang yang baru
saja diberi tahu uangnya sudah masuk tidak punya alasan menanggapi tagihan itu.

**Janji itu membatalkan obatnya sendiri.** Itu sebabnya yang diperbaiki
kalimatnya, bukan hanya komentarnya.

### Yang diperbaiki

| Sebelum | Sesudah |
|---|---|
| "Upah Rp 30.000 masuk hitungan gaji bulan ini." | "Upahnya baru dihitung setelah rempesannya dicatat (berat + foto) dan disetujui — buka menu Rempesan." |
| "✓ Trip sayur pasar tercatat hari ini — Rp 30.000" | "✓ Trip sayur pasar tercatat hari ini" + tautan "Upahnya menunggu catatan rempesan — catat beratnya di sini" |
| "Tambahan Rp 30.000." | "Upah trip dibayar setelah rempesannya dicatat dan disetujui." |

Satu lagi: tombol itu menyegarkan kunci kueri `["veg-trips"]` — kunci yang
sudah tidak dibaca siapa pun. Sekarang ia menyegarkan `["pakan-harian-trip"]`,
kunci yang dibaca penagih di dasbor, sehingga tagihannya muncul **seketika di
layar yang sama**, bukan besok.

---

## Temuan kedua: tab "Log Sayur" pecah pada catatan pertama

Di halaman Penggajian, tab itu dulu menerima PETA `{email: {trips, dates}}`.
Saat sumbernya dipindah ke `RempesanLog`, yang berganti hanya **nama
variabelnya** — `rempesanLogs` adalah DAFTAR catatan, bukan peta. JSX-nya tetap
memanggil `Object.entries(...)` dan membaca `data.trips` serta `data.dates`
yang tidak ada pada sebuah catatan.

Hari ini `RempesanLog` kosong, jadi `Object.keys([])` bernilai nol dan tab itu
menampilkan "Belum ada trip" — **jawaban yang benar karena kebetulan.**

Diuji dengan satu catatan disetujui, bentuk lamanya menghasilkan:

```
0 | – | undefined trip
```

Nama orangnya jadi `"0"` (indeks arraynya), tanggalnya `–`, jumlah tripnya
kosong. Cacat itu akan muncul tepat pada catatan rempesan pertama yang pernah
dibuat — yaitu tepat pada saat seluruh perbaikan ini mulai berhasil.

Sekarang ringkasannya dibangun dari `tripSah()`: disetujui saja, satu trip per
orang per tanggal — aturan yang sama dengan slipnya. Yang masih menunggu
persetujuan disebut terpisah dengan tautan ke halaman Rempesan, karena pemilik
membuka halaman Penggajian justru pada saat ia peduli ada yang perlu disetujui.

---

## Temuan ketiga: angka di profil karyawan bukan angka yang dibayar

Kartu **"Trip Sayur"** di halaman detail karyawan membaca `PakanHarian` lewat
`useVegTrips`, sementara slipnya membayar dari `RempesanLog`. Komentar tepat di
atasnya menyatakan keduanya "sumber yang sama" — benar sebelum 19 September,
salah sesudahnya.

Kartu itu sudah salah **dua kali berturut-turut, dengan cara berbeda**: mula-
mula membaca `VegetablePickup` (entitas tanpa satu pun catatan, jadi selalu
nol), lalu dipindah ke `PakanHarian` — benar pada saat itu — lalu ditinggalkan
saat para pembayar pindah lagi.

Sekarang ia memakai `tripPerPeriode()`, penolong yang sama dengan penerbit
slip, dan namanya jadi **"Trip Rempesan"**. Hari ini keduanya nol, jadi
selisihnya belum merugikan siapa pun — persis keadaan yang membuat cacat
semacam ini bertahan sampai ada yang dirugikan.

`useVegTrips` kini tidak punya pemakai dan berkasnya dihapus — sesuatu yang
pesan commit 19 September sudah menyatakan dilakukan, padahal tidak.

---

## Yang diuji

Enam uji pada logika ringkasan, memakai pustaka aslinya:

| Uji | Hasil |
|---|---|
| daftar kosong | lulus |
| satu catatan disetujui | lulus (bentuk lama: `0 \| – \| undefined trip`) |
| dua catatan disetujui di tanggal sama → tetap 1 trip | lulus |
| pending tidak dibayar tetapi disebut | lulus |
| ditolak tidak muncul sama sekali | lulus |
| angka profil karyawan = angka yang dibayar | lulus |

---

## Keputusan pemilik, 29 September 2026: rumput BUKAN trip

Pertanyaannya: hari mengambil rumput dibayar trip atau tidak?

**Jawaban pemilik: tidak.** Yang dibayar hanya perjalanan mengambil sayur.

`SUMBER_PAKAN_TRIP` ternyata sudah sesuai — ia memang hanya memuat
`sayur_pasar` dan `campur`. Yang bertentangan dengan keputusan itu justru
**sisi absensi**, dan cara bertentangannya halus:

Pilihan alasan check-in cuma SATU, berbunyi **"Cari rumput / sayur"** — satu
pilihan untuk dua hal yang kini berbeda upahnya. Dan penagih rempesan mengubah
**setiap** baris beralasan itu menjadi trip berbayar. Artinya, seorang kiper
yang terlambat karena memotong rumput akan ditagih mencatat rempesan, lalu
dibayar Rp 30.000 untuk sesuatu yang pemiliknya putuskan tidak dibayar.

Selama alasan itu hanya menerangkan jam masuk, menggabungkan rumput dan sayur
tidak apa-apa. Begitu salah satunya berarti uang, penggabungan itu jadi cacat.

### Yang diperbaiki

| | Sebelum | Sesudah |
|---|---|---|
| Pilihan alasan | "Cari rumput / sayur" (satu) | "Ambil sayur di pasar" **dan** "Cari rumput" (dua) |
| Yang ditagih jadi trip | setiap baris `cari_rumput` | hanya `ambil_sayur` |
| Tanda di layar | tidak ada | lencana **"Trip berbayar"** pada pilihan yang berarti uang |
| Nama komponen | `RumputBelumDicatat` | `TripBelumDicatat` |

`cari_rumput` **dipertahankan** di dalam enum dan tetap sah: ia menerangkan jam
masuk dengan benar, hanya tidak lagi menghasilkan trip. Wajib fotonya juga
tetap, untuk kedua alasan pengambilan pakan.

Skema `Attendance` diubah dengan seluruh 25 field lama disertakan — dihitung
sebelum dan sesudah: 25 dan 25.

**Tidak ada catatan yang berubah.** Diperiksa sebelum mengubah: nol baris
absensi memiliki `late_reason` sama sekali, karena dialog alasannya baru mulai
menyimpan jawabannya hari ini. Jadi pemisahan ini tidak memindahkan satu pun
hari dari "dibayar" ke "tidak dibayar" — ia hanya menentukan apa yang terjadi
mulai besok.

### Yang diuji

Enam belas uji memakai pustaka aslinya, semuanya lulus:

| Uji | Hasil |
|---|---|
| hari "ambil sayur" ditagih | lulus |
| hari "cari rumput" TIDAK ditagih | lulus |
| "tugas luar" tidak ditagih | lulus |
| campuran tiga hari → hanya yang sayur tersaring | lulus |
| hari yang sudah ada rempesannya tidak ditagih dua kali | lulus |
| Pakan Harian sumber `rumput` / `lainnya` tidak ditagih | lulus |
| Pakan Harian sumber `sayur_pasar` / `campur` ditagih | lulus |
| kedua sisi sepakat rumput bukan uang | lulus |
| tepat satu pilihan bertanda trip, dan itu yang ditagih | lulus |
| kedua alasan pakan tetap wajib foto | lulus |
| nilai lama `cari_rumput` masih dikenal | lulus |

### Satu hal kecil yang ikut

Contoh pada "Tugas luar lain" dulu berbunyi *"Beli obat, **ke pasar**, antar
kura"*. Sejak ada pilihan "Ambil sayur di pasar", menyebut pasar di dua tempat
membuat pilihan yang berbayar bisa terlewat. Contohnya diganti jadi *"Beli
obat, antar kura, urusan lain di luar kandang"*.

### Masih terbuka

Dua baris Pakan Harian 8 September bersumber `lainnya` (Mentimun, Waloh) juga
tidak ditagih. Kalau keduanya sebenarnya dibeli di pasar, sumbernya yang perlu
dibetulkan saat mencatat — bukan daftarnya yang dilebarkan, karena `lainnya`
adalah keranjang sisa yang isinya tidak bisa ditebak.
