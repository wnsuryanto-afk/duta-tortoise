# "1 menunggu" yang tidak bisa dimatikan siapa pun

**9 Oktober 2026**

Pemilik mengirim satu layar: Approval Poin Checklist, lencana **1 menunggu**,
dan barisnya adalah checklist miliknya sendiri tertanggal 5 Oktober —
"Kalibrasi sendok takar Duta Repro", 5 poin. Di bawahnya tertulis:

> *Checklist milik sendiri harus disetujui orang lain.*

Jadi barisnya ada, tidak bisa disetujui, tidak bisa ditolak, dan tidak bisa
dihilangkan. Lencananya menyala terus.

---

## 1. Satu centang, dua catatan, dua jawaban berbeda

5 Oktober 2026 pukul 19.30 Anda mencentang satu tugas di layar kiper. Dari satu
centang itu lahir **dua** catatan:

| Catatan | `is_test_data` | `excluded_from_reports` |
|---|---|---|
| MaintenanceLog `6ac39874…` | **true** ✓ | **true** ✓ |
| DailyChecklist `6ac39885…` | **false** ✗ | **false** ✗ |

Yang pertama benar. Layar kiper sudah tahu aturannya sejak 20 September:
checklist milik pemilik selalu data uji — Anda memakai layar itu untuk mencoba
aplikasinya, bukan untuk bekerja di kandang.

Yang kedua dibuat **dari catatan pertama itu**, oleh fungsi `onMaintenanceDone`
di belakang layar, dan membuang tandanya di tengah jalan. Buktinya ada di
catatannya sendiri: pembuatnya tercatat sebagai `service+…@no-reply.base44.com`
— bukan Anda, melainkan fungsi backend.

**Dan yang tanpa tanda itulah yang dipakai.** MaintenanceLog hanya catatan
pekerjaan; DailyChecklist yang masuk KPI, slip gaji, hitungan milestone poin,
dan antrean persetujuan.

## 2. Kenapa ia tersangkut, bukan sekadar salah

Dua aturan yang masing-masing benar bertemu dan saling mengunci:

1. **Checklist milik sendiri harus disetujui orang lain.** Aturan ini ada
   sejak 20 September dengan alasan yang masih berlaku: tanpa itu, kepala
   feeder yang mengisi checklist sendiri bisa langsung menilai pekerjaannya
   sendiri.
2. **Checklist itu milik Anda** — dan Anda satu-satunya yang membuka layar
   persetujuan.

Jadi barisnya duduk di antrean sampai orang lain yang berhak membukanya. Secara
teknis ada tiga orang yang bisa: Deny dan Diana (owner), dan Hanif (manajer,
sejak 5 September). Tetapi meminta salah satu dari mereka masuk hanya untuk
menyetujui percobaan Anda sendiri adalah jalan memutar untuk catatan yang
sebenarnya tidak boleh ada di sana sejak awal.

## 3. Yang lebih besar: empat pintu, empat jawaban

Pertanyaan "checklist ini data uji atau bukan" ternyata dijawab **empat kali di
empat tempat**, dan tidak ada dua yang sama:

| Pintu pembuat checklist | Yang diperiksanya |
|---|---|
| `TugasHariIni` (layar kiper) | Mode Uji **dan** aturan akun pemilik ✓ |
| `GuidedHariIni` (alur terpandu) | Mode Uji saja — aturan akun hilang |
| `claimIncidentalTask` (tugas dari owner) | tidak sama sekali |
| `onMaintenanceDone` (backend) | tidak sama sekali |

Pintu mana yang dipakai ditentukan oleh **tombol mana yang ditekan**, bukan oleh
kenyataan pekerjaannya. Jadi kenyataan sebuah catatan ditentukan oleh tombol.

Itu juga berarti cacat ini bukan kejadian sekali. Ia akan terulang setiap kali
Anda mencoba aplikasi lewat salah satu dari tiga pintu yang bocor.

### Dan satu hal lagi yang ikut ketahuan

Fungsi yang sama menghitung **milestone poin** ("300 Poin", "500 Poin", …) dari
seluruh checklist bulan itu **tanpa menyaring data uji**. Percobaan Anda ikut
mendorong angkanya, dan notifikasi selamat bisa terkirim untuk pekerjaan yang
tidak ada. Itu ikut dibetulkan.

## 4. Yang diubah

**Satu aturan, dipakai keempat pintu** — `lib/laporan.js`:

- `tandaLaporan(sumber)` — catatan turunan mewarisi kenyataan catatan
  sumbernya. Dipakai `onMaintenanceDone` saat membuat checklist dari log.
  Tidak ada keputusan baru di situ; yang ada hanya penolakan untuk melupakan
  keputusan yang sudah diambil di hulu.
- `tandaChecklistBaru({ email, modeUji })` — Mode Uji **atau** akun pemilik.
  Dipakai ketiga pintu frontend. Aturan akun yang dulu hanya ada di
  `TugasHariIni` sekarang berlaku di semuanya.

Pewarisannya **hanya saat membuat**. Checklist yang sudah ada tidak diubah
tandanya oleh log yang datang kemudian: menghapus tanda "data uji" dari catatan
yang sudah bertanda berarti menjadikannya uang sungguhan, dan itu keputusan
Anda, bukan akibat sampingan sebuah centang.

