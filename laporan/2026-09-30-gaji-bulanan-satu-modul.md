# Gaji bulanan, dan empat pintu jadi dua

30 September 2026

## Yang Anda minta

Mulai 1 Oktober gaji dihitung bulanan, kasbon tetap mengurangi yang
diterima tanggal 1, poin juga diterima tanggal 1. Dan modul gajinya
disederhanakan — kalau bisa jadi satu saja.

## Yang ternyata sudah ada

Keputusan bulanan itu sudah diambil dan sudah ditulis di kode, 1 September
2026. `hitungGaji.js` membukanya dengan kalimat ini:

> *"ATURAN GAJI YANG BERLAKU (keputusan Iwan, 01-09-2026): 1. Periode
> BULANAN, mulai tanggal 1."*

Slip bulanan sudah berjalan — slip Ahmad Ali untuk September 2026 sudah ada
sebagai draf. Jadi yang tersisa bukan membangun yang bulanan, melainkan
**membereskan yang mingguan.**

## Bahaya yang dibereskan

Berkas yang sama juga memuat peringatannya sendiri:

> *"Slip MINGGUAN adalah sistem lama dan masih hidup berdampingan
> (period_type "weekly", otomatisasi A5 siapkanSlipMingguan). **Selama
> keduanya aktif, satu periode bisa dibayar dua kali.**"*

Layar penerbit memang sudah berhenti menawarkan mingguan sejak D30. Tetapi
fungsi otomatisnya — `siapkanSlipMingguan`, 278 baris, lengkap dengan alur
kerja terjadwal tiap jam — tetap ada berbulan-bulan sesudahnya, tinggal
menunggu satu saklar dinyalakan.

Saklarnya tidak pernah menyala (`siapkan_slip_terakhir` = null), jadi tidak
ada uang yang pernah dibayar dua kali. **Itu keberuntungan, bukan
penjagaan.** Fungsi dan alur kerjanya sekarang dihapus.

Slip mingguan LAMA tetap bisa dibuka dan dicetak. Yang hilang hanya
kemampuan membuat yang baru.

## ⚠️ Gaji bulanan membayar LEBIH BESAR dari spreadsheet Anda

Ini yang paling perlu Anda ketahui sebelum 1 Oktober.

Spreadsheet mingguan Anda menghitung: `hari × 70.000 + jam × 10.000 −
potongan kasbon`. Aplikasi memakai aturan 1 September, yang menambahkan
**dua hal yang tidak pernah ada di spreadsheet**.

Ahmad Ali, September 2026:

| | Aplikasi |
|---|---|
| Upah harian — 28 hari × Rp 70.000 | Rp 1.960.000 |
| **Bonus pekan penuh — 2 × Rp 70.000** | **Rp 140.000** |
| Lembur | Rp 85.000 |
| **Bonus poin — 5.275 × Rp 50** | **Rp 263.750** |
| Potongan kasbon | −Rp 100.000 |
| **Diterima** | **Rp 2.348.750** |

Spreadsheet, empat minggu September: **Rp 1.787.500**.

Selisihnya Rp 561.250, dan **Rp 403.750 di antaranya adalah dua baris tebal
di atas** — poin dan bonus pekan penuh. Sisanya hari 27–30 September yang
belum masuk spreadsheet.

Kalau dua baris itu memang Anda maksud, tidak ada yang perlu diubah. Kalau
tidak, keduanya bisa dimatikan — tetapi itu keputusan Anda, bukan saya.

## Satu angka lagi yang perlu diperiksa

`nilai_per_poin` yang berlaku sekarang **Rp 50**. Komentar aturan di
`hitungGaji.js` menulis **Rp 75**. Kodenya benar, dokumentasinya yang
ketinggalan — tetapi untuk 5.275 poin sebulan selisihnya Rp 131.875 untuk
satu orang. Aturan tertulis dan aturan yang dijalankan berselisih 50% tanpa
ada yang tahu.

Komentarnya sekarang tidak lagi menyebut angka sama sekali: satu-satunya
angka yang benar adalah yang ada di Pengaturan.

## Empat pintu jadi dua

| Sebelum | Peran yang bisa membuka |
|---|---|
| `/payroll-gaji` "Penggajian Karyawan" — 5 tab | owner, admin, manajer |
| `/rekap-poin-gaji` "Gaji" — 4 tab | owner, admin, manajer |
| `/salary-slip` "Slip Gaji" | **+ keeper, kepala_feeder** |
| `/kasbon` "Kasbon" | **+ keeper, kepala_feeder** |

