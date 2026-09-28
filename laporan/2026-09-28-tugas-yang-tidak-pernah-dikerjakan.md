# Tugas terjadwal yang nol kali dikerjakan (10–28 September 2026)

Dicatat 28 September 2026. Sumber: seluruh MaintenanceLog 10–28 Sep (19 hari),
dibandingkan dengan 35 SOPTask aktif dan jadwalnya masing-masing.

## Ringkasan

Dua puluh lima dari tiga puluh lima tugas aktif pernah dicentang dalam rentang
itu. Sisanya sepuluh, dan tidak semuanya bermasalah:

| Tugas | Alasan tidak muncul |
|---|---|
| Pemberian pakan + cek kesehatan (all kandang) | dicatat per-kandang, bukan `sop_<id>` — normal |
| Pembersihan kandang (all kandang) | idem — normal |
| Timbang kura rotasi (ROTASI OTOMATIS) | mekar jadi `ukur_rotasi_<id>` — normal |
| Pupuk pohon buah | jadwal tgl 1, di luar rentang — normal |
| Bersihkan rumput di pagar | jadwal tgl 5, di luar rentang — normal |
| **Panen azolla untuk pakan** | **dikunci manual sejak 18-09-2026** — lihat di bawah |
| Pembersihan kaktus DT2 | **benar-benar nol** |
| Pupuk UREA kolam azolla | **benar-benar nol** |
| Catat pengambilan bahan dari gudang | **benar-benar nol** |
| Perawatan kebun kaktus | **benar-benar nol** |
| Ganti pupuk asola | **benar-benar nol** |

## Yang benar-benar tidak dikerjakan

| Tugas | Jadwal | Kali terjadwal | Dikerjakan | Poin tidak keluar |
|---|---|---|---|---|
| Pembersihan kaktus DT2 | Senin & Kamis | 6 | 0 | 30 |
| Catat pengambilan bahan dari gudang | Sabtu | 3 | 0 | 30 |
| Pupuk UREA kolam azolla | Senin | 3 | 0 | 15 |
| Perawatan kebun kaktus | Rabu | 2 | 0 | 20 |
| Ganti pupuk asola | tgl 15 | 1 | 0 | 20 |
| **Total** | | **15** | **0** | **115 poin ≈ Rp 8.625** |

Tugasnya BUKAN tidak terlihat: `terjadwalPada` sudah diperiksa dan benar
(mingguan memakai `weekly_days` terhadap hari, bulanan memakai
`monthly_dates` terhadap tanggal), tidak satu pun bertanda `di_ubin_kandang`
atau `di_luar_persen`, semuanya `wajib_untuk_role: keeper` atau `semua`, dan
tidak ada yang ditugaskan ke orang tertentu. Keempat-lima tugas itu memang
muncul di daftar kiper pada hari jadwalnya, dan tidak dicentang.

## Kolam azolla: lingkaran yang tidak menutup

Ini yang paling perlu diperhatikan, dan bukan soal poin.

"Panen azolla untuk pakan" dikunci manual pada 18 September dengan catatan:

> "Stok azolla habis - dikunci manual 18-09-2026 (Iwan). BUKA KEMBALI begitu
> kolam siap panen; selama terkunci tugas ini tidak dihitung sebagai kewajiban
> dan tidak dibayar poin."

Penguncian itu benar dan mekanismenya bekerja — `tugasWajib` memang
mengeluarkan tugas ber-`terkunci_bahan`, sehingga tim tidak dihukum karena
keadaan kolam. Tetapi:

| Tugas azolla | Terjadwal | Dikerjakan |
|---|---|---|
| Perawatan kolam (cek air, buang kotoran) | — | 5× |
| Cek ketinggian air | — | 4× |
| **Pupuk UREA kolam (Senin)** | **3×** | **0** |
| **Ganti pupuk asola (tgl 15)** | **1×** | **0** |
| Panen | — | terkunci |

Kolamnya DIPERIKSA dan DIBERSIHKAN, tetapi tidak DIPUPUK. Padahal pupuk itulah
yang membuat azolla tumbuh kembali sampai siap dipanen. Panennya menunggu kolam
pulih; yang memulihkan kolam tidak dikerjakan. Sepuluh hari berlalu dan
kuncinya belum pernah dibuka.

Azolla adalah pakan yang dipanen sendiri. Selama kolamnya tidak pulih,
kebutuhan pakan itu berpindah ke sayur pasar — yang dibeli.

## Celah mekanisme yang perlu ditutup

`terkunci_bahan` bisa dinyalakan, dan catatannya bahkan menuliskan niat
membukanya kembali ("BUKA KEMBALI begitu kolam siap panen"). Tetapi **tidak ada
satu pun tempat di aplikasi yang mengingatkan bahwa ada kunci yang menunggu
dibuka.** Sebuah keadaan dimasuki dengan niat ditinjau ulang, tanpa apa pun
yang membawanya kembali ke perhatian orang.

Ini pola yang sama dengan beberapa temuan lain sesi ini: PrinterConfig yang
diisi lalu tidak pernah dibaca, RempesanLog yang punya halaman lengkap dan nol
catatan, kandang N yang dibuat lalu tidak muncul di ronda. Alatnya ada,
niatnya ada, yang tidak ada adalah sesuatu yang mengingatkan.

## Usulan

1. **Buka kembali kunci panen azolla** bila kolamnya memang sudah siap — atau
   biarkan terkunci, tetapi jalankan pemupukannya supaya kolam bisa pulih.
2. **Pengingat kunci yang menua**: tugas ber-`terkunci_bahan` yang sudah
   terkunci lebih dari sekian hari ditampilkan ke pemilik, dengan alasan
   penguncian dan tanggalnya. Belum dibuat — menunggu keputusan.
3. **Laporan "nol kali dikerjakan"**: melengkapi layar "Tenggat vs jam kerja
   sebenarnya" yang sudah ada. Yang itu mengukur KETERLAMBATAN; yang ini
   mengukur KETIADAAN. Keduanya pertanyaan berbeda, dan yang kedua belum punya
   layarnya.
