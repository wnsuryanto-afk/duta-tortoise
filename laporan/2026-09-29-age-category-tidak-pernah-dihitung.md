# Kolom yang skemanya sendiri sebut "auto-calculated", dan tidak pernah dihitung

**Pemeriksaan 29 September 2026.** Bermula dari satu hal yang terlihat saat
membangun halaman Produksi Indukan: `age_category` kosong di hampir semua kura.

**Tidak ada data yang diubah.**

---

## Apa yang dijanjikan, dan apa yang ada

Skema `Tortoise.age_category` menuliskan aturannya sendiri:

> *"Kategori umur: baby (0-12 bln), juvenile (1-3 thn), dewasa (>3 thn).
> **Auto-calculated dari birth_date**."*

Kalimat terakhir tidak benar.

| Yang diperiksa | Hasil |
|---|---|
| Kura **aktif** | 136 |
| `age_category` terisi | **16** — semuanya `baby`, tukik 2026 |
| `age_category` **null** | **120** |
| Kode yang menghitungnya dari `birth_date` | **tidak ada satu pun** |

Rumusnya sendiri sebenarnya sudah ditulis — `calcAgeCategory` di
`components/tortoise/AgeDisplay.jsx` — dan hanya dipakai untuk **mewarnai satu
lencana** di kartu kura. Yang mengambil keputusan tidak pernah memanggilnya,
dan letaknya menjelaskan kenapa: sebuah pustaka jadwal tidak akan mengimpor
berkas komponen hanya untuk bertanya berapa umur seekor kura.

---

## Akibatnya pada jadwal timbang

`jadwalTimbang.golonganRutin()` menentukan siapa masuk jadwal timbang
14-harian. Ia memeriksa dua hal:

1. `age_category` bernilai `baby` atau `juvenile`
2. panjang tempurung di bawah 20 cm — cadangan

Kura yang gagal **dua-duanya** tidak sekadar salah golongan. Ia **hilang dari
daftar timbang sama sekali**, karena kura dewasa yang sehat dan makan memang
tidak pernah masuk daftar.

Dan justru kolom cadangan itulah yang paling sering kosong: **53 kura tidak
punya panjang tempurung**. Jadi dua kolom yang kosong bertemu, dan yang jatuh
di antaranya adalah kura yang paling perlu diikuti pertumbuhannya.

---

## Berapa kura yang benar-benar terdampak: satu, bukan tiga

Tulisan pertama saya di dalam kode menyebut **tiga** kura: Yuwono, Red Foot -
02, dan H3. **Ujinya yang membetulkan saya.**

| Kura | Lahir | Umur 29 Sep 2026 | Menurut aturan skema | Masuk jadwal? |
|---|---|---|---|---|
| **H3** | 2024-01-01 | 2 th 9 bln | juvenile | **tidak → sekarang ya** |
| 8 KECIL | 2024-01-01 | 2 th 9 bln | juvenile | sudah ya (tempurung 15 cm) |
| Yuwono | 2023-05-01 | 3 th 4 bln | **dewasa** | tidak, dan tetap tidak |
| Red Foot - 02 | 2023-05-01 | 3 th 4 bln | **dewasa** | tidak, dan tetap tidak |

Yuwono dan Red Foot - 02 sudah lewat batas tiga tahun, jadi menurut aturan
aplikasi ini sendiri mereka memang dewasa. Mereka tetap di luar jadwal — tetapi
bukan karena cacat ini, melainkan karena batas umurnya. Itu **sisa masalah yang
dibiarkan terbuka**, bukan sesuatu yang diperbaiki diam-diam: menggeser batas
"dewasa" untuk sulcata — yang sebenarnya baru matang pada umur belasan tahun —
adalah keputusan pemeliharaan, bukan keputusan kode.

### Nilai sebenarnya ada di masa depan, bukan pada satu kura itu

Enam belas tukik 2026 hari ini bernilai `age_category: "baby"`, ditulis sekali
saat menetas dan **tidak pernah diperbarui sesudahnya**. Tanpa perbaikan ini,
mereka akan terbaca "baby" selamanya — masih ditimbang tiap 14 hari pada umur
sepuluh tahun, dan ikut terhitung sebagai bayi di setiap layar yang
menghitungnya.

---

## Yang diperbaiki

`lib/umurKura.js` — satu tempat yang tahu umur kura, dipakai oleh jadwal
timbang, pustaka produksi indukan, dan lencana di kartu kura.

**Urutannya sengaja dibalik dari yang biasanya benar: tanggal lahir DULU,
kolom tersimpan belakangan.** Biasanya nilai yang pernah ditulis manusia
didahulukan. Di sini tidak, karena golongan umur adalah fungsi dari umur — ia
tidak pernah merupakan keputusan yang perlu dilindungi. Nilai yang tersimpan
hari ini pun bukan keputusan: ia snapshot saat menetas. Kolom tersimpan tetap
dipakai ketika tanggal lahirnya tidak ada, karena di situ ia satu-satunya yang
tahu.

Ikut terbawa: `betinaDewasa()` di pustaka produksi indukan dulu membaca
`age_category` mentah, artinya setiap kura tanpa kolom itu dianggap dewasa.
Sekarang ia memakai aturan yang sama.

---

## Yang diuji

25 uji memakai data nyata kebun, semuanya lulus. Yang paling berguna justru
yang **gagal lebih dulu**:

| Uji | Yang ditangkapnya |
|---|---|
| "tiga kura muda masuk jadwal" | **gagal** — ternyata hanya satu; dua lainnya sudah 3 th 4 bln |
| "betinaDewasa mengecualikan yang masih tumbuh" | **gagal** — Red Foot - 02 memang dewasa menurut aturannya |
| "SEBELUM: H3 tidak punya alasan timbang" | **gagal** — ujinya sendiri cacat: ia mengaku menguji perilaku lama padahal memanggil fungsi yang sudah diperbaiki, jadi tidak pernah bisa gagal karena alasan yang benar. Diganti dengan yang membuktikan klaim sesungguhnya: kura yang gagal saringan memang jatuh ke "tidak ada alasan sama sekali", bukan pindah golongan. |

Sisanya menjaga batas-batasnya: 11 bulan = baby, 13 bulan = juvenile, 2,9 th =
juvenile, 3,1 th = dewasa, tanggal lahir di masa depan dan tanggal ngawur
sama-sama `null`, tukik 2026 tetap baby, dan kura dewasa 18 tahun tetap tidak
masuk jadwal.

---

## Sisa yang perlu diputuskan pemilik

**Apakah batas "dewasa >3 tahun" masuk akal untuk sulcata?** Aturan itu datang
dari skema dan sekarang dijalankan dengan konsisten. Tetapi sulcata berumur
tiga tahun masih jauh dari dewasa — betina pertama yang bertelur di kebun ini
berumur 6,4 tahun. Dengan batas sekarang, kura umur 3–6 tahun tidak masuk
jadwal timbang pertumbuhan dan juga belum berproduksi: tidak terlihat di
kedua sisi.

Kalau batasnya digeser (misalnya juvenile sampai 6 tahun), Yuwono dan
Red Foot - 02 langsung masuk jadwal pertumbuhan. Itu keputusan pemeliharaan,
dan saya tidak mengambilnya sendiri.