Dua halaman sama-sama bernama "gaji", sembilan tab di antara keduanya. Dan
yang bernama "Penggajian Karyawan" justru **tidak pernah menerbitkan satu
slip pun** — ia hanya menampilkan, dengan baris untuk admin dan manajer
yang tidak akan pernah menerima slip dari aplikasi ini.

**Satu pintu saja tidak mungkin**, dan itu bukan soal selera: dua pintu
terakhir memang dibuka keeper untuk melihat slip dan kasbonnya sendiri.
Meleburnya jadi satu akan mengunci mereka, tanpa satu pun error.

| Sesudah | Isi |
|---|---|
| **Gaji** (pengelola) | Terbitkan · Kasbon · Catatan · Laporan · Pengaturan |
| **Gaji Saya** (semua, termasuk keeper) | Slip Gaji · Kasbon |

Dari sembilan tab jadi lima, urut mengikuti alur sebulan: yang **dicatat**
sepanjang bulan dulu, baru yang **diterbitkan** di akhir, lalu yang
**dibaca**. Tiga laporan jadi satu tab dengan pemilih di dalamnya —
ketiganya dibaca, bukan dikerjakan, dan tujuh tab di layar 360px tidak
terbaca lagi sebagai pilihan.

Di bilah bawah kiper, "Slip Gaji" dan "Kasbon" juga jadi satu: keduanya
menjawab pertanyaan yang sama — *bulan ini saya terima berapa* — dan kasbon
mengurangi slip, jadi membacanya di layar lain berarti kiper menghitung
sendiri di kepala.

Alamat `/payroll-gaji` dan `/kasbon` dibiarkan hidup sebagai pengalihan.
Keduanya sempat jadi pintu menu berbulan-bulan; halaman 404 untuk alamat
yang kemarin masih benar adalah cara tercepat membuat orang berhenti
percaya pada menu.

## Formulir rempesan yang tidak pernah bisa dibuka

`VegetableDialog` sudah lama ada di halaman Penggajian: 77 baris lengkap,
menulis ke `RempesanLog` — sumber yang benar, yang memang dibayar slip.
Tetapi **tidak ada satu pun tombol, state, atau baris JSX yang
merendernya.** Ia didefinisikan lalu tidak pernah dipakai.

Akibatnya pemilik tidak punya cara sama sekali mencatatkan trip atas nama
karyawan. Satu-satunya jalur yang hidup adalah keeper mengisi sendiri lewat
`/rempesan` lalu disetujui — dan `RempesanLog` berisi **nol catatan**.

Komentar di `hitungGaji.js` menyimpulkan *"bukan kode yang salah —
formulirnya tidak diisi"*. Kesimpulan itu keliru: untuk pemilik,
formulirnya **tidak bisa dibuka**. Sekarang dialognya punya tombolnya, di
tab Catatan.

Spreadsheet Anda juga menunjukkan tarif rempesan Rp 30.000 dengan total
Rp 0 tiap minggu — konsisten dengan nol catatan itu.

## Yang diperiksa lalu ternyata bukan cacat

Dicatat supaya tidak "diperbaiki" lain kali:

- **`PoinFlash`** di layar kiper terlihat seperti komponen mati yang
  menyebabkan kiper tidak pernah melihat "+N poin!". Ternyata versi
  inline-nya di baris 949 memang jalan; `PoinFlash` cuma duplikat. Dibuang
  sebagai kode mati, bukan diperbaiki sebagai cacat.
- **Dua `keMenit`** di `src/lib` (upah vs tenggat) hanya berbeda pada
  `"7:5"`. Semua `deadline_time` dan `check_in` di basis data berformat
  `HH:MM`, jadi keduanya sepakat pada data nyata.

## Penjaga ke-20

`scripts/cek-gaji.mjs` menolak dua hal:

1. Kode mana pun yang membuat `period_type: "weekly"` baru, atau
   menghidupkan kembali `siapkanSlipMingguan`.
2. Peran yang digaji aplikasi ini kehilangan pintu ke slipnya sendiri —
   jebakan penggabungan yang sudah pernah terjadi di aplikasi ini.

Sudah diuji bisa merah untuk keduanya.

Sekalian: harness penjaga tata letak diperbaiki. Pengguna ujinya dulu
`null` dan query-nya mati, sehingga setiap layar pengelolaan jatuh ke kartu
"akses ditolak" — penjaga itu selama ini mengukur kartu tersebut, bukan
layar yang sebenarnya. Sekarang ia masuk sebagai owner dengan query hidup,
dan tetap hijau.

## Catatan

Tidak ada data historis yang diubah. Tiga kolom `siapkan_slip_*` sengaja
dibiarkan di skema AutomationSettings — mencabut kolom berarti menghapus
datanya, dan tiga kolom menganggur tidak merugikan siapa pun.
