# Saklar "Tipe Gaji" yang tidak menyalakan apa pun

**2 Oktober 2026** · layar Konfigurasi Gaji · diperbaiki

---

## Yang terjadi

Layar **Konfigurasi Gaji** punya dua tombol besar:

> 📅 Bulanan (Rp/bulan)  ·  📆 Harian (Rp/hari)

Tombolnya bekerja: ia berpindah, tersimpan ke kolom `salary_type`, dan
mengubah tampilan. Label gaji pokok berganti antara `/hari` dan `/bln`,
dan kolom **Potongan Absen** muncul atau hilang mengikutinya.

Yang tidak dilakukannya: **mengubah cara orang dibayar.**

Penggajian tidak pernah membaca `salary_type`. `hitungGaji()` menentukan
harian atau bulanan dari **peran**:

```js
// src/lib/hitungGaji.js:82
export const PERAN_HARIAN = ["keeper", "kepala_feeder"];
// :394
const harian = adalahPeranHarian(karyawan.role);
// :454
const gajiPokok = harian ? hariHadir * config.base_salary : config.base_salary;
```

Satu-satunya pembaca `salary_type` di seluruh aplikasi adalah layar
konfigurasi itu sendiri — untuk labelnya sendiri. Begitu juga
`payment_period`: ditulis, disimpan, tidak pernah dibaca siapa pun.

## Kenapa itu berbahaya, padahal hari ini angkanya benar

Keempat baris SalaryConfig hari ini **sejalan** dengan perannya:

| Peran | `base_salary` | `salary_type` | Dibayar penggajian |
|---|---|---|---|
| keeper | 70.000 | harian | hari masuk × 70.000 ✔ |
| kepala_feeder | 70.000 | harian | hari masuk × 70.000 ✔ |
| admin | 250.000 | bulanan | — (bukan peran bergaji) |
| manajer | 0 | bulanan | — (bukan peran bergaji) |

Jadi tidak ada satu rupiah pun yang salah dibayar. Yang ada adalah
**saklar yang menunggu ditekan.**

Pemilik yang menyetel keeper jadi "📅 Bulanan" akan melihat layarnya
berubah jadi:

> Gaji Pokok **Rp 70.000/bln** · Potongan Absen −Rp 0/hari

dan percaya keeper sekarang dibayar Rp 70.000 sebulan. Slipnya tetap
terbit **hari masuk × Rp 70.000** — sekitar Rp 2.100.000. Tidak ada
error, karena kedua angkanya sah. Hanya layarnya yang berbohong.

Dan bawaan untuk konfigurasi **baru** adalah `"bulanan"` — salah untuk
keeper dan kepala_feeder, dua-duanya satu-satunya peran yang benar-benar
digaji di sini. Siapa pun yang menekan "Tambah Konfigurasi" untuk keeper
dan tidak menyentuh tombolnya akan langsung melihat label yang salah.

## Yang diperbaiki

**Jenis gaji sekarang diturunkan dari peran**, memakai fungsi yang sama
yang membayar:

```js
const isHarian = adalahPeranHarian(form.role);
```

Dua tombolnya diganti keterangan — bukan pilihan:

> Jenis Gaji · 📆 Harian
> Mengikuti peran: hari masuk × Rp/hari. Absen tidak dibayar, jadi tidak
> ada potongan absen.

Tombol `payment_period` dihapus dengan alasan yang sama. Gaji dibayar
**bulanan** sejak 30-09-2026, dan itu dijaga oleh `cek-gaji.mjs`, bukan
oleh dua tombol di layar konfigurasi.

`salary_type` berhenti ditulis sama sekali. Menyimpan nilai **turunan**
ke basis data justru mengembalikan masalahnya: sebuah kolom tersimpan
yang kelak bisa dipercaya melebihi peran, lalu berselisih dengannya.
Nilai yang sudah ada di keempat baris **tidak dihapus** — hari ini
keempatnya memang sejalan dengan perannya.

Bila kelak admin atau manajer memang mau digaji harian, yang diubah
adalah `PERAN_HARIAN` di `hitungGaji.js` — satu tempat, dan layar
konfigurasi ikut sendiri.

## Temuan kedua di layar yang sama: kotak tarif trip

Tarif satu trip rempesan punya **dua kolom** untuk angka yang sama.
`tarifTrip()` membaca `rempesan_rate_per_trip` lebih dulu, lalu jatuh ke
`vegetable_rate_per_trip`. Di data sekarang justru yang **kedua** yang
berisi (Rp 30.000), yang pertama kosong.

Layar konfigurasi hanya bisa menyunting kolom kedua, dan melabelinya
dengan nama jalur lama, "Tunjangan Sayur" — sementara kartu di layar yang
sama menyebut angka itu "Tarif Rempesan". Satu angka, dua nama, satu
kolom yang bisa disunting dari dua.

Akibatnya: begitu ada yang pernah mengisi `rempesan_rate_per_trip`
(lewat layar lain atau editor data Base44), kotak di layar ini berhenti
berpengaruh — tanpa satu pun tanda.

Sekarang satu kotak, dan ia **menulis kedua kolom** dengan angka yang
sama, jadi yang dibaca lebih dulu dan cadangannya tidak bisa berselisih.
Kotaknya juga diisi dari `tarifTrip()`, bukan dari satu kolom mentah,
supaya yang terlihat adalah angka yang benar-benar dipakai penggajian.

Satu hal yang sengaja **tidak** dilakukan: saat kotaknya dikosongkan,
`rempesan_rate_per_trip` tidak ditulis sama sekali. `tarifTrip()`
menerima **0 sebagai keputusan yang sah** (`>= 0`), jadi menulis 0 ke
sana akan membayar trip Rp 0 — bukan jatuh ke cadangan Rp 30.000.

## Penjagaannya

`cek-gaji.mjs` bagian 6 menolak kode yang:

1. menentukan harian/bulanan dari `salary_type` di layar konfigurasi;
2. tidak memakai `adalahPeranHarian()` di layar itu;
3. tidak memakai `tarifTrip()` di layar itu.

Ketiganya diuji merah dulu sebelum dipakai. Penjaga ketiga sempat hijau
palsu: ia mencari teks `"tarifTrip"`, yang juga cocok dengan nama state
`tarifTripTeks` — jadi ia tetap lolos meski fungsinya sudah dibuang.
Sekarang yang dicari `tarifTrip\(`, pemanggilannya.

## Yang tidak diubah

Baris **admin** (Rp 250.000) dan **manajer** (Rp 0) tidak disentuh.
Keduanya bukan peran bergaji di aplikasi ini — `PERAN_BERGAJI` hanya
memuat keeper dan kepala_feeder — jadi `base_salary` mereka tidak pernah
dikalikan hari masuk dan tidak pernah terbit sebagai slip. Labelnya
sekarang berbunyi "Bulanan", yang benar menurut peran, dan itu saja.

Tidak ada data historis yang diubah.
