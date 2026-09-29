# "50 angka besar bisa terpotong" — diukur, ternyata dua

**Tindak lanjut audit desain 29 September.** Audit itu menyebut sekitar 50
angka besar yang tidak punya `break-words`/`min-w-0` dan karena itu "berisiko
terpotong". Angka itu hasil pencarian pola, bukan hasil pengukuran. Sebelum
mengubah lima puluh berkas, angkanya diukur dulu.

**Tidak ada data yang diubah.**

---

## Cara mengukurnya

Markup tiap kartu disalin apa adanya ke halaman uji, dirender dengan CSS
aplikasi yang sebenarnya, lalu diukur di browser sungguhan pada lima lebar:
**390, 420, 640, 768, 1024 px**. Dua nilai diuji:

| Nilai | Dari mana |
|---|---|
| Rp 9.522.500 | transaksi **nyata** terbesar di data |
| Rp 152.360.000 | angka regangan, untuk melihat batasnya |

Lebar 640px penting dan hampir terlewat: di bawah itu kisi `sm:grid-cols-3`
belum aktif, jadi kartunya selebar layar dan selalu muat. Kartu-kartu itu baru
menyempit **tepat** di 640px. Pengukuran pertama saya hanya memakai 420px dan
karena itu melaporkan semuanya aman — yang benar, tetapi bukan karena alasan
yang benar.

### Alat ukurnya sendiri diuji dulu

Satu kasus **kontrol** ikut diukur: markup kartu "Total Nilai Stok" yang
**lama** — yang memang sudah terbukti pecah di layar dan sudah diperbaiki
sebelumnya. Kalau alat ukurnya benar, kartu itu harus terbaca meluber.

Terbaca meluber, 66px di lebar 390px. Alat ukurnya bergigi.

---

## Hasilnya

Dari **10** kartu yang menampilkan uang dengan huruf besar:

| Kartu | Hasil |
|---|---|
| KepalaFeederDashboard — saldo kas kecil | muat, di semua lebar, bahkan Rp 152 jt |
| PettyCashWidget — saldo | muat |
| SaleWizard — laba bersih | muat |
| OperationalCosts — total bulan ini | muat |
| PettyCashPage — saldo (text-4xl) | muat |
| **MonthlySalary — tiga kartu total** | **meluber di 640px** |
| **PayrollReport — total poin & bonus** | **meluber di 640px** |

Delapan puluh satu sisanya dari daftar audit bukan nilai uang dan tidak berada
di kolom sempit — jumlah kura, jumlah hari, persentase. Angka dua-tiga digit
tidak pernah memenuhi kolomnya.

**Jadi yang diperbaiki dua, bukan lima puluh.** Lima kelas ditambahkan di lima
tempat: `min-w-0` pada kolom di sebelah ikon (tanpa itu kolomnya menolak
menyusut) dan `break-words` pada angkanya. Diukur ulang sesudahnya: keduanya
muat di lima lebar, sementara kasus kontrol tetap meluber — bukti bahwa yang
berubah adalah kartunya, bukan alat ukurnya.

---

## Yang perlu dicatat untuk lain kali

Audit yang mencari pola menghasilkan daftar tersangka, bukan daftar pekerjaan.
Selisihnya di sini 50 berbanding 2 — dan lima puluh perubahan sapuan di berkas
JSX besar justru cara paling pasti memasukkan cacat baru ke layar yang
sebetulnya tidak apa-apa.
