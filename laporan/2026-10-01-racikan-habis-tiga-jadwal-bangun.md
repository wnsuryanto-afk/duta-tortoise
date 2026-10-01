# Racikan habis, tiga jadwal bangun sendiri — satu di antaranya cacat

1 Oktober 2026

## Apa yang terjadi

Stok **RACIKAN Duta Repro (VIT-REP00) = 0 gram.**

Tiga jadwal suplemen dirancang "MUNDUR selama racikan ada stoknya, dan
hidup lagi dengan sendirinya kalau racikan habis". Jadi ketiganya baru
saja hidup kembali, tanpa ada satu pun yang memberi tahu siapa pun:

| Jadwal | Tertulis | Dijalankan | Stok |
|---|---|---|---|
| Kalsium | harian | 7×/minggu ✓ | 30.500 g ✓ |
| Asam folat (betina) | harian | 7×/minggu ✓ | 5 g — **pas di batas minimum** |
| **Vitamin E** | **tiap 2 hari** | **7×/minggu** | **0 g** |

Dibuktikan dengan menjalankan `jadwalBerlaku()` atas bentuk data yang
sungguhan, bukan dibaca dari kode.

## Cacat Vitamin E sudah diketahui — sebulan lalu

Catatan pada jadwal itu sendiri, ditulis 30 Agustus:

> *"PERHATIAN: kolom frekuensi jadwal ini masih tertulis 'harian',
> sehingga tampil setiap hari — tidak cocok dengan judul dan takaran di
> atas yang dihitung untuk 2 hari sekali. Belum diubah karena jadwal ini
> sedang mundur; **perbaiki frekuensinya lebih dulu bila kelak dihidupkan
> lagi tanpa racikan**."*

Syaratnya tiba hari ini. Tidak ada yang memperbaikinya lebih dulu.

**Peringatan itu sebuah KOMENTAR; yang menghidupkannya kembali adalah
KODE.** Catatan yang menunggu dibaca manusia tidak bisa menjaga sesuatu
yang dihidupkan mesin.

Dan Vitamin E oralnya tidak ada sama sekali — VIT-REP01 nol gram, dan
tidak ada item tablet Vitamin E IPI di gudang. Yang ada cuma Vigantol E
injeksi dan minyak topikal, keduanya bukan untuk jadwal ini. Jadi kiper
melihat tugas harian untuk barang yang tidak ada. Catatan Anda sendiri di
jadwal Duta Female Plus sudah menuliskan akibatnya:

> *"Jadwal yang menyala tanpa barang hanya melatih kiper mengabaikan
> daftar tugasnya."*

## Yang dikerjakan

**Jadwal Vitamin E dimatikan** (keputusan Anda), dengan cara menghidupkan
kembali ditulis berurutan di catatannya:

1. Pastikan Vitamin E oralnya benar-benar ada di gudang
2. Ubah `frequency` → `dua_harian`, `frequency_interval_days` → `2`
3. Baru `is_active` → `true`

Menghidupkan tanpa langkah 2 berarti memberi dua kali lipat rancangannya.
Catatan aslinya **dipertahankan utuh** di bawah keterangan baru — seluruh
takaran dan perhitungan 1.072 tablet/minggu masih ada.

Kalsium dan Asam folat **tidak** ikut dimatikan: keduanya memang harian
dan stoknya ada. Tapi **asam folat tinggal 5 gram, pas di batas
minimum** — perlu dibeli.

## Supaya tidak menunggu komentar dibaca

Halaman Treatment & Pengingat sekarang menghitung sendiri jadwal yang
**mengatakan** satu irama tetapi **dijalankan** dengan irama lain, dan
menampilkannya sebagai peringatan di atas tab.

Dipasang di halaman pemilik, bukan layar kiper: kiper tidak bisa mengubah
kolom frekuensi, pemilik bisa.

Hanya satu arah yang dilaporkan — teks menyebut jeda beberapa hari
sementara kolomnya "harian". Sebaliknya tidak dilaporkan: memberi lebih
jarang daripada tertulis tidak menggandakan dosis siapa pun.

## Penjaga

`cek-ronda.mjs` bertambah enam kasus. Yang diuji bukan hanya bahwa
cacatnya tertangkap, tetapi juga bahwa **kalsium dan folat TIDAK
dituduh** — peringatan yang sering salah akan ikut diabaikan, dan itu
mengembalikan keadaan ke awal.

Diuji bisa merah untuk kedua arah: pembacanya dilumpuhkan → Vitamin E
lolos lagi; pembacanya dilonggarkan → kalsium dan folat langsung
tertuduh.

## Catatan

Satu-satunya data yang diubah: `is_active` dan `notes` pada jadwal
Vitamin E, atas keputusan Anda. Takaran, judul, dan seluruh angka aslinya
tidak disentuh.
