# Dua bocoran uang di halaman "Catat Pengeluaran"

**30 September 2026** — ditemukan sambil menghitung siapa menulis apa di
area Uang, bukan dari laporan keluhan. Keduanya **belum terjadi di data**.
Keduanya sudah ditutup di kode. **Tidak ada satu baris data yang diubah.**

---

## Kenapa audit ini dilakukan

Area Uang punya tujuh pintu menu. Sebelum menyatukan mana pun, dihitung
dulu siapa yang **menulis** dan siapa yang hanya **membaca**:

| Pintu | Menulis |
|---|---|
| `/finance` Laporan Keuangan | FinanceTransaction, CompanySettings |
| `/catat-biaya` Catat Pengeluaran | FinanceTransaction |
| `/operational-costs` Biaya Operasional | FinanceTransaction |
| `/petty-cash` Kas Kecil | PettyCashRequest, PettyCashLedger |
| `/sales` Penjualan Kura | Sale, Tortoise |
| `/sales-report` Laporan Penjualan | — (nol tulis) |
| `/crm` Data Pembeli | — (nol tulis) |

Tiga halaman menulis ke satu tabel yang sama. Di situlah dua cacat
ditemukan.

---

## Bocoran satu — pengeluaran Mode Uji tercatat sebagai pengeluaran sungguhan

Dari tiga penulis FinanceTransaction, dua menyertakan `...testModeTag`:

```
FinancePage            create({ ...payload, ...testModeTag })   ✔
OperationalCostsPage   create({ ..., ...testModeTag })          ✔
CatatBiayaPage         create(isi)                              ✘
```

`CatatBiayaPage` tidak menyertakannya sejak halaman itu dibuat.

Yang membuat ini lebih buruk daripada "penandanya lupa dipasang": kolom
`is_test_data` punya **default `false`** di skemanya. Jadi barisnya tidak
tersimpan tanpa penanda — ia tersimpan dengan penanda yang **berbunyi
"bukan data uji"**. `hanyaLaporan()` membacanya sebagai pengeluaran sah,
dan tidak ada jejak apa pun yang bisa dipakai membedakannya di kemudian
hari.

Dan justru halaman inilah yang paling mungkin kena. Ia dibuat supaya
mencatat cukup tiga ketukan — jadi ia yang paling sering ditekan saat
pemilik sedang mencoba-coba aplikasi sebagai peran lain.

**Keadaan data:** 131 baris FinanceTransaction diperiksa. Tidak satu pun
bertanda `is_test_data: true`; yang tertua (17 Mei 2026) tidak punya kolom
itu sama sekali. Artinya Mode Uji belum pernah menyala saat halaman ini
dipakai. **Cacatnya belum terwujud.**

**Perbaikan:** `useTestMode()` dipanggil, `...testModeTag` disertakan.

---

## Bocoran dua — tombol "Kas Kecil" memutus rantai saldo

Pemakaian kas kecil punya **dua sisi**. `PemakaianForm` mengerjakan
keduanya:

1. membuat baris `PettyCashLedger`,
2. membuat `FinanceTransaction` bertipe pengeluaran,
3. menyambungkan keduanya (`finance_tx_id`),
4. memanggil `recalculatePettyCashBalance` supaya saldonya berantai.

Salah satu dari delapan tombol besar di Catat Pengeluaran berlabel **"Kas
Kecil"**, dan halaman itu hanya bisa mengerjakan langkah 2.

Kalau tombol itu ditekan: pengeluarannya muncul di Laporan Keuangan,
tetapi **saldo kas kecil tidak berkurang sepeser pun**. Saldo itulah yang
dipakai memutuskan kapan kas perlu diisi ulang, jadi saldo akan terbaca
lebih besar daripada uang yang benar-benar ada di tangan.

Selisihnya tidak akan muncul di layar mana pun — kedua angka itu dibaca
dari tabel yang berbeda, dan tidak ada satu layar pun yang
membandingkannya.

**Keadaan data:** 58 baris `PettyCashLedger` diperiksa. **Setiap** baris
pemakaian punya `finance_tx_id`-nya. Yang bernilai `null` hanya empat
baris pengisian saldo (Rp 200.000, Rp 239.500, Rp 250.000, Rp 300.000),
yang memang tidak membuat pengeluaran. **Rantainya masih utuh — tombol itu
belum pernah dipakai.**

**Perbaikan:** tombolnya tidak dibuang, tapi diubah jadi tautan ke halaman
Kas Kecil, dengan bentuk dan posisi yang sama persis supaya orang yang
sudah hafal letaknya tidak kehilangannya. Di bawah labelnya ditambahkan
satu baris kecil: "Dicatat di halaman Kas Kecil".

---

## Yang perlu diputuskan pemilik

Tidak ada. Keduanya sudah tertutup dan tidak ada data yang perlu
dibetulkan. Laporan ini ada supaya kalau kelak ada angka kas kecil yang
janggal, jejaknya bisa dibaca dari sini.

## Yang pantas dicurigai lain kali

Pola yang sama muncul dua kali di satu halaman: **satu jaminan dipasang di
sebagian pemanggil saja**. `testModeTag` ada di dua dari tiga penulis;
rantai buku besar kas kecil dikerjakan di satu dari dua jalur masuk.
Keduanya lolos eslint, lolos build, dan lolos mata — karena kode yang
kurang tidak melempar error, ia hanya menghasilkan angka yang lebih enak
dibaca.
