# Audit desain & penyederhanaan — apa yang bisa disatukan, apa yang tidak

**29 September 2026.** Permintaan pemilik: lihat desain seluruh halaman, buat
lebih bagus dan tidak kaku; dan tentukan modul mana yang bisa disederhanakan.

Ini pass pertama: yang terbukti rusak diperbaiki, sisanya dipetakan dengan
angka supaya bisa diputuskan.

---

## Bagian 1 — Dua cacat nyata di layar yang dikirim

### "Rp 9.385.201,3" terpotong

Kartu "Total Nilai Stok" mencetak nilainya penuh dengan huruf `text-2xl` di
kolom selebar ±150px. Hasilnya: "Rp" sendirian di satu baris, "9.385.201,3"
terpotong tepi kartu. **Angka terpenting di halaman itu satu-satunya yang tidak
terbaca utuh.**

Diperbaiki bukan dengan mengecilkan huruf, melainkan dengan meringkas nilainya
— **"Rp 9,4 jt"** — dan menaruh angka persisnya di tooltip. Nilai persediaan
sembilan juta tidak perlu disebut sampai satuan rupiah untuk bisa dipakai.

### Tiga angka untuk satu hal: 22, 19, 22

| Tempat | Angka |
|---|---|
| Kartu "Stok Kritis" | 22 |
| Kartu "Item Wajib Habis" | **19** |
| Spanduk "Item Wajib Stok Habis!" | **22** |

Kartu dan spanduk memakai label yang sama dengan angka berbeda. Keduanya
memanggil fungsi `stokHabis` yang sama — yang berbeda daftar barangnya: halaman
menyaring dengan `dilacak`, tab tidak.

Ketiga selisihnya barang pakan yang **dinonaktifkan**: "Labu" (min 1),
"Kaktus / Opuntia" (min 20, wajib), "Rumput Gajah / Sudan" (min 100). Stoknya
nol karena tidak dicatat lagi, bukan karena habis — dan spanduknya menyuruh
**"segera restok"** ketiganya. Sekarang keduanya memakai daftar yang sama.

---

## Bagian 2 — Modul mana yang bisa disederhanakan

### Bisa, dan sudah dikerjakan: kartu angka

Ada **lima** komponen kartu-angka yang ditulis terpisah:

| Komponen | Berkas | Baris |
|---|---|---|
| `StatCard` | pages/UnifiedStokPage.jsx | 14 |
| `StatCard` | pages/UserDetailPage.jsx | 9 |
| `StatBox` | components/breeding/BreedingBatchDetail.jsx | 8 |
| `Stat` | pages/LayarTimPage.jsx | 16 |
| `KpiCard` | components/dashboard/role/OwnerDashboard.jsx | 27 |

Tidak ada satu pun yang salah sendirian. Yang salah: **tidak ada dua yang
sama.** Jarak, ukuran huruf, warna, dan perilaku saat diklik berbeda-beda —
dan itulah yang membuat aplikasinya terasa kaku, seperti tiap layar dibuat
orang berbeda.

Tetapi kelimanya **bukan satu hal**. Ada dua bentuk yang niatnya berbeda:

- **Kartu kepala halaman** — besar, berikon, bersub-keterangan, bisa ditekan.
  → disatukan jadi `components/ui/kartu-angka.jsx`
- **Ubin ringkas di dalam panel** — kecil, rapat, enam-delapan sekaligus, hanya
  dibaca. → disatukan jadi `components/ui/ubin-angka.jsx`

`KpiCard` **tidak** ikut disatukan: ia punya sparkline, tautan, dan petunjuk
sendiri. Memaksanya masuk akan menghasilkan satu komponen dengan delapan
saklar. Dua bentuk yang masing-masing jelas lebih baik daripada satu bentuk
yang bisa jadi apa saja.

Yang ikut terbawa perbaikannya:

- **Warna tidak lagi dikirim pemanggil.** Bentuk lama menerima
  `color="text-red-600"` — tiap pemanggil memilih merah sendiri, dan tak satu
  pun punya pasangan mode gelap. Sekarang pemanggil menyebut **nada**
  (`baik` / `awas` / `bahaya` / `utama`), komponennya yang tahu warnanya di
  kedua tema.
- **Warna yang tidak berarti dibuang.** "Statistik Kinerja" di rincian karyawan
  memakai enam warna berbeda (hijau, biru, lime, amber, ungu, rose) untuk enam
  angka netral. Sekarang netral semua, kecuali yang memang berarti: Task Done
  hijau bila ≥80%, Kasbon kuning bila masih ada tanggungan.
- **Yang bisa diklik terlihat bisa diklik.** Kartu "Item Wajib Habis" dulu
  `<div onClick>` dengan sub-teks *"⚠️ Klik untuk lihat"* — kalimat itu ada
  justru karena kartunya tidak memberi tanda apa pun. Sekarang ia `<button>`
  sungguhan: bisa dijangkau keyboard, terbaca pembaca layar, punya panah dan
  sedikit angkat saat disentuh.

### Bisa, belum dikerjakan

| Temuan | Jumlah | Catatan |
|---|---|---|
| `<div onClick>` yang seharusnya tombol | **31** | tidak bisa keyboard, tidak terbaca pembaca layar |
| Angka besar tanpa penjaga lebar | **50** | `text-2xl/3xl font-bold` tanpa `break-words`/`min-w-0` — sumber "Rp 9.385.201,3" |
| Peringkas rupiah | 1 salinan lokal | sudah diangkat ke `lib/rupiah.js`; `grafik-uang.jsx` masih punya salinannya |

### Sebaiknya TIDAK disederhanakan

- **`PrinterConfigPage` (705 baris).** Berkali-kali saya catat sebagai
  kandidat, dan berkali-kali saya salah. Masalah kejujurannya sudah dibereskan
  sebelumnya; yang tersisa cuma panjang berkasnya. Halaman ini dipakai sekali
  sejak Juli, dan menulis ulang 705 baris demi kerapian adalah risiko tanpa
  imbalan.
- **`KpiCard`** — lihat di atas.
- **1.538 warna tanpa pasangan mode gelap.** Angka ini besar tetapi menyesatkan:
  sebagian besar teks berwarna di atas latar berwarna yang sama-sama dipaku,
  jadi keduanya konsisten. Yang benar-benar menggigit adalah **permukaan
  dipaku + teks token** — dan itu sudah disapu terpisah (bilah nav kiper,
  panel kesehatan, kartu keuangan). Menyisir 1.538 tempat tanpa keluhan nyata
  akan menghabiskan waktu untuk memperbaiki hal yang tidak rusak.

---

## Catatan jujur tentang cara saya bekerja hari ini

Saat memigrasikan `LayarTimPage` saya sempat memakai **regex massal** pada
`value={` di berkas JSX — melanggar aturan yang pemilik sendiri tetapkan.
Akibatnya nyata: `icon={Clock}` tidak ikut berganti nama, dan `tone=` tidak
pernah menjadi `nada=`. React mengabaikan prop asing tanpa error dan lint pun
diam, jadi warnanya hilang diam-diam dan build tetap hijau.

Ketahuan saat membaca diff-nya, bukan dari alat. Berkasnya dikembalikan dan
dikerjakan ulang dengan pencocokan blok utuh. Aturan itu ada karena alasan yang
persis ini.
