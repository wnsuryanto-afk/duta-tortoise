# Ubin ringkasan terpotong — dan penjaga lebar yang tidak bisa melihatnya

**5 Oktober 2026**

Kepala halaman Stok & Gudang: **"Barang wajib ha…"**, **"N…"**, **"P…"**,
"Rp 9.455.201" patah dua baris, "+65 / –0" patah dua baris, dan satu petak
kosong besar di sebelah "Stok kritis".

---

## Sebabnya: titik henti membaca lebar LAYAR, bukan lebar wadah

```jsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
```

`sm:` dan `lg:` adalah titik henti Tailwind, dan keduanya membaca **lebar
layar**. Ubin ini hidup di dalam kepala halaman, yang lebarnya bisa jauh lebih
sempit daripada layarnya — dan aplikasi ini dibuka di **panel pratinjau iPad**:
layarnya terbaca "lg", wadahnya hanya selebar ponsel.

Hasilnya empat kolom selebar ±150 px. Label memakai `truncate` — satu baris,
sisanya dipotong — sehingga "Nilai stok" tinggal **"N…"**. Label yang tinggal
satu huruf bukan label.

## Petak kosongnya punya sebab sendiri

Ubin **mendesak** memakai dua kolom. Pada jumlah kolom **ganjil** (3), ubin
mendesak pertama mengisi kolom 1–2 dan menyisakan kolom 3 — yang tidak muat
diisi ubin mendesak berikutnya, dan tidak diisi ubin lain karena grid menaruh
sesuai urutan. Itulah ruang kosong di sebelah "Stok kritis 23".

## Perbaikannya

| | Sebelum | Sesudah |
|---|---|---|
| Kolom | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` | `repeat(auto-fit, minmax(170px, 1fr))` |
| Lubang | tersisa pada kolom ganjil | `grid-auto-flow: dense` — ubin satu kolom mundur mengisinya |
| Label | `truncate` → satu huruf | `line-clamp-2` → boleh turun baris |
| Angka | patah di tengah | `whitespace-nowrap` |

`auto-fit` + `minmax` tidak punya titik henti sama sekali: ia membagi ruang
yang **benar-benar ada**, berapa pun lebar layarnya.

## Penjaga yang tidak bisa melihat cacatnya

`cek-lebar.mjs` merender 122 kasus di Chromium selebar **360 px** dan memeriksa
tulisan yang terpotong. Ia hijau terhadap cacat ini — dan harus begitu: di layar
360 px titik hentinya memang kecil, jadi tata letaknya benar. **Yang salah
justru terjadi saat layarnya LEBAR.**

Ditambah bagian kedua: layar dibiarkan **1280 px**, dan **wadahnya** yang
disempitkan ke **320 / 420 / 560 / 720 px**. Itu persis keadaan yang dilaporkan.

### Yang langsung ditemukannya

Bukan hanya ubin yang dikeluhkan. Dua dashboard lain punya cacat yang sama,
dari sebab yang sama:

```
AdminDashboard     wadah 320px  "Absensi" +10px · "0/0 hadir" +22px
                                "Checklist" +18px · "0 submit" +41px
                                "0 kasus" +28px · "0 item" +14px
AdminDashboard     wadah 420px  "0 submit" +16px · "0 kasus" +3px
InvestorDashboard  wadah 560px  "Aktif" +18px · "Terjual" +10px · "Mati" +16px
```

`sm:grid-cols-4` dan `lg:grid-cols-4` — titik henti layar, di dalam wadah
sempit. Ketiganya ikut dipindahkan ke `auto-fit` + `minmax(150px, 1fr)`, dan
nilai di MiniCard diturunkan ke `text-lg` dengan `break-words` supaya turun
baris alih-alih terpotong.

Sekarang: **122 kasus bersih pada layar 360 px, dan pada wadah 320/420/560/720
px di layar 1280 px.**
