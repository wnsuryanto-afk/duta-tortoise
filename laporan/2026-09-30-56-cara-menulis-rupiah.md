# 56 cara menulis angka rupiah

30 September 2026

## Temuan

`src/lib/rupiah.js` sudah ada sejak lama. Isinya penjelasan panjang tentang
kenapa aturan menulis angka rupiah harus tinggal di satu tempat, termasuk
kalimat ini:

> Dua salinan aturan yang sama adalah cara paling pasti membuat sumbu grafik
> dan kartu di atasnya kelak menyebut angka yang sama dengan bentuk berbeda.

**Tepat satu berkas mengimpornya.** Lima puluh lima berkas lain menulis ulang
aturannya sendiri.

Salinannya memakai enam nama berbeda — `formatRp`, `fmt`, `rp`, `rupiah`,
`fmtRp`, `formatRpLocal` — dengan tiga perilaku berbeda:

| Bentuk | Kode | 168.917,42 | teks `"1500000"` |
|---|---|---|---|
| A | `Number(n \|\| 0).toLocaleString` | Rp 168.917,42 | Rp 1.500.000 |
| B | `Math.round(Number(n) \|\| 0).toLocaleString` | Rp 168.917 | Rp 1.500.000 |
| C | `(n \|\| 0).toLocaleString` | Rp 168.917,42 | **Rp 1500000** |

Bentuk C paling berbahaya: `String.prototype.toLocaleString` mengembalikan
teksnya apa adanya. Nilai berupa teks — yang persis keluar dari
`<Input type="number">` — tampil **tanpa titik ribuan sama sekali**. Satu
berkas sudah menambal ini di satu baris dengan `fmt(Number(currentVal))`;
baris lain di berkas yang sama tidak ditambal.

Dan `PayrollPage` punya bentuk keempat, tanpa `|| 0` sama sekali:

```
fmt(undefined)  →  "Rp NaN"
```

Ironinya lengkap pada bentuk ringkas: komentar di `lib/rupiah.js`
**menyebut namanya** salinan lokal di `components/ui/grafik-uang.jsx`
sebagai alasan berkas itu dibuat — tetapi salinannya tidak pernah ikut
dicabut. Selama ini sumbu grafik menyebut Rp 18.000 sebagai "18 rb"
sementara kartu di atasnya menyebutnya "18.000".

## Apakah ada angka yang salah sekarang?

**Tidak.** Ini penting dan tidak boleh dilebih-lebihkan.

Semua 132 nilai `FinanceTransaction`, semua harga `Sale`, semua `hpp`,
`profit`, dan `care_cost_estimate` di basis data adalah **bilangan bulat**.
Ketiga bentuk lama diuji terhadap 71 nilai uang nyata yang diambil langsung
dari basis data:

```
71 nilai nyata × 3 bentuk lama: 0 perbedaan.
```

Bentuk C juga tidak pernah benar-benar menerima teks, karena setiap
pemanggilnya sudah melakukan `Number()` di hulu. `Rp NaN` di PayrollPage
butuh nilai `undefined` yang tidak pernah terjadi pada data sekarang.

Jadi ini bukan angka yang salah. Ini **56 tempat yang kebetulan sepakat**,
dan tidak ada apa pun yang menjaga kesepakatan itu.

## Yang dikerjakan

Lima puluh lima salinan dicabut. Semuanya sekarang memakai `lib/rupiah.js`,
yang diperluas dengan dua bentuk yang memang dibutuhkan pemanggilnya:

| | |
|---|---|
| `rupiah(n)` | `Rp 1.500.000` |
| `angkaRibuan(n)` | `1.500.000` — untuk markup yang menulis "Rp" sendiri dengan ukuran huruf berbeda, atau berawalan `-Rp` / `+Rp` |
| `rupiahAtauStrip(n)` | `—` bila kosong, `Rp 0` bila memang nol |
| `rupiahSingkat(n)` | `Rp 1,5 jt` — kotak sempit dan label sumbu grafik |

Dua definisi lokal ternyata **tidak dipakai sama sekali** dan ikut hilang
(`AdminDashboard`, `TortoisePassport`).

## Yang sengaja BELUM dikerjakan

79 tempat menulis `Rp {x.toLocaleString("id-ID")}` langsung di dalam JSX,
tanpa lewat fungsi bernama. Bentuknya duplikasi yang sama.

Tidak satu pun dari 79 itu salah atau bisa membuat layar mati — semuanya
dijaga `> 0` atau `|| 0` di depannya, dan sudah diperiksa satu per satu.
Mengubah 79 tempat di dalam berkas JSX besar tanpa satu pun perubahan yang
terlihat pengguna adalah risiko tanpa imbalan.

Jumlahnya dicetak setiap kali penjaga jalan, supaya tidak diam-diam
bertambah.

## Supaya tidak terulang

`scripts/cek-rupiah.mjs`, penjaga ke-18. Menolak berkas mana pun selain
`lib/rupiah.js` yang **mendefinisikan** pemformat uangnya sendiri, dan
menghitung penulisan sebaris tanpa menolaknya.

## Catatan

Tidak ada data historis yang diubah.
