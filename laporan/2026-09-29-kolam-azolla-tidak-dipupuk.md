# Kunci panen azolla sudah 11 hari, dan pemupukannya terlewat

**Tanggal:** 29 September 2026. Tidak ada data yang diubah.

---

## Keadaannya

Tugas **"Panen azolla untuk pakan"** dikunci manual pada **18 September 2026**
dengan catatan yang ditulis pemilik sendiri:

> *Stok azolla habis — dikunci manual 18-09-2026 (Iwan). BUKA KEMBALI begitu
> kolam siap panen; selama terkunci tugas ini tidak dihitung sebagai kewajiban
> dan tidak dibayar poin.*

Sebelas hari kemudian kuncinya masih terpasang. Itu wajar kalau kolamnya
memang belum siap — tapi datanya menunjukkan kolam itu tidak sedang dipulihkan.

## Kenapa kolamnya tidak pulih

Ada tiga tugas yang memberi makan kolam. Dua di antaranya terlewat:

| Tugas | Frekuensi | Terakhir dikerjakan | Keterangan |
|---|---|---|---|
| Pupuk kandang (1 karung/kolam) | 2 minggu | **23 Sep** | jalan |
| **Pupuk UREA (200 g/kolam)** | mingguan | **8 Sep — 21 hari** | ±3 kali terlewat |
| **Ganti pupuk asola (tgl 1 & 15)** | tgl 1 & 15 | **belum sekali pun di September** | 2 kali terlewat |

Yang rutin dikerjakan justru yang tidak menambah apa-apa ke kolamnya:

| Tugas | Terakhir |
|---|---|
| Cek ketinggian air Asola | 29, 22, 18, 14, 1 Sep |
| Perawatan kolam (cek air, buang kotoran) | 27, 22, 16, 4 Sep |

Jadi kolamnya diperiksa dan dibersihkan lima sampai empat kali sebulan, tetapi
dipupuk satu kali. Azolla tidak tumbuh dari diperiksa.

## Kenapa ini tidak tertagih

Bukan karena tidak ada yang mengawasi — melainkan karena yang mengawasi
menunjuk arah yang salah.

Kartu **"SOP terhenti"** di beranda memang menampilkan kunci azolla ini sejak
hari pertama. Tetapi tautannya berbunyi **"Gudang →"**, sama untuk semua jenis
kunci. Untuk azolla itu arah yang salah: azolla ditumbuhkan, bukan dibeli, dan
tidak ada apa pun di Gudang yang bisa membuka kunci ini.

Hal yang sama terjadi pada notifikasi otomatisnya — judulnya "SOP terhenti
karena bahan habis" dan tombolnya "Lihat Gudang", bahkan ketika tidak ada satu
pun bahan yang habis dan yang terkunci murni manual.

Keduanya sudah diperbaiki hari ini: kunci manual kini menampilkan umurnya
("Dikunci manual, sudah 11 hari") dan mengarah ke halaman SOP, tempat ia
sebenarnya bisa dibuka.

## Yang perlu diputuskan pemilik

Ini keputusan lapangan, bukan keputusan aplikasi:

1. **Kalau kolamnya memang sedang dipulihkan** — pemupukan UREA dan "Ganti
   pupuk asola" perlu kembali dikerjakan; tanpa itu kuncinya tidak akan pernah
   bisa dibuka.
2. **Kalau azolla sudah tidak diandalkan sebagai pakan** — tugas panennya lebih
   baik di-nonaktifkan daripada dibiarkan terkunci. Tugas yang terkunci tidak
   dihitung sebagai kewajiban, jadi kunci yang dibiarkan membuat angka
   kepatuhan terlihat lebih baik dari kenyataannya. Fungsi `kunciBahanSOP`
   sudah akan melaporkannya sebagai "dikunci manual dan lama tidak ditinjau"
   begitu lewat 14 hari — yaitu 2 Oktober.

Dua tugas pemupukan yang terlewat itu sendiri tidak terkunci dan tidak hilang
dari daftar; keduanya memang tidak dikerjakan.
