# Empat pekerjaan masuk checklist, dan 210 catatan dibayarkan surut

**7 Oktober 2026**

Pemilik: *"Masukkan keempatnya ke checklist, dan bayarkan surut yang 210."*

---

## 1. Empat tugas sudah masuk checklist

| Tugas | Jadwal | Poin | Dulu dicatat sebagai Inisiatif |
|---|---|---|---|
| Cari rumput untuk pakan | Senin–Sabtu | 5 | 82× dalam 57 hari |
| Pakan adabra (Aldabra) — pagi | tiap hari | 5 | 61× dalam 61 hari |
| Bersihkan tempat cuci rumput | Rabu & Sabtu | 5 | 30× dalam 30 hari |
| Bersihkan tempat tamu | Selasa & Jumat | 5 | 29× dalam 28 hari |

**Jadwalnya diambil dari data, bukan dikira-kira.** "Cari rumput" tercatat pada
57 hari berbeda dan **tidak satu pun hari Minggu** — jadi Senin–Sabtu, sama
seperti "Kebersihan lingkungan & jalan". "Pakan adabra" tercatat 61 kali pada
61 hari berbeda, termasuk Minggu — jadi benar-benar harian. Dua yang terakhir
sekitar dua kali seminggu; harinya dipisah (Rabu/Sabtu dan Selasa/Jumat) supaya
tidak menumpuk pada hari yang sama.

**Poinnya 5, sama untuk keempatnya.** Itu tarif yang sistem ini sendiri
bayarkan untuk setiap Inisiatif sampai 27 Juli. Menaikkannya sekarang berarti
menambah upah dengan angka yang saya karang; kalau menurut Anda "Cari rumput"
pantas lebih (pekerjaannya memang paling lama), naikkan di menu SOP — satu
kolom, langsung berlaku.

**Satu hal yang perlu Anda ketahui soal Aldabra:** sebelum ini ia hanya
disebut di dalam *keterangan* tugas "Cuci rumput/sayuran rempesan" sebagai
urutan pembagian ketiga — "(1) iguana, (2) sulcata & baby, (3) Aldabra".
Iguana punya tugasnya sendiri sejak lama ("Beri makan iguana (pagi)", harian,
5 poin). Aldabra tidak. Sekarang punya.

### Yang terjadi pada beban harian

Anda pernah menetapkan batas ~11 tugas/hari. Setelah keempatnya masuk:

| Hari | Baris checklist | dari keempat yang baru |
|---|---|---|
| Minggu | 11 | 1 |
| Senin | 16 | 2 |
| Selasa | 15 | 3 |
| Rabu | 16 | 3 |
| Kamis | 15 | 2 |
| Jumat | 16 | 3 |
| Sabtu | 16 | 3 |

(Di luar itu ada 1–2 tugas yang dikerjakan lewat ubin kandang, bukan sebagai
baris tersendiri.)

Jadi 15–16 baris Senin–Sabtu, bukan 11. **Tetapi pekerjaannya tidak bertambah
sedikit pun** — keempatnya sudah dikerjakan hampir setiap hari selama tiga
bulan; yang berubah hanya bahwa sekarang ada barisnya dan ada poinnya. Yang
bertambah adalah panjang daftar di layar.

### Sembilan tugas yang tidak pernah dikerjakan dalam 15 hari terakhir

Pilihan yang Anda ambil menyebut "hapus tugas lain yang sudah tidak
dikerjakan". Saya mengukurnya (22 Sep – 6 Okt, 348 centangan nyata), dan
sembilan tugas aktif **nol kali dikerjakan padahal harinya datang**:

