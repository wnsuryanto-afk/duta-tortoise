# Bonsai hilang lagi — dan kenapa jawaban saya kemarin tidak cukup

1 Oktober 2026

## Yang dilaporkan

Layar kepala feeder menampilkan 14 kandang: W1–W5, E1–E5, **N1, N2, N3**,
L2. Tidak ada Bonsai.

## Kode dan data keduanya benar

Saya jalankan kode hari ini dengan data Enclosure hari ini:

```
16 kandang: W1 W2 W3 W4 W5 N E1 E2 E3 E4 E5 L2 Bonsai 1 Bonsai 2 Bonsai 3 Bonsai 4
Bonsai ikut?  Bonsai 1, Bonsai 2, Bonsai 3, Bonsai 4
L1 (0 kura)?  tidak — benar, kandang kosong
```

Data juga benar: Bonsai 1–4 semuanya `ronda_harian: true`, aktif, berisi
10 + 10 + 8 + 8 = **36 kura**.

## Seberapa tertinggal HP itu

Yang menentukan bukan Bonsai-nya, melainkan **N1, N2, N3**.

Ketiganya digabung jadi satu kandang `N` pada **27 September**. Sejak itu
tidak ada satu pun jalur di kode yang bisa menghasilkan "N1" — tidak di
daftar cadangan, tidak di jalur data.

| | |
|---|---|
| 27 Sep | N1–N3 digabung jadi N |
| 28 Sep | Empat Bonsai masuk ronda |
| 30 Sep | Bilah "ada versi baru" dibuat |
| 1 Okt | HP masih menampilkan N1, N2, N3 |

Bundel di HP itu **lebih tua dari 27 September — minimal lima hari.**
Selama lima hari, 36 kura di empat kandang Bonsai tidak punya satu pun
ubin untuk dicentang: pakan dan kebersihannya tidak punya jalur
pencatatan sama sekali.

## Kenapa jawaban saya kemarin tidak cukup

Kemarin saya menyimpulkan hal yang sama — "kodenya benar, HP-nya
tertinggal" — lalu membuat bilah "ada versi baru". Bilah itu **benar**:
ia meminta halaman awal dengan `cache: "no-store"` dan pembeda query,
jadi ia pasti mendeteksi versi baru.

Tapi bilah hanya bisa jalan di bundel yang **sudah memuat bilah itu**.
HP ini lebih tua daripada bilahnya sendiri, jadi bilahnya tidak pernah
ikut termuat. Memberi tahu lewat kode baru tidak bisa menolong klien yang
tertinggal dari kode baru itu.

Dan tidak ada perubahan **data** yang bisa menolongnya: bundel lama
membaca daftar kandang dari daftar mati di dalam dirinya sendiri, dan
Bonsai tidak pernah ada di sana. Jadi memang HP-nya yang harus
diperbarui — sekali, dengan tangan.

## Yang Anda perlu lakukan sekarang

Di HP kepala feeder:

1. Tutup aplikasinya sepenuhnya (geser keluar dari daftar aplikasi
   terbuka — bukan sekadar tekan tombol kembali).
2. Buka lagi. Kalau masih 14 kandang, muat ulang paksa: Chrome → ⋮ →
   tahan tombol muat ulang, atau Setelan situs → Hapus data untuk alamat
   aplikasi ini.
3. Setelah itu harus muncul **16 kandang**, termasuk Bonsai 1–4.

Lakukan hal yang sama di HP kiper satunya.

## Supaya tidak lima hari lagi

Bilahnya sekarang tidak hanya memberi tahu — **aplikasi memuat ulang
sendiri**, tetapi hanya pada saat yang aman:

| Keadaan | Yang terjadi |
|---|---|
| Baru dibuka, belum disentuh apa pun | **Muat ulang sendiri** |
| Sudah menyentuh sesuatu | Bilah saja |
| Lewat 20 detik sejak dibuka | Bilah saja |
| Sudah pernah otomatis di sesi ini | Bilah saja (anti-putaran) |

Alasan versi pertama menolak memuat ulang sendiri tetap berlaku — kiper
sering sedang di tengah formulir atau menunggu foto terunggah, dan memuat
ulang akan membuang pekerjaan orang yang paling sulit mengulanginya.
Tetapi alasan itu hanya berlaku **di tengah pekerjaan**. Pada detik-detik
pertama sesudah dibuka belum ada apa pun yang bisa hilang, dan justru itu
saat ketertinggalan paling mahal: daftar kerja sehari penuh baru saja
dibaca dari bundel yang usang.

Syarat "sudah pernah di sesi ini" adalah penjaga putaran: kalau bundel
barunya rusak dan ikut menganggap dirinya usang, aplikasi tidak boleh
memuat ulang tanpa henti di tangan orang yang sedang bekerja.

## Penjaga ke-21

`scripts/cek-ronda.mjs` menjaga dua hal:

1. **Setiap kandang bertanda ronda yang berisi kura punya ubinnya**, dan
   kandang kosong tidak dituntut. Diuji dengan bentuk data Enclosure yang
   sungguhan. Termasuk pemeriksaan khusus bahwa jalur `ronda_harian`
   benar-benar yang dipakai — kalau diam-diam jatuh ke daftar mati,
   Bonsai hilang lagi tanpa satu pun error.
2. **Ketiga syarat muat ulang otomatis.**

Keputusan muat ulang diangkat jadi satu fungsi murni
(`bolehMuatUlangOtomatis`) di `versiAplikasi.js`. Versi pertama
pengujian saya menulis ulang aturannya sendiri di dalam halaman uji —
yang berarti yang diuji pemahaman saya, bukan kodenya. Itu persis
jebakan "dua salinan" yang dibereskan di sepanjang pekerjaan ini, jadi
tidak jadi dipakai.

Ketiga bentuk cacat sudah diuji bisa merah: jalur data dimatikan →
delapan temuan Bonsai; kandang kosong ikut dituntut → L1 tertangkap;
pemeriksaan sentuhan dicabut → syarat kedua tertangkap.

## Catatan

Tidak ada data yang diubah. Data Enclosure sudah benar sejak 28
September.
