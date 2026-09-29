# Jumlah kandang: angkanya benar, cara menghitungnya yang rapuh

**Pertanyaan pemilik, 29 September 2026:** cek jumlah kandang — ada beberapa
kandang yang dihapus, dan kandang itu "tidak terkoneksi ke jumlahnya". N1, N2
dan N3 sudah tidak ada, diganti kandang N.

**Tidak ada data yang diubah.**

---

## Yang diperiksa lebih dulu: apakah angkanya salah?

Tidak. Semuanya cocok.

| Yang diperiksa | Hasil |
|---|---|
| Record Enclosure | **20**, semuanya `is_active: true` |
| N1 / N2 / N3 di tabel Enclosure | **tidak ada** — benar-benar terhapus |
| Kura yang masih menunjuk N1/N2/N3 (nama) | **nol** |
| Kura dengan `enclosure_id` yatim | **nol** |
| Jumlah `current_count` seluruh kandang | **136** |
| Kura hidup sebenarnya | **136** — cocok persis |
| Total kapasitas | 290 — cocok dengan jumlah `max_capacity` |

Isi tiap kandang juga dihitung ulang satu per satu dari sisi kura dan
dibandingkan dengan `current_count` masing-masing: **20 dari 20 cocok.**

Angka "136" di tab Kura-kura adalah kura hidup. Dari 178 record total: 136
hidup, 3 mati, 39 terjual.

Jadi penggabungan N1+N2+N3 → N **berhasil bersih**. Yang Anda lihat bukan angka
yang salah.

---

## Yang benar-benar rapuh

Dua halaman menampilkan kandang, dan sampai hari ini keduanya menghitung isi
dengan cara yang berbeda:

| Halaman | Cara mencocokkan |
|---|---|
| `EnclosurePage` (/enclosures) | lewat **nomor** kandang |
| `TortoiseList` tab Kandang (layar Anda) | lewat **nama** |

Komentar di `EnclosurePage` sudah menuliskan bahayanya sejak lama:

> *Dihitung per NOMOR kandang, bukan nama: nama lepas begitu kandang diganti
> nama, dan kura di dalamnya berhenti terhitung tanpa peringatan.*

Satu halaman sudah belajar pelajaran itu. Yang lain belum.

**Diuji dengan kasus N1 → N yang sebenarnya terjadi:** tiga kura di kandang N,
dua di antaranya masih menyimpan nama lama "N1" dan "N2".

- cara lewat nomor → **3** ✓
- cara lewat nama → **1** ✗

Hari ini keduanya kebetulan sepakat karena nama kura sudah ikut diperbarui saat
penggabungan. Tapi begitu kandang diganti nama lagi, tab Kandang akan
menampilkan isi yang salah tanpa satu pun tanda.

### Cacat kedua di kartu yang sama

Di satu kartu kandang, dua angka datang dari dua sumber berbeda:

- lencana statusnya ("Normal" / "Hampir Penuh" / "Kapasitas melebihi batas!")
  dibaca dari kolom tersimpan `current_count`
- angka "28 / 36" tepat di bawahnya dihitung langsung dari daftar kura

`current_count` hanya berubah saat ada yang menekan "Sinkronkan" — jadi ia
selalu tertinggal sampai seseorang mengingatnya. Begitu melenceng, satu kartu
bisa menampilkan **"Normal" di atas angka yang jelas melebihi kapasitas**.

### Cacat ketiga, lebih halus

Baris "20 kandang terdaftar" menghitung **semua** record, sementara kartu
"Total Kandang" menyaring `is_active === true`. Kolom `is_active` tidak pernah
ditulis oleh layar mana pun, jadi kandang lama bernilai `undefined` → falsy →
hilang dari kartu tapi tetap terhitung di baris di atasnya. Dua angka, satu
daftar.

---

## Yang diperbaiki

- Tab Kandang kini memakai `hitungIsiKandang()` — pustaka yang sama dengan
  halaman Kandang **dan** dengan `lib/enclosureCount.js`, penulis yang menjaga
  `current_count` tetap segar dari 13 jalur berbeda. Tiga tempat, satu aturan.
- Lencana status dihitung dari isi nyata, bukan kolom tersimpan.
- "Total Kandang" memakai `is_active !== false`, sehingga sepakat dengan baris
  "N kandang terdaftar".
- Panel rincian "kura di kandang ini" di **kedua** halaman memakai penolong
  baru `kuraDiKandang()`, sehingga panjang daftarnya selalu sama dengan angka
  di kartunya.

Yang **tidak** diubah: penyaring yang mencocokkan nama di
`TortoiseList.jsx:507`. Itu membangun daftar chip dari nama-nama yang tersimpan
di kura sendiri, termasuk kandang lama yang sudah diarsipkan — di sana nama
memang alat yang benar.

---

## Sisa yang perlu diputuskan

**Ada dua modul kandang yang mengerjakan pekerjaan sama:** `EnclosurePage`
(/enclosures) dan tab Kandang di dalam `TortoiseList`. Keduanya menampilkan
daftar kandang, kartu ringkasan, panel rincian, tombol tambah/ubah/hapus.

Setelah perbaikan hari ini keduanya memakai aturan hitung yang sama, jadi
angkanya tidak akan lagi berbeda. Tetapi keduanya tetap dua berkas yang harus
diubah bersamaan setiap kali ada perubahan — dan hari ini adalah contohnya:
satu cacat yang sama harus diperbaiki dua kali.

Menyatukannya pekerjaan tersendiri dan bukan tempelan pada perbaikan ini.
Pilihannya milik pemilik: pertahankan keduanya (masing-masing punya jalan
masuk yang berbeda di menu), atau jadikan satu halaman dengan satu tautan.
