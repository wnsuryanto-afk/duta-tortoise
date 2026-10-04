# 17,5% yang sebenarnya 68,1%

**4 Oktober 2026** · Peringkat Indukan · diperbaiki

---

Halaman **Peringkat Indukan** adalah layar yang dipakai memutuskan indukan
mana yang dipertahankan. Tiga hal di dalamnya salah, dan ketiganya mengarah
ke kesimpulan yang sama: kebun ini terlihat jauh lebih buruk daripada
keadaannya.

## 1. Tingkat penetasan dibagi dengan telur yang belum selesai

Kartu paling kanan di kepala halaman menghitung begini:

```js
const telur   = filtered.reduce((n, b) => n + (b.egg_count   || 0), 0);
const menetas = filtered.reduce((n, b) => n + (b.hatched_count || 0), 0);
// ...
nilai={`${((menetas / telur) * 100).toFixed(1)}%`}
```

`telur` adalah **seluruh** telur yang pernah tercatat — termasuk 208 butir
yang **sedang dierami hari ini**. Belum menetas bukan berarti gagal.

| | telur | menetas | tingkat penetasan |
|---|---:|---:|---:|
| yang dipajang | 280 | 49 | **17,5%** |
| yang benar | 72 (sudah ada hasilnya) | 49 | **68,1%** |

Tab **Statistik** di halaman Breeding sudah menghitungnya dengan benar lewat
`ringkasTelurDicek()` — bahkan komentar di berkas itu menyebut angkanya,
*"49/72 = 68,1%"*. Jadi dua layar dalam satu aplikasi menjawab **17,5%** dan
**68,1%** untuk pertanyaan yang sama, dan yang dipakai memutuskan nasib
indukan adalah layar yang salah.

Sekarang kartunya memakai perhitungan yang sama dengan tab Statistik, dan
menyebut penyebutnya terang-terangan: *"dari 72 telur yang sudah ada
hasilnya"*. Kartu "Total telur" juga menyebut *"208 masih dierami"*, supaya
280 dan 72 tidak terbaca sebagai dua angka yang bertengkar.

## 2. "0 clutch tahun ini" untuk semua betina

Halaman ini punya tiga tab, dan masing-masing menghitung sendiri dengan rumus
yang disalin tiga kali. Salinannya tidak sama:

| Tab | clutch tahun ini |
|---|---|
| Pasangan Terbaik | dihitung |
| Induk Jantan | `clutchesThisYear: 0` — **angka mati** |
| Induk Betina | `clutchesThisYear: 0` — **angka mati** |

Kartunya menampilkannya tanpa syarat: **"📅 0 clutch tahun ini"**. Jadi tab
Induk Betina — justru tab yang menjawab *"betina mana yang berproduksi tahun
ini"*, pertanyaan yang sedang Anda kejar untuk 73 induk — menyebut **nol
untuk semuanya**, termasuk C23 yang bertelur **tiga kali** sepanjang 2026 dan
A31 yang **dua kali**.

Dua angka lain hilang tanpa suara di kedua tab itu: **tanggal terakhir
bertelur** dan **berapa clutch yang induknya sedang sakit**. Keduanya tidak
pernah dihitung di sana, jadi barisnya tidak dirender — bukan karena datanya
tidak ada, melainkan karena rumusnya tidak ikut disalin.

Sekarang ketiga tab memanggil satu fungsi, `lib/peringkatIndukan.js`.

## 3. Rincian clutch selalu kosong di dua dari tiga tab

Menekan sebuah kartu membuka dialog rincian, yang menyaring begini:

```js
history.filter(b => b.male_name === pair.maleName && b.female_name === pair.femaleName)
```

Di tab Induk Jantan, `femaleName` berisi `"—"`. Di tab Induk Betina,
`maleName` berisi `"—"`. Tanda hubung itu tidak pernah cocok dengan nama kura
mana pun, jadi rinciannya **selalu kosong**: kartunya menyebut "3 clutch", dan
dialog yang dibuka dari kartu itu berbunyi *"Belum ada riwayat"*.

Sekarang disaring per sisi yang punya nama.

## Yang ikut dibereskan

Keterangan **"Formula Skor: Hatch Rate × 40% + …"** dulu diketik tangan di
layar sementara angkanya ada di tiga tempat lain di kode. Sekarang dibaca
dari rumusnya sendiri, jadi keterangan dan perhitungan tidak bisa lagi
berbeda.

## Penjagaannya

`cek-ronda.mjs` bertambah 5 kasus peringkat betina plus pemeriksaan tingkat
penetasan kebun, memakai **ketigabelas clutch yang sungguhan**. Angka
harapannya dihitung tangan dari daftar itu, bukan disalin dari keluaran
kodenya sendiri — uji yang menyalin jawabannya hanya memastikan kodenya tidak
berubah, bukan memastikan kodenya benar.

Keduanya diuji merah dulu. Mengembalikan `clutchesThisYear: 0` membuat enam
kasus gagal; mengembalikan penyebut lama membuat penjaga menyebut persis
*"17.5%, seharusnya 68,1%"*.

Halaman ini juga dimasukkan ke daftar kasus render — sampai hari ini
**belum pernah dirender satu penjaga pun**, padahal ia salah satu layar
pengambil keputusan. 91 komponen sekarang.

## Hasil

23 penjaga hijau, `npx vite build` lolos. Tidak ada data historis yang
diubah — yang berubah hanya cara menghitungnya.
