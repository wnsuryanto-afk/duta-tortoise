# 167 dari 208 telur akan menetas tanpa diketahui induknya

2 Oktober 2026 · ditemukan saat memeriksa hasil kerja tray terhadap data sungguhan

---

## Temuan

Setelah menambahkan dukungan multi-tray, saya periksa keadaan sebenarnya. Hasilnya lebih buruk
daripada yang diduga.

| | Telur | |
|---|---|---|
| **Tanpa tray sama sekali** | **127** | 6 clutch |
| **Berbagi tray 8 dengan induk lain** | **40** | C23 9 Sep (23) + C22 14 Sep (17) |
| Tray jelas | 41 | tray 7 (13) dan tray 3 (28) |
| **Total dierami** | **208** | 10 clutch, semuanya di Inkubator 1 |

**Hanya 41 dari 208 butir — 20% — yang induknya pasti bisa ditelusuri.**

Clutch yang traynya kosong: C23 12 Agt (22), A31 4 Sep (23), A46 4 Sep (22), A47 6 Sep (25),
B108 30 Sep (13), A31 1 Okt (22).

## Kenapa ini penting, bukan sekadar catatan rapi

Seluruh 208 telur ada di **satu inkubator yang sama**. Tray adalah satu-satunya hal yang
memisahkan telur induk A dari telur induk B. Begitu bayinya keluar, telur tanpa tray tidak punya
cara lagi dihubungkan ke induknya — dan silsilah yang hilang **tidak bisa dipulihkan belakangan**.

Menetas pertama diperkirakan **31 Oktober — 29 hari lagi.**

Dan ini menyambung langsung ke pertanyaan yang sedang dikerjakan: aplikasi ini sedang dipakai
untuk menjawab *"betina mana dari 73 yang produktif"*. Jawaban itu dibangun dari catatan induk
per clutch. Telur yang sampai ke penetasan tanpa tray memutus rantainya tepat di langkah
terakhir — tepat ketika hasilnya seharusnya terbukti.

Tray 8 lebih buruk lagi: bukan sekadar hilang, melainkan **tercampur**. 23 telur C23 dan 17 telur
C22 di satu tray. Saat menetas, 40 bayi akan punya dua kemungkinan induk tanpa cara memilah.

## Yang dikerjakan

`PeringatanTray` di halaman Breeding, memuat keadaannya apa adanya: clutch mana yang kosong
traynya (dengan jumlah butirnya), tray mana yang dipakai lebih dari satu induk, dan tautan
langsung ke tiap clutch untuk mengisinya.

Kartunya **diam sendiri** begitu semua clutch punya tray yang tidak bentrok — jadi ia tidak
menjadi peringatan abadi yang berhenti dibaca.

Traynya TIDAK saya isi sendiri. Telur mana ada di tray mana adalah pengetahuan lapangan; menebak
berarti membuat silsilah palsu, yang lebih buruk daripada silsilah kosong karena ia terlihat
benar.

## Penjaga

`cek-ronda` menguji keadaan nyata ini sebagai kasus: 6 clutch tanpa tray, 127 butir, tray 8
bentrok, dan clutch yang sudah **selesai** tidak boleh ikut diperingatkan.

Regresi dibuktikan merah dengan melepas saringan clutch aktif — cacat yang paling mudah terjadi
di sini, karena tanpa saringan itu peringatannya akan memuat clutch lama yang sudah menetas dan
pelan-pelan berhenti dipercaya:

```
clutchTanpaTray: dapat 7 clutch, seharusnya 6 (clutch selesai tidak ikut)
clutchTanpaTray: jumlah butirnya 151, seharusnya 127
clutchTanpaTray: clutch yang sudah selesai ikut diperingatkan
```

81 komponen render bersih di layar 360px, termasuk kartu ini pada keadaan nyata DAN pada keadaan
sudah-beres (yang harus diam).
