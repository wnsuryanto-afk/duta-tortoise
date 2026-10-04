# Fertilitas nol, dan clutch yang dianggap selesai saat baru mulai menetas

**4 Oktober 2026** · breeding · diperbaiki

---

Tiga cacat, semuanya kelas yang sama dengan temuan 17,5% kemarin: **pekerjaan
yang belum selesai dihitung sebagai kegagalan**, dan **satu angka dihitung
dua kali dengan rumus berbeda**. Dua di antaranya belum pernah terlihat
karena belum ada telur yang menetas sejak kode itu ditulis — **penetasan
pertama diperkirakan 31 Oktober**.

## 1. Laporan bulanan menyebut fertilitas nol

`MonthlyReportExport` — PDF bulanan yang Anda baca — menghitung telur fertil
begini, di dua tempat:

```js
const fertile = (b.egg_records || []).filter(e => e.status === "fertile").length;
```

Telur yang **menetas** jelas fertil. Telur yang **mati di dalam cangkang**
juga fertil: ia terbukti dibuahi saat candling lalu gagal berkembang. Yang
berstatus `"fertile"` hanyalah telur yang **masih berjalan** — belum menetas,
belum gagal.

Jadi untuk clutch yang sudah selesai, rumus itu menjawab mendekati nol:

| Clutch | menetas | gagal | infertil | fertil sebenarnya | yang dilaporkan |
|---|---:|---:|---:|---:|---:|
| C14 × A29, 16 Mar | 20 | 2 | 1 | **22** dari 23 | **0** |
| C24 × A36, 8 Apr | 22 | 0 | 2 | **22** dari 24 | **0** |

Aturan yang benar sudah ditulis di `lib/hasilInkubasi.js` sejak lama —
*"fertile TOTAL = fertile_only + menetas + gagal"* — dan `fertile_count` yang
**tersimpan** di basis data memang 22 untuk kedua clutch itu. Layar EggGrid
sudah diperbaiki. Laporan bulanannya tidak.

Bedanya bukan sekadar angka: **fertilitas mengukur pejantan, daya tetas
mengukur inkubator.** Laporan yang menyebut fertilitas nol menuding pejantan
untuk kegagalan yang bukan miliknya.

Sekarang keduanya memanggil `fertilClutch()`, yang membaca baris telur dan
jatuh ke `fertile_count` tersimpan untuk clutch lama tanpa baris.

## 2. Clutch dianggap selesai begitu satu telur menetas

Ini yang paling halus, dan ditemukan **oleh penjaga yang baru saya tulis
untuk cacat nomor 1** — bukan dengan membaca kode.

`adaHasil()` punya jaring pengaman untuk data lama yang statusnya tertinggal:

```js
if (STATUS_ADA_HASIL.includes(breeding.status)) return true;
return Number(breeding.hatched_count) > 0;   // ← jaring pengaman
```

Masalahnya: **EggGrid menulis `hatched_count` setiap kali satu telur ditandai
menetas, tanpa mengubah status clutch-nya.** Penetasan kura berlangsung
berhari-hari, jadi clutch berstatus "inkubasi" dengan 5 dari 28 telur sudah
menetas adalah keadaan **normal** — bukan status yang tertinggal.

Jaring itu menganggapnya sudah selesai. Akibatnya, pada hari-hari paling
produktif:

> satu clutch selesai (20/23) + satu clutch baru mulai menetas (5 dari 28)
> → dilaporkan **25 / 51 = 49%**, seharusnya **20 / 23 = 87%**

Makin banyak telur yang sedang menetas, makin buruk kebun ini kelihatan.
Sekarang clutch yang masih berstatus "bertelur" atau "inkubasi" dikecualikan
dari jaring itu — statusnya yang menentukan, bukan tetasan parsialnya.

Daftar status "masih berjalan" terpaksa disalin ke `hasilInkubasi.js` karena
`breedingUtils.js` mengimpor dari sana (saling-impor membuat salah satunya
`undefined` saat bundel dimuat). Salinannya dijaga: penjaga menolak kalau
kedua daftar berselisih.

## 3. Pembilang dan penyebut dari himpunan berbeda

Ringkasan di kepala halaman **Breeding & Telur**:

```js
const telurRiwayat   = breedings.filter(b => !clutchAktif(b)).reduce(... egg_count ...);
const menetasRiwayat = breedings.reduce(... hatched_count ...);   // ← SELURUHNYA
hatchRate: Math.round(menetasRiwayat / telurRiwayat * 100)
```

Penyebutnya hanya clutch yang **tidak aktif**; pembilangnya **semua** catatan.
Hari ini keduanya kebetulan sepadan karena belum ada clutch berjalan yang
punya tetasan. Setelah 31 Oktober, tetasan clutch yang masih dierami masuk
pembilang sementara telurnya tidak pernah masuk penyebut — angkanya
membengkak, dan **bisa melewati 100%**.

Sekarang membaca `ringkasProduksi()`, sama seperti beranda Owner yang sudah
diperbaiki lebih dulu dengan alasan yang sama.

## Penjagaannya

`cek-ronda.mjs` bertambah **6 kasus `fertilClutch`** (termasuk clutch yang
seluruh telurnya menetas, yang dulu menjawab nol), pemeriksaan bahwa
`ringkasProduksi` tidak membengkak pada clutch yang sedang menetas,
pemeriksaan bahwa kedua daftar status tetap sama, dan penolakan terhadap layar
laporan yang menghitung fertilitas sendiri.

Ketiga regresinya diuji merah dulu. Yang nomor 2 memang baru ketahuan **saat
penjaganya dijalankan pertama kali** — saya menulis angka harapan 20/23 dari
perhitungan tangan, kodenya menjawab 25/51, dan yang salah ternyata kodenya.

## Hasil

23 penjaga hijau, `npx vite build` lolos. Tidak ada data historis yang
diubah, dan tidak ada angka hari ini yang berubah — ketiganya baru menyala
setelah telur pertama menetas.
