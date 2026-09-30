# Verifikasi lapangan 30 September: apa yang benar-benar terjadi di kandang

Tiga perbaikan dari minggu ini menjanjikan sesuatu yang hanya bisa dibuktikan
oleh pemakaian nyata, bukan oleh uji. Hari ini hari pembuktiannya.

**Tidak ada data yang diubah.**

---

## ✅ 1. Formulir pakan: hidup

Formulir Pakan Harian sudah lengkap sejak lama tetapi tidak pernah terpakai —
tombol kameranya membuka kamera lebih dulu, jadi formulirnya tidak pernah
sempat muncul. Diperbaiki dengan memindahkan penjaganya ke satu titik sempit.

**Baris baru hari ini, 30 September pukul 08:24 WIB:**

| Kolom | Isi |
|---|---|
| Pencatat | Angsolo |
| Sumber pakan | rumput |
| **`weight_kg`** | **64,97** |
| Foto | ada |
| **`sop_task_id`** | **tertaut ke tugas SOP** |

Dua kolom yang dicetak tebal itu buktinya. `weight_kg` adalah field yang baru
ditambahkan minggu ini — kalau formulirnya masih tidak terjangkau, kolom itu
akan tetap kosong selamanya. Dan `sop_task_id` menunjukkan barisnya lahir dari
tugas hariannya, bukan dari orang yang kebetulan membuka halaman.

**Satu hal yang ikut terlihat.** Baris 8 September menyimpan `basket_count:
64,97` — angka yang mustahil sebagai jumlah keranjang mentimun, tetapi masuk
akal sebagai kilogram. Saat itu belum ada kolom berat, jadi beratnya dititipkan
ke kolom keranjang. Hari ini angka sejenis masuk ke `weight_kg` dan
`basket_count` dibiarkan kosong. Kolomnya sekarang benar.

`PakanHarian`: **3 baris → 4**.

---

## ✅ 2. `late_minutes`: terisi untuk pertama kalinya

Kolom `late_minutes` ada di skema sejak awal dan bernilai **0 di seluruh 117
baris** yang pernah tercatat — bukan karena tidak ada yang terlambat, melainkan
karena satu-satunya kode yang pernah mengisinya adalah fungsi server yang belum
pernah membuat satu baris pun.

**Diperiksa hari ini: tepat SATU baris di seluruh database punya
`late_minutes > 0`.**

| | |
|---|---|
| Nama | Angsolo |
| Tanggal | 30 September 2026 |
| Shift mulai | 07:00 |
| Check in | **07:55** |
| `late_minutes` | **55** |
| Lokasi terverifikasi | ya |

Itu baris pertama dalam sejarah aplikasi ini yang mencatat keterlambatan
sebagai angka. Rekan satunya, Sholehuddin, masuk 06:45 dan tercatat `0` — jadi
yang terisi bukan angka asal, melainkan hasil hitungan yang benar di kedua
arah.

---

## ⏳ 3. Dialog alasan: belum teruji, dan bukan karena rusak

Dialog alasan baru muncul bila keterlambatan **melewati 60 menit**
(`AMBANG_ALASAN_MENIT`). Hari ini Angsolo terlambat **55 menit** — lima menit di
bawah ambang. Jadi dialognya memang tidak ditanyakan, dan `late_reason` tetap
kosong.

Itu perilaku yang benar, bukan kegagalan. Tetapi ia menyingkap sesuatu yang
perlu diketahui pemilik:

| | |
|---|---|
| Pola Angsolo, 16 Juli – 19 September | menumpuk di **08:01–08:14** (61–74 menit) |
| Ambang bertanya | **60 menit** |
| Hari ini | **07:55** (55 menit) |

Ambang 60 menit dipilih tepat untuk menangkap gerombolan 08:01–08:14 itu. Hari
ini meleset lima menit. Artinya dialognya akan menyala **kadang-kadang**, bukan
tiap hari — dan itu memang yang diinginkan: bertanya setiap hari akan membuat
jawabannya diketik asal.

**Yang masih harus dibuktikan besok atau lusa:** satu check-in di atas 08:00
yang membawa alasan dan fotonya. Sampai itu terjadi, jalur alasannya baru lulus
uji, belum lulus lapangan.

---

## Keadaan penagih yang lain, per hari ini

| Penagih | Keadaan | Benar? |
|---|---|---|
| Trip rempesan | `RempesanLog` masih **0** | **ya** — baris pakan hari ini bersumber `rumput`, dan pemilik memutuskan rumput bukan trip |
| Histori kawin | `Perkawinan` masih **0** | penagihnya baru terpasang kemarin |
| Pemantauan inkubator | 145 telur, pembacaan terakhir 1 Juni | penagihnya baru terpasang hari ini |

Yang pertama patut dicatat: penagih rempesan **tidak** menyala untuk hari
rumput. Itu keputusan pemilik 29 September yang bekerja persis seperti
seharusnya — bukti pertama bahwa pemisahan rumput/sayur berjalan benar di
lapangan.

---

## Ringkasan

| Perbaikan | Status |
|---|---|
| Formulir pakan terjangkau | **terbukti bekerja** |
| `late_minutes` terisi | **terbukti bekerja** |
| Dialog alasan menyimpan jawabannya | **belum teruji** — ambang belum terlewati |
| Rumput bukan trip | **terbukti bekerja** |