| Tugas | Jadwal | Kesempatan terlewat |
|---|---|---|
| Panen azolla untuk pakan | Senin & Kamis | 4 |
| Pembersihan kaktus DT2 | Senin & Kamis | 4 |
| Cek cuttlebone/blok kalsium kandang betina | Minggu | 2 |
| Catat pengambilan bahan dari gudang | Sabtu | 2 |
| Periksa & catat kematian minggu ini | Sabtu | 2 |
| Perawatan kebun kaktus | Rabu | 2 |
| Pupuk UREA kolam azolla | Senin | 2 |
| Pupuk pohon buah | tgl 1 | 1 |
| Ganti pupuk asola | tgl 1 & 15 | 1 |

**Saya tidak menonaktifkan satu pun.** Tidak dikerjakan bisa berarti dua hal
yang berlawanan: pekerjaannya memang sudah tidak perlu, atau pekerjaannya
terabaikan. Yang bisa membedakannya Anda, bukan saya — dan dua di antaranya
jelas bukan kandidat hapus: "Periksa & catat kematian" adalah tugas pencatatan,
dan "Cek cuttlebone" menyangkut kalsium induk betina yang sedang bertelur.

Sebutkan mana yang mau dimatikan, saya matikan.

## 2. Pembayaran surut: 210 catatan

Mekanismenya tidak bisa saya jalankan dari sini — perubahannya menyentuh
`completed_tasks` baris per baris, dan alat yang saya punya hanya bisa menulis
seluruh catatan sekaligus. Jadi dibuat seperti migrasi-migrasi lain di aplikasi
ini: satu fungsi backend, satu tombol di **Pengaturan Sistem**, dua langkah.

> **Bayar poin Inisiatif surut**
> [ Lihat dulu (tidak menulis) ]  [ Bayarkan sekarang ]

Tombol kedua **mati** sampai Anda menekan yang pertama. "Lihat dulu"
menjalankan seluruh hitungannya tanpa menulis apa pun dan menampilkan:

- berapa catatan dibayar, dan berapa poin per orang per bulan (plus
  perkiraan rupiahnya);
- mana yang dinilai nol dan kenapa;
- berapa checklist yang diperbarui, dan berapa di antaranya yang sudah
  disetujui sehingga angka bayarnya dinaikkan.

Baru setelah angka itu Anda lihat, "Bayarkan sekarang" hidup.

### Aturan yang dipakai, dan alasan tiap-tiapnya

**Tarifnya 5 poin, bukan penilaian baru.** Itu persis yang dibayarkan sistem
ini sampai 27 Juli. Menilai 210 catatan dengan angka baru berarti mengarang
210 keputusan yang tidak pernah diambil siapa pun; memulihkan tarif yang dulu
berlaku tidak mengarang apa pun. Siapa pun tetap bisa menaikkan catatan mana
pun lewat layar Inisiatif, yang sekarang berfungsi.

**Batas harian tetap berlaku.** 30 poin per orang per hari. Catatan terbanyak
dalam satu hari adalah 6 → tepat 30 poin, jadi tidak ada yang terpotong; tetapi
aturannya tetap dijalankan, bukan diasumsikan.

**Pekerjaan yang sudah dibayar lewat checklist tidak dibayar dua kali.**
Ujinya exact, bukan tebakan kemiripan: bila checklist hari itu sudah punya
baris LAIN dengan judul sama persis dan poinnya di atas nol, catatan
Inisiatifnya dinilai nol dengan alasan tertulis. Untuk uang, "mirip" bukan
bukti.

**Satu judul dua kali sehari dijumlahkan.** Di checklist keduanya mengenai satu
baris, karena `onMaintenanceDone` menyatukan baris berjudul sama. Menulis poin
satu catatan saja berarti yang kedua hilang.

**`approved_points` dinaikkan pada checklist yang sudah disetujui** — dan hanya
karena Anda memerintahkannya. Itu angka yang sudah dibayar; menaikkannya adalah
pembayaran surut, bukan pembetulan catatan. Kenaikannya dilaporkan per orang
per bulan supaya bisa dicocokkan dengan slip.

**Aman dijalankan dua kali.** Saringannya `approval_status: "pending"`, jadi
yang sudah dibayar tidak terambil lagi.

