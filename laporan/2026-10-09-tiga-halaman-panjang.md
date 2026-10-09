# Tiga halaman panjang, tiga sebab berbeda

**9 Oktober 2026** · lanjutan dari *Dipotret lalu dipangkas*

---

## Hasilnya

| Halaman | Sebelum | Sesudah | |
|---|---|---|---|
| Pengaturan WhatsApp | 2.945 huruf · 4,3 layar | **1.061 · 2,1 layar** | −64% |
| Panduan Pakan | 3.382 huruf · 3,5 layar | **1.255 · 1,5 layar** | −63% |
| Pemeliharaan Sistem | 4.153 huruf · 5,0 layar | **3.141 · 4,0 layar** | −24% |

**Tidak satu kalimat pun dihapus dari ketiganya.** Yang berubah: apa yang
terlihat lebih dulu.

## Ketiganya panjang karena alasan yang berbeda

Itu yang saya periksa sebelum memotong, dan itu yang menentukan perlakuannya.

### Pemeliharaan Sistem — kartu yang berteriak "nol"

Enam alat perawatan data, dan semuanya menggambar kartu **penuh** — judul,
keterangan, kotak status, tombol — bahkan ketika tidak ada satu pun pekerjaan
di dalamnya. Padahal "tidak ada yang perlu dikerjakan" adalah keadaan **normal**
halaman ini: alat-alat itu dijalankan sekali lalu diam berbulan-bulan.

Jadi lima layar itu hampir seluruhnya kartu yang berkata "nol", dan yang satu
benar-benar perlu dikerjakan tenggelam di antaranya.

Empat dari enam kartu ternyata menyalin kulit yang **sama persis**. Kulit itu
sekarang satu komponen, `KartuPemeliharaan`, dengan satu kemampuan baru:
**ketika beres, ia satu baris** — tanda centang, nama alatnya, dan angkanya.

> ✓ Sambungkan kura ke nomor kandang
>   0/0 kura tersambung ke nomor kandang            ⌄

**Ditutup, bukan dihapus.** Kartu yang hilang sama sekali membuat orang mencari
alat yang ia tahu pernah ada di situ; kartu yang menyusut tetap mengatakan "aku
ada, dan tidak ada yang perlu kaukerjakan". Dan **yang belum beres tidak pernah
ditutup** — menyembunyikan pekerjaan di balik satu ketukan adalah cara membuatnya
tidak dikerjakan.

Sisanya kartu pengaturan yang memang perlu terbuka (Mode Uji, Target & Poin),
jadi −24% adalah batas yang jujur untuk halaman ini. Ditambah kartu **"Bayar
poin Inisiatif surut"** milik saya sendiri, yang memakai dua paragraf untuk
menceritakan riwayat cacatnya. Riwayatnya pindah ke laporan; di layar tinggal
apa yang dibayar, berapa, dan rentang mana.

### Panduan Pakan — tulisannya ADALAH isinya

Halaman ini berbeda dari dua lainnya, dan itu perlu dikatakan terus terang:
daftar rumput yang boleh diberikan **tidak bisa dipendekkan tanpa menghapus
jawabannya**. Memangkas kata di sini merusak halamannya.

Jadi yang diperbaiki bukan panjangnya, melainkan **cara mencapainya**. Lima
bagian sekarang bisa ditutup, dan halaman terbuka sebagai daftar isi lima baris:

> 🌿 **Makanan Utama** — Wajib Setiap Hari · 9 butir
> 🥦 **Sayuran Tambahan** — 2–3x Seminggu · 7 butir
> 💊 **Suplemen Wajib** — Rutin & Teratur · 5 butir
> 🚫 **MAKANAN DILARANG** — 10 butir  ← terbuka

Orang yang bertanya "boleh tidak kasih kangkung" membuka satu bagian, bukan
menggulung tiga setengah layar.

**Satu bagian tetap terbuka: MAKANAN DILARANG.** Di bagian lain, tidak melihat
isinya berarti harus membuka satu ketukan lagi; di bagian itu, tidak melihat
isinya berarti kura memakan sesuatu yang membahayakannya. Keduanya tidak setara,
jadi tidak diperlakukan sama.

### Pengaturan WhatsApp — satu kartu memakan 40% halaman

Saya ukur per bagian sebelum menyentuhnya:

| | Tinggi |
|---|---|
| **Ringkasan Harian** | **1.459px** — 40% seluruh halaman |
| Jenis Notifikasi | 804px |
| **Ringkasan Pagi** | 708px |
| Nomor per Role | 309px |
| Token Fonnte | 248px |

Dua kartu ringkasan itu bersama-sama lebih tinggi daripada seluruh sisa halaman.
Keduanya pengaturan yang disetel **sekali** lalu jarang disentuh lagi, sementara
token dan nomor di atasnya justru yang sering dibuka.

Keduanya sekarang tertutup, dan barisnya menyebut keadaannya hidup-hidup:
*"menyala · 16:30 WIB · mingguan Sabtu"*, atau *"mati"*. Satu ketukan membukanya.

Sisanya — label field, nama notifikasi, siapa penerimanya — memang perlu ada.
Halaman ini formulir; tulisannya menanggung beban.

## Yang ditemukan sambil mengerjakannya

**Menutup bagian berarti menyembunyikannya dari penjaga.** Yang tidak tergambar
tidak diukur — jadi memasang penutup pada sebuah bagian akan membuat seluruh
tulisan di dalamnya lolos pemeriksaan lebar tanpa pernah dilihat. Itu persis
pola yang sudah menggigit berkas penjaga itu sekali, waktu 110 kasus dilaporkan
bersih tanpa pernah digambar.

`cek-lebar` sekarang **membuka dulu semua bagian yang tertutup** sebelum
mengukur — tiga putaran, karena bagian bisa bersarang. Hanya
`button[aria-expanded="false"]`: atribut itu menandai pembuka bagian, bukan
tombol yang mengirim atau menghapus sesuatu.

**Dan langkah itu langsung menemukan dua cacat nyata di bagian yang baru saya
tutup** — judul kartunya terpotong di wadah 320px. Yang pertama salah saya:
`truncate` pada nama alat, padahal baris itu satu-satunya yang memberi tahu alat
apa ini. Yang kedua lebih dalam:

> `md:grid-cols-2` membaca lebar **LAYAR**, bukan lebar wadahnya.

Di dalam kolom 320px pada layar 1280px, Panduan Pakan tetap membuat dua kolom
selebar ~150px — dan judul sependek "Jadwal & Porsi" pun terpotong. Diganti
`kisiWadah(300)`, yang membaca ruang yang benar-benar ada. Itu cacat yang sudah
ada sebelum hari ini; penutup barunya hanya membuatnya terlihat.

---

**Pemeriksaan akhir:** 27 penjaga lolos, eslint 0 error / 101 peringatan,
`npx vite build` selesai tanpa galat.

## Yang masih menunggu Anda

1. Publish.
2. **Bayar poin Inisiatif surut** — 210 catatan, 28 Juli – 6 Oktober; lalu
   **Update** kedua slip September.
3. Minggu ini: **C22** dan **A47** — siapkan sarangnya.
4. Periksa **C24** dan **C14**, indukan terbukti yang berhenti 6–7 bulan.
5. Pindahkan satu jantan dewasa ke **E1** (usul: B10).
6. Sembilan tugas mati mana yang dihapus, dan dua transaksi ganda 4 Oktober.
