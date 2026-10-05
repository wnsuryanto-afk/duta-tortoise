# Label terpotong di iPad — dan kenapa tidak kelihatan dari sini

**5 Oktober 2026 · cacat yang saya buat sendiri**

Pemilik: *"Label-labelnya masih banyak yang terpotong."* Pada tangkapan layarnya
setiap baris besar terpotong kira-kira separuh: **23 Des 2026**, **s/d 17 Jan
2027**, **24 butir**, **3 Nov 2026**, **A35 × A46** — semuanya hanya bagian
atasnya.

---

## Penyebabnya saya

Tiap baris memakai `white-space:nowrap; overflow:hidden` supaya nama panjang
berakhir dengan "…" alih-alih mendorong lencana TRAY keluar label.

Tapi **`overflow:hidden` memotong ke segala arah.** Kalau kotak baris —
`font-size × line-height` — lebih pendek daripada huruf yang digambar, bagian
bawah hurufnya ikut hilang. Dan yang hilang bukan ekor huruf saja: separuh
angka.

Tata letak baru yang saya tulis memakai `line-height` 1 sampai 1,2 **tanpa
bantalan apa pun**. Label versi lama tidak begitu — tiap barisnya membawa:

```
padding-bottom: ${Math.round(nameF * 0.22)}px
```

Penulis sebelumnya sudah pernah menemukan masalah ini dan memasang bantalannya.
**Saya menghapusnya saat menulis ulang tata letaknya.** Itu bukan regresi yang
diwarisi; itu regresi yang saya buat.

## Kenapa saya tidak melihatnya

Dua hal, dan keduanya menyembunyikannya dari saya:

1. **Labelnya tidak pernah mematok tumpukan hurufnya.** Ia digambar dari
   sepotong DOM yang ditempel ke halaman aplikasi, jadi ia mewarisi huruf
   perangkatnya — Arial di mesin saya, SF Pro di iPad. Tinggi huruf keduanya
   berbeda, dan yang menentukan terpotong atau tidak justru itu.
2. **Pratinjau yang saya tunjukkan digambar browser biasa**, bukan
   `html2canvas`. Yang menggambar label sungguhan adalah `html2canvas`.

Jadi gambar yang saya kirim sebelumnya memang bersih — tapi ia bukan gambar
yang keluar dari aplikasinya.

## Terukur, bukan ditebak

Saya menggambar labelnya di Chromium lalu mengukur kotak tinta tiap baris
terhadap kotak pemotongnya, pada empat tumpukan huruf. Sebelum diperbaiki:

```
✗ 50x30 / Arial          "A35" 32px lh=32px   → terpotong 2px
✗ 50x30 / 'DejaVu Sans'  "A35" 32px lh=32px   → terpotong 3px
✗ 50x30 / 'DejaVu Sans'  "23 Des 2026" 48px   → terpotong 2,6px
```

Di sini 2–3 piksel. Di iPad jauh lebih parah karena tinggi huruf sistemnya lebih
besar lagi — dan arah kesalahannya sama persis dengan yang terlihat di
tangkapan layarnya.

## Perbaikannya

1. **Huruf dipatok di labelnya sendiri** — `font-family: Arial, Helvetica,
   sans-serif` di akar label. Label yang mewarisi huruf berarti label yang
   bentuknya berbeda di tiap perangkat.
2. **Satu fungsi untuk tiap baris teks**, dipakai label ringkas maupun label
   100 × 50:

   ```js
   const LH = 1.35;
   const BANTALAN = 0.18;
   gayaBaris(fs) → line-height:1.35; padding-bottom: ceil(fs × 0.18)px
   ```

   `line-height` 1,35 + bantalan 0,18em memuat huruf setinggi ~1,7em. Arial
   ~1,12em, SF Pro ~1,2em, DejaVu ~1,16em.
3. **Tinggi jalurnya dinaikkan** (kepala 0,17 → 0,22; candling 0,19 → 0,21)
   supaya kotak baris yang lebih lega tetap muat.
4. **Label 100 × 50 ditata ulang juga** — tulisannya dulu hampir sebesar label
   50 × 30 padahal luasnya dua kali lipat, jadi sisanya jadi ruang kosong.
   Perkiraan menetas 44 → **64px**, nama induk 34 → 42px, jumlah butir 34 →
   46px, dan bloknya dibagi rata (`space-evenly`) alih-alih direnggangkan ke
   dua ujung.

## Penjaga: `cek-label.mjs` bagian 9

Penjaga lama memeriksa isi label dari **untaian HTML**. Untaian tidak bisa
memberi tahu apakah huruf muat di kotaknya — itu hanya bisa diketahui dengan
menggambarnya.

Sekarang penjaganya membuka Chromium, menggambar **empat desain × empat
tumpukan huruf = 16 gabungan**, dan mengukur dua hal pada tiap baris:

- kotak tintanya tidak melewati kotak barisnya sendiri
- kotak tintanya tidak melewati jalur induk yang memotong

Kalau Chromium tidak ada, penjaganya **gagal dan mengatakannya** — bukan diam
lalu hijau.

Diuji merah dua arah: mencabut bantalan → *"A40 29px terpotong 1px oleh kotak
barisnya sendiri"*; memendekkan jalur kepala → *"TRAY terpotong 5,9px oleh
jalur induknya"*.

## Satu penjaga lama yang ikut diperbaiki

Pemeriksaan "perkiraan menetas harus jadi tulisan terbesar" mengenali bloknya
lewat untaian gaya `line-height:1.05`. Begitu gayanya ditata ulang, ia berhenti
menemukan apa pun — dan **berkata begitu** alih-alih lolos diam-diam:

```
✗ 50×30 warna / A36×A31: blok perkiraan menetas tidak ditemukan
```

Itu perilaku yang benar, tapi pemeriksaannya memang rapuh. Sekarang ia mengukur
`font-size` yang benar-benar dipakai di DOM dan membandingkannya dengan yang
terbesar di label — tidak lagi bergantung pada bagaimana gayanya ditulis.
Diuji merah: membesarkan nama induk → *"perkiraan menetas 44px, padahal ada
tulisan 71px"*.
