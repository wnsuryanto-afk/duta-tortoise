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

## Sisa yang perlu diputuskan pemilik

**Apakah hari mengambil RUMPUT dihitung trip?** Saat ini jawabannya berbeda
tergantung jejaknya, dan itu tidak disengaja:

- jejak di **absensi** (`late_reason: "cari_rumput"`, labelnya "Cari rumput /
  sayur") → **ditagih**, jadi dibayar
- jejak di **Pakan Harian** (`feed_source: "rumput"`) → **tidak ditagih**

`SUMBER_PAKAN_TRIP` hanya memuat `sayur_pasar` dan `campur`. Alasannya bisa
dibela — rumput mungkin dipotong di lokasi, jadi mencatat "hari ini memberi
rumput" belum tentu berarti ada perjalanan — tetapi komentar di atas fungsinya
sendiri berbunyi "mengambil sayur/**rumput**", jadi setidaknya salah satunya
keliru. Saya tidak mengubah daftarnya: ini keputusan upah, bukan keputusan
kode.

Satu-satunya baris Pakan Harian bersumber `rumput` di data adalah **27 Juli
2026, Angsolo, "Rumput susah"** — dan dua baris 8 September bersumber
`lainnya` (Mentimun, Waloh) juga tidak ditagih.

**Pertanyaannya:** hari mengambil rumput dibayar trip atau tidak? Dan apakah
`lainnya` (mentimun, waloh) termasuk perjalanan?
