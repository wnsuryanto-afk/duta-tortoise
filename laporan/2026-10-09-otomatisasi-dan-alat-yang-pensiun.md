# Otomatisasi 10,2 layar jadi 3,3 — dan alat yang tahu kapan pekerjaannya selesai

**9 Oktober 2026** · lanjutan dari *Tiga halaman panjang*

---

## 1. Otomatisasi: yang dicari orang cuma satu hal

Sesudah tiga halaman kemarin dipangkas, saya ukur ulang seluruh 124 layar.
Satu masih jauh di atas yang lain:

| | Sebelum | Sesudah |
|---|---|---|
| Huruf | **6.857** | **1.925** (−72%) |
| Tinggi | **10,2 layar** | **3,3 layar** |

Sembilan belas otomatisasi, masing-masing menggambar keterangan penuh, jadwal,
prasyarat, parameter, tombol uji, dan hasilnya — sekaligus, selalu. Padahal
yang dicari orang yang membuka halaman ini hampir selalu **satu hal: mana yang
menyala.**

Barisnya sekarang: kode, nama, jadwal, dan **sakelarnya**.

> `A1`  **Approve poin otomatis**
>      tiap jam                                    ⌄   ◯

**Sakelarnya di luar tombol buka.** Menyalakan sebuah otomatisasi tidak ikut
membuka kartunya — tindakan yang paling sering dilakukan tetap satu ketukan,
dan tidak menyeret tiga paragraf ke layar. Saya ujikan di peramban: menekan
sakelar tidak mengubah satu pun kartu yang terbuka.

## 2. Alat yang tidak tahu kapan pekerjaannya selesai

Kartu **"Bayar poin Inisiatif surut"** adalah alat sekali pakai. Sampai
sekarang ia tidak tahu itu: sesudah tombolnya ditekan ia tetap berdiri sebagai
kartu kuning mencolok yang menawarkan pekerjaan yang sudah tidak ada —
selamanya.

Menekannya lagi memang aman (saringannya `approval_status: "pending"`), tetapi
kartu yang terus meminta perhatian untuk sesuatu yang sudah beres adalah cara
mengajari orang **mengabaikan kartu**. Dan halaman itu berisi lima kartu lain
yang kadang benar-benar perlu diperhatikan.

Sekarang ia menghitung sendiri berapa catatan yang masih tersisa di dalam
jendelanya. Nol berarti selesai, dan ia menyusut jadi satu baris seperti alat
pemeliharaan lain di halaman yang sama:

> ✓ Bayar poin Inisiatif surut
>   Tidak ada catatan tersisa di jendela itu          ⌄

**Hari ini angkanya masih 210**, jadi kartunya masih terbuka penuh — seperti
seharusnya.

### Satu angka, dua tempat, dan penjaga yang benar-benar membandingkannya

Jendela 28 Juli – 6 Oktober kini perlu diketahui **dua pihak**: fungsi yang
membayar (`base44/shared/bayarSurut.ts`) dan kartu yang menghitung sisanya
(`src/lib/jendelaSurut.js`). Deno tidak bisa mengimpor `src/`, jadi angkanya
memang ditulis dua kali.

Yang tidak saya lakukan: menitipkannya pada komentar "ingat ubah dua-duanya".
Penjaga `cek-ronda` sekarang **memuat kedua berkas dan membandingkan isinya
saat berjalan**. Kalau yang satu digeser dan yang lain tidak, kartunya akan
menghitung catatan yang berbeda dari yang dibayar fungsinya — menyatakan
pekerjaannya selesai padahal masih ada yang tertinggal, atau terus menawarkan
pekerjaan yang sudah tidak ada. Diuji-merah dengan menggeser ujung atasnya satu
sisi saja; berbunyi dengan kedua angkanya tercetak.

## 3. Sebarannya sekarang

| Huruf | Layar | Halaman |
|---|---|---|
| 3.141 | 4,0 | Pemeliharaan Sistem |
| 1.925 | 3,3 | Otomatisasi |
| 1.878 | 1,8 | Naikkan produksi |
| 1.445 | 1,6 | Printer |
| 1.355 | 2,6 | Beranda Admin |

**Rata-rata seluruh aplikasi 302 huruf per layar** (dari 382 kemarin, dan dari
jauh lebih tinggi sebelum pekerjaan ini dimulai). Tidak ada lagi satu halaman
pun yang menonjol berkali lipat dari sisanya — yang teratas kini hanya 1,6×
rata-rata, bukan 22×.

Dengan itu pemangkasan berdasarkan kepadatan sudah mentok. Lanjutannya bukan
lagi menghitung huruf, melainkan melihat layar per layar — seperti yang Anda
lakukan dengan kirim potret.

---

**Pemeriksaan akhir:** 27 penjaga lolos, eslint 0 error / 101 peringatan,
`npx vite build` selesai tanpa galat.

## Yang masih menunggu Anda

**210 catatan masih `pending`** — tombol bayar surut belum ditekan. Saya periksa
datanya hari ini. Urutannya: Pengaturan Sistem → "Bayar poin Inisiatif surut" →
*Lihat dulu* (pastikan tertulis **210 catatan, 2026-07-28 sampai 2026-10-06**) →
*Bayarkan sekarang* → **Update** pada kedua slip September.

Sesudahnya kartunya akan menutup sendiri. Itu tandanya berhasil.

Selain itu:
1. Minggu ini: **C22** dan **A47** — siapkan sarangnya.
2. Periksa **C24** dan **C14**, indukan terbukti yang berhenti 6–7 bulan.
3. Pindahkan satu jantan dewasa ke **E1** (usul: B10).
4. Sembilan tugas mati mana yang dihapus.
5. Dua transaksi ganda 4 Oktober lewat `/catat-biaya`.
6. Lima checklist Deny (Mei–Juni) — percobaan juga, atau dibiarkan?