### Satu hal yang harus Anda lakukan sesudahnya

Slip gaji menyimpan angka poinnya sendiri, bukan menghitung ulang setiap kali
dibuka. Yang terkena:

| Periode | Status slip | Yang perlu dilakukan |
|---|---|---|
| September | **draft** (5.192 dan 5.275 poin) | buka slipnya, tekan Update |
| Agustus | dibatalkan | belum ada slip berlaku — buat baru bila mau dibayarkan |
| Juli (28–31) | slip mingguan, dibatalkan | sama seperti Agustus |
| Oktober | belum ada | akan ikut saat slipnya dibuat |

Layar tombolnya mengingatkan hal ini sesudah selesai.

## 3. Penjaga: hitungan uang yang hanya berjalan sekali

Fungsi ini dijalankan **sekali** untuk 210 catatan dua orang. Sekali jalan
berarti tidak ada kesempatan kedua untuk memperhatikan bahwa angkanya keliru —
slip sudah dicetak, orang sudah dibayar, dan yang tersisa hanya menelusuri ke
belakang.

Karena itu seluruh keputusannya dipindahkan ke `base44/shared/bayarSurut.ts` —
tanpa jaringan, tanpa basis data — dan diuji dengan **sepuluh bentuk hari**
yang benar-benar ada di data peternakan ini:

| Bentuk hari | Yang diuji |
|---|---|
| dua Inisiatif biasa | keduanya 5 poin, total barisnya benar |
| judul sama sudah berpoin di baris SOP | nol, dengan sebab `sudah-dibayar` |
| judul sama tapi baris SOP belum berpoin | tetap dibayar |
| satu judul dua kali sehari | barisnya dapat **jumlahnya** |
| enam Inisiatif sehari | 30 poin, tepat di batas |
| tujuh Inisiatif sehari | yang ketujuh `kuota-habis` |
| kuota sudah terpakai 28 | yang berikutnya terpotong jadi 2 |
| barisnya tidak ada di checklist | dilaporkan, poinnya tetap diputuskan |
| checklist kosong | tidak melempar |
| tidak ada catatan | tidak ada yang berubah |

Diuji-merah empat kali: batas kuota dihapus → kasus "terpakai 28" merah; uji
dobel-bayar dimatikan → kasus "Siram tanaman" merah; penjumlahan per judul
dihapus → kasus "dua kali sehari" merah; dan salinan daftar dihapus → kasus
mutasi merah.

**Yang keempat itu sempat tidak merah, dan itu cacat pada penjaganya sendiri.**
Pemeriksaan "daftar aslinya tidak boleh berubah" mengambil potret daftarnya
**sesudah** fungsinya dipanggil sekali. Kalau pemanggilan pertama sudah
merusak, potretnya memuat kerusakan itu dan pemanggilan kedua tidak mengubah
apa pun lagi — hijau. Potretnya sekarang diambil sebelum fungsi apa pun
dipanggil. Pemeriksaan yang mengukur sesudah kerusakan tidak mengukur apa pun.

Ditambah: `tugasMirip` diuji dengan keempat judul tugas baru terhadap seluruh
judul lama — supaya variasi tulisan kiper ("Kasik pakan adabra", "Cari pakan")
tetap dikenali sebagai tugas checklist, dan supaya tidak ada tugas baru yang
bertabrakan dengan tugas lama.

---

**Pemeriksaan akhir:** 27 penjaga lolos, eslint 0 error / 101 peringatan,
`npx vite build` selesai tanpa galat.

## Langkah Anda

1. **Publish** aplikasinya, supaya fungsi dan tombolnya terpasang.
2. Buka **Pengaturan Sistem** → kartu "Bayar poin Inisiatif surut" → **Lihat
   dulu**. Periksa angkanya.
3. **Bayarkan sekarang**.
4. Buka slip **September** keduanya, tekan **Update**.
5. Sebutkan mana dari sembilan tugas di bagian 1 yang mau dimatikan.
