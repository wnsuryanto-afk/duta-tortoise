# Label kotak telur: kecil, dan yang dicari ada di depan

**5 Oktober 2026**

Keluhannya ada tiga: labelnya terlalu besar sehingga telur tidak kelihatan dari
luar, ada keterangan yang tidak perlu, dan perkiraan menetas terlalu kecil.
Ditambah satu permintaan baru: nomor tray.

---

## Yang membuat labelnya sebesar itu

Tombol **"Unduh Lembar A4"** memaksa ukuran 100 × 50 mm. Ukurannya ditulis mati
di dalam fungsinya:

```js
const labelDef = SIZE_DEFS.find((s) => s.id === "100x50");
```

Pilihan "Ukuran Label" di layar tidak pernah sampai ke sana. Jadi memilih
**50 × 30 mm** lalu menekan Lembar A4 tetap menghasilkan label 100 × 50 — satu
lagi pilihan yang kelihatan berpengaruh tapi tidak melakukan apa-apa.

Sekarang jumlah kolom dan baris dihitung dari milimeter ukuran **yang dipilih**:

| Ukuran | Per lembar A4 |
|---|---|
| 100 × 50 mm | 10 |
| **50 × 30 mm** | **36** |
| 40 × 30 mm | 45 |

Keterangan di bawah tombolnya ikut dihitung dari angka yang sama, bukan ditulis
tetap "2 kolom × 5 baris = 10" seperti sebelumnya. Ukuran bawaannya sekarang
50 × 30 mm.

## Yang dibuang, satu per satu

| Dibuang | Alasan |
|---|---|
| Sulcata Breeding Farm · Probolinggo | satu-satunya peternakan di rak itu |
| Centrochelys sulcata (African Spurred Tortoise) | tidak ada yang membacanya di depan inkubator |
| dutatortoise.base44.app | QR-nya sudah membawa alamat itu |
| F1 · Captive-bred | ada di layar yang dibuka QR |
| "Pindai untuk info kura" | QR tidak perlu diterangkan |
| Inkubator 1 | kotaknya sedang berada di dalamnya |
| KODE KOPLING K-011026-A36-A31 | tanggal dan nama induk sudah tercetak terpisah |
| Kandang induk (W3) | keputusan kandang tidak diambil sambil berdiri di depan rak |
| Status: Bertelur | semua kotak di inkubator begitu |
| Suhu: ___ °C  Kelembapan: ___ % | inkubatornya punya layar sendiri — **dan pada label yang sudah terpasang baris ini kosong semua** |
| Fertil: ___  Infertil: ___ | sama, kosong di semua label yang terpasang |

Dua yang terakhir bukan tebakan: terlihat kosong di foto label yang sedang
menempel.

## Yang dibesarkan

**Perkiraan menetas.** Sebelumnya ia tercetak 14px — lebih kecil daripada nama
induk yang 26px. Di label **termal** ringkas ia bahkan **tidak ada sama sekali**,
padahal gulungan yang dipunyai peternakan hanya 30×15 dan 50×30, jadi itulah
label yang sebenarnya keluar dari printer termal.

Sekarang ia tulisan terbesar di label, dan tanggal **mulai** dipisahkan dari
tanggal akhir — yang menentukan kapan rak mulai ditengok adalah yang awal:

```
PERKIRAAN MENETAS
20 Des 2026          ← terbesar di label
s/d 14 Jan 2027
22 butir · bertelur 1 Okt 2026
```

## Yang baru: nomor tray

Tray adalah satu-satunya hal yang membedakan telur induk A dari telur induk B
setelah keduanya masuk inkubator yang sama. Nomornya sekarang jadi lencana di
pojok kanan kepala label, dan **clutch yang belum punya tray dicetak "?" dengan
latar merah** — bukan dikosongkan. Pada 2 Okt 2026 ada 127 butir tanpa tray;
label yang diam saja tidak akan pernah memperbaikinya.

Clutch dengan dua tray ditulis dua-duanya: **8 · 9**.

## Bentuknya sekarang

```
┌──────────────────────────────────────────┐
│ A36 × A31                      ┌───────┐ │  kepala hijau
│                                │ TRAY 7│ │
├────────────────────────────────┴───┬────┤
│ PERKIRAAN MENETAS                  │ ▓▓ │
│ 20 Des 2026                        │ QR │
│ s/d 14 Jan 2027                    │ ▓▓ │
│ 22 butir · bertelur 1 Okt 2026     │    │
├────────────────────────────────────┴────┤
│ CANDLING H+30                        ☐  │  pita kuning
│ 31 Okt 2026                             │  (merah bila terlambat)
└──────────────────────────────────────────┘
```

Tinggi ketiga jalur **dijumlahkan persis setinggi label** — kepala dan pita
candling dihitung dari tinggi label, badan mengambil sisanya. Tidak ada piksel
yang tidak dipakai, berapa pun ukurannya.

## Satu tata letak untuk dua printer

Versi warna dan versi termal dulu ditulis terpisah di dua berkas, dan isinya
memang sudah berbeda — yang termal kehilangan perkiraan menetas. Keduanya
sekarang memanggil satu fungsi di `components/breeding/labelRingkas.js`; yang
dioper hanya paletnya. Satu versi tidak bisa lagi diperbaiki sementara yang lain
tertinggal.

## Penjaga baru: `cek-label.mjs`

Label dicetak ke kertas lalu ditempel. Begitu keluar dari printer tidak ada
layar yang bisa mengoreksinya, jadi penjaga ini **menjalankan penggambarnya**
dengan lima clutch sungguhan pada tiga ukuran, lalu memeriksa hasilnya:

- tinggi ketiga jalur berjumlah persis setinggi label (tidak ada pita kosong)
- **perkiraan menetas selalu tulisan terbesar** — 15 label diperiksa
- nomor tray tercetak; yang kosong ditandai "?" berlatar mencolok; dua tray
  ditulis dua-duanya
- sembilan keterangan yang dibuang tidak kembali muncul
- tujuh bagian wajib ada (QR, judul, candling, butir, dua nama induk, kotak centang)
- clutch tanpa tanggal mencetak "—", bukan `Invalid Date`

Penjaganya diuji merah empat arah sebelum dipakai: mengecilkan perkiraan
menetas, mengosongkan tanda tray, mengembalikan "Probolinggo", dan
mengembalikan pita kosong — keempatnya membuatnya gagal.