**Lima layar menyaring data uji** — layar persetujuan dan empat tempat yang
memajang lencana "menunggu" (Alur Gaji, beranda pemilik, Ringkasan Pagi,
Keputusan Hari Ini). Satu baris tersangkut selama ini menyalakan **empat**
lencana sekaligus.

Di layar persetujuan, yang disembunyikan tetap **ditulis jumlahnya** di bawah
tombol saringan — "1 checklist data uji disembunyikan". Menghilangkan baris
tanpa jejak membuat orang mencari sesuatu yang tidak akan ia temukan.

**Ringkasan Beban Periode Berjalan juga ikut bersih.** Di layar yang Anda
kirim, ringkasan itu memajang *Iwan Suryanto — 1 task · 5 poin · 100%*: beban
kerja tim peternakan ini, menurut layarnya sendiri, seluruhnya milik Anda.

**Catatan 5 Oktober itu sendiri sudah saya tandai** data uji — menjalankan
aturan yang Anda tetapkan sendiri untuk akun Anda. Antreannya sekarang kosong.
Kalau ternyata Anda memang ingin pekerjaan itu dihitung, batalkan dengan
membalik dua kolomnya; sebutkan saja.

## 5. Penjaga

**`cek-ronda` — 15 bentuk catatan.** Tujuh untuk pewarisan tanda (sumber data
uji, sumber dikecualikan manual, keduanya, sumber bersih, sumber tanpa kolom,
sumber kosong, dan kolom berisi string `"false"`), delapan untuk aturan
checklist baru (pemilik dengan Mode Uji mati, pemilik dengan huruf besar dan
spasi, kiper dengan Mode Uji hidup, kiper biasa, kepala feeder, pemilik lain,
tanpa email, tanpa argumen). Setiap hasil juga diuji balik lewat `masukLaporan`,
supaya tanda dan saringan tidak bisa berbeda pendapat.

Diuji-merah empat kali: aturan akun dihapus → dua kasus pemilik merah; hanya
separuh penanda dipasang → "separuh penanda" merah (separuh tanda lebih
berbahaya daripada tanpa tanda, karena layar yang memeriksa penanda yang lain
tetap menghitungnya sebagai pekerjaan sungguhan); `=== true` dilonggarkan jadi
`!!nilai` → kasus string `"false"` merah; email tidak dinormalkan → kasus huruf
besar merah.

**`cek-tataletak` — pintunya dicari, tidak didaftar.** Penjaga ini menyisir
seluruh `src/` dan `base44/` untuk setiap `DailyChecklist.create` dan menuntut
tiap berkas memanggil salah satu fungsi tadi. Daftar tulisan tangan akan tetap
hijau pada hari seseorang menambah pintu kelima — dan hari itulah penjaganya
paling dibutuhkan.

Diuji-merah tiga kali, satu per pintu, plus hulunya (`TugasHariIni`, yang tidak
membuat checklist melainkan log yang diturunkan menjadi checklist).

### Penjaga yang hijau padahal cacatnya ada

Pemeriksaan "layar ini menyaring data uji" versi pertama mencari kata
`hanyaLaporan` **di seluruh berkas**. Diuji-merah dengan membuang saringan dari
kuerinya di `RingkasanPagi` — dan ia **tetap hijau**: berkas itu memakai
`masukLaporan` untuk keperluan lain beberapa puluh baris di bawahnya, jadi
syaratnya terpenuhi oleh baris yang sama sekali tidak ada hubungannya.

Sekarang yang diperiksa **tempat pemanggilannya**: tiap kueri checklist
"menunggu" harus disaring di sana juga. Ditambah satu pemeriksaan atas
pemeriksaannya sendiri — kalau bentuk kuerinya berubah sehingga pencariannya
tidak lagi menemukan kelimanya, penjaganya berbunyi bahwa ia **sudah buta**,
bukan diam-diam melaporkan bersih. Ketiganya diuji-merah.

---

**Pemeriksaan akhir:** 27 penjaga lolos, eslint 0 error / 101 peringatan,
`npx vite build` selesai tanpa galat.

## Yang masih menunggu Anda

1. **Publish**, lalu Pengaturan Sistem → "Bayar poin Inisiatif surut" →
   *Lihat dulu* (pastikan tertulis **210 catatan, 2026-07-28 sampai
   2026-10-06**) → *Bayarkan sekarang* → tekan **Update** pada kedua slip
   September.
2. Nilai catatan Inisiatif 7–9 Oktober di layar Inisiatif; peringatan "mirip
   tugas checklist" akan muncul pada yang sudah punya barisnya.
3. Sembilan tugas yang tidak pernah dikerjakan — mana yang mau dimatikan?
4. Dua transaksi ganda 4 Oktober masih perlu Anda hapus lewat `/catat-biaya`.

### Dua hal kecil yang saya temukan tapi tidak ubah

- **Lima checklist milik Deny** (`dverdinand@gmail.com`, 22 Mei – 2 Juni) dan
  **satu milik Hanif** (10 September) tidak bertanda data uji. Aturan yang Anda
  tetapkan menyebut akun Anda saja, dan keenamnya sudah disetujui dan selesai —
  jadi saya biarkan. Kalau punya Deny juga percobaan, sebutkan, saya tandai.
- Komentar di `persetujuanPoin.js` masih menulis "tidak ada satu pun user
  berperan manajer". Sejak 5 September ada satu (Hanif). Kalimatnya saya
  perbarui — komentar yang salah menyesatkan orang berikutnya yang membacanya.
