# Empat kura yang masih memegang kandang setelah keluar

Dicatat 27 September 2026, sebelum kolom `enclosure` dikosongkan.

## Keadaan sebelum

| Kode | Status | Kandang | enclosure_id | Tanggal mati | Status sebelumnya |
|---|---|---|---|---|---|
| HF5  | mati    | E1 | (kosong) | 2026-08-12 | aktif |
| F14  | mati    | E1 | (tidak ada) | 2026-06-26 | (tidak ada) |
| B119 | mati    | E5 | (kosong) | 2026-06-24 | aktif |
| B18  | terjual | W1 | (kosong) | — | (tidak ada) |

Tidak satu pun diarsipkan (`is_archived: false`), dan tidak satu pun
tercatat sakit.

## Kenapa ini terjadi

Alur PENJUALAN (`SaleForm`, `SaleWizard`) sudah mengosongkan kandang sejak
lama. Alur KEMATIAN (`DeathRecordsPage`) tidak pernah melakukannya. Itu
sebabnya ketiga kura mati masih memegang kandangnya; B18 kemungkinan dijual
lewat jalur lama sebelum pengosongan itu ada.

`lib/kandang.js` sudah menyediakan `kosongkanKandang()` justru untuk keperluan
ini — dan tidak ada satu pun pemanggilnya.

## Akibatnya

Hitungan isi kandang TIDAK terpengaruh: `hitungIsiKandang` memakai definisi
populasi yang membuang mati/terjual.

Yang terpengaruh adalah daftar pilihan kandang di empat layar yang menyusunnya
dari data kura. Nama kandang yang ditinggalkan kura mati ikut terbawa ke sana.
Ketiga kandang ini (E1, E5, W1) masih aktif, jadi belum ada yang terlihat
salah — tetapi mekanismenya sama persis dengan yang dulu membuat "N1" bertahan
di dropdown berhari-hari sesudah N1-N3 digabung menjadi N.

## Yang dikerjakan

1. `DeathRecordsPage` kini ikut memanggil `kosongkanKandang()`.
2. Dua alur penjualan memakai pustaka yang sama, bukan tulisan harfiah
   `enclosure: "", enclosure_id: ""`.
3. `TortoiseForm` tidak lagi mewajibkan kandang untuk kura berstatus mati,
   terjual atau diarsipkan — sebelumnya formulir menolak menyimpan data yang
   justru sudah benar.
4. Keempat baris di atas dikosongkan kolom `enclosure` dan `enclosure_id`-nya.

Status, tanggal kematian, dan seluruh riwayat lain TIDAK disentuh.
