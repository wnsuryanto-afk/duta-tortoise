# Tujuh halaman prioritas

**4 Oktober 2026** · lanjutan audit tata letak

---

## Ringkasan

| Halaman | Yang dikerjakan |
|---|---|
| **SOPPage** | **tidak diubah** — alasannya di bawah |
| **SalesList** | 4 kartu jadi bisa diklik; "Menunggu Follow-up" naik ke depan saat ada |
| **TreatmentPage** | chip "Pengingat belum selesai" membuka tab Pengingat |
| **RempesanPage** | chip "Menunggu persetujuan" menyaring daftar di bawahnya |
| **BreedingPlannerPage** | 2 kartu sisanya ikut menyaring daftar betina |
| **LayarTimPage** | `<h1>` → PageHeader |
| **RekapPoinGajiPage** | `<h1>` → PageHeader + 3 angka baru |
| **PembelianPage** | `<h1>` → PageHeader + 3 angka; spanduk talangan dilebur |

Halaman ber-`<h1>` sendiri: **31 → 28**. Chip yang punya tujuan: **28 → 36**.

## SOPPage sengaja TIDAK diubah

Saya menandainya "prioritas tinggi" di audit kemarin karena ia layar yang
paling sering dibuka. Setelah dibaca, penilaian itu salah:

1. Kepala halamannya **sengaja** dibuat polos. Komentarnya sudah menjelaskan:
   *"Judul `text-3xl` dengan anak kalimat dua baris memakan 100px pertama tiap
   kali dibuka — padahal yang dicari orang ada di tab pertama."*
2. Angka yang layak dipajang — berapa tugas selesai hari ini — **sudah ada**,
   besar, tepat di bawah kepala halaman: `TugasHariIni` punya baris kemajuan
   dengan persentase, "12/15 selesai", dan batang kemajuannya.

Menambah chip di sana berarti menampilkan angka yang sama dua kali dan
mengembalikan 100px yang sudah sengaja dihemat. Tidak ada yang diubah.

## SalesList: kartunya sudah bisa diklik sejak dulu

`StatCard` mendukung `href` dan `onClick` — keempat kartu di halaman ini
tidak memakai satu pun. "Menunggu Follow-up 4" adalah pertanyaan paling
mendesak di halaman itu, lalu membiarkan orang mencari sendiri tabnya.

Keempatnya kini menuju tabnya masing-masing, dan "Menunggu Follow-up"
**pindah ke depan saat memang ada isinya** — ia satu-satunya angka di sana
yang menuntut dikerjakan hari ini; tiga lainnya adalah keadaan. Saat nol ia
kembali ke tempat semula dengan warna tenang: nol bukan tagihan.

Kepala halamannya tetap tanpa chip. Keterangannya sudah ditulis di sana dan
masih benar: keempat kartu di bawahnya memuat angka yang sama, dan jumlah
follow-up bahkan sempat muncul tiga kali.

## Dua chip yang lolos dari penjaga saya sendiri

`cek-tataletak.mjs` versi pertama hanya mengenali `chips={[…]}` — larik yang
ditulis langsung. TreatmentPage dan RempesanPage menulisnya **bersyarat**:

```js
chips={pendingRemindersCount > 0 ? [{ … }] : []}
```

Keduanya lolos tanpa diperiksa, dan keduanya memang tidak punya tujuan.
Penjaga yang hanya mengenali satu bentuk penulisan menjaga **gaya
penulisan**, bukan aturannya.

Sesudah diperlebar, penjaganya langsung menemukan keduanya. Tapi pelebaran
itu sendiri memperkenalkan cacat kedua: jumlah chip yang diperiksa **anjlok
dari 30 ke 12** tanpa satu pun penjaga merah, karena pemotong entrinya
mencari koma di kedalaman nol sementara seluruh isi larik berada di dalam
`[`. Ketahuan hanya karena angkanya saya baca. Sekarang larik-lariknya dicari
dulu, baru isinya dipotong — 36 chip diperiksa.

Keduanya kini memakai `onClick`, bukan tautan: tab TreatmentPage belum punya
alamat sendiri, dan chip Rempesan memang menyaring daftar di halaman yang
sama. Keduanya tindakan sungguhan, bukan tautan yang diam di tempat.

## Tiga angka baru di halaman Gaji

| Angka | Dari | Menuju |
|---|---|---|
| Slip belum terbit | `rekapData` yang sudah dihitung halaman ini | tab Terbitkan |
| Kasbon berjalan | `totalBelumLunas()` — lib yang sama dengan beranda Owner | tab Kasbon |
| Total gaji periode ini | jumlah `netTotal` | tab Laporan |

Ketiganya dari data yang **sudah ada** di halaman itu, bukan dari kueri baru.
Angka keempat untuk pertanyaan yang sama adalah angka yang kelak berselisih —
dan kasbon adalah contohnya: sebelum `totalBelumLunas()` ada, beranda
menyaring dengan `status === "active"`, status yang tidak ada di enum, dan
angkanya selalu Rp 0 padahal Ahmad Ali berutang Rp 600.000.

## Pembelian: satu spanduk dilebur jadi chip

Halaman itu punya spanduk kuning "Talangan belum dilunasi Rp … dari N
pesanan. **Lihat tab Riwayat** untuk menandai lunas." — sebuah kalimat yang
menyuruh orang mencari sendiri.

Sekarang angkanya jadi chip di kepala halaman yang **langsung membuka** tab
Riwayat, dengan jumlah pesanan pindah ke keterangannya. Spanduknya dibuang:
dua tempat untuk satu angka, dan yang satu tidak bisa diklik.

Dua chip lain — "Daftar belanja" dan "Menunggu barang" — memindahkan tahap di
alur yang sama.

## Sisa antrean

28 halaman masih memakai `<h1>` sendiri, semuanya prioritas sedang ke bawah:
layar pengaturan, panduan, lembar cetak, dan halaman yang menurut menunya
sendiri "belum dipakai". Daftarnya ada di laporan audit kemarin, dan
penjaganya menahan angkanya supaya tidak naik.

24 penjaga hijau, `npx vite build` lolos.
