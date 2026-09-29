# "Kenapa Breeding Planner penting?" — pertanyaan yang jawabannya: tidak

**Pertanyaan pemilik, 29 September 2026:** *"Breeding planner masih belum bisa
maksimal, karena di setiap kandang sudah otomatis dipasangkan. Fungsi dari
breeding planner saya masih belum mengerti kenapa penting. Apakah perlu fungsi
khusus supaya kita tahu histori kawinnya? Supaya bisa memaksimalkan produksi."*

**Tidak ada data yang diubah.**

---

## Pengamatannya benar, dan itu bukan soal kecil

Halaman itu dibangun di sekitar satu gagasan: pemilik **memilih pasangan** mana
yang dikawinkan, lalu aplikasi memberi peringkat pasangan terbaik dan
mengingatkan betina yang belum dikawinkan.

Kebun ini tidak bekerja begitu. Yang menentukan siapa kawin dengan siapa bukan
sebuah rencana, melainkan **siapa tinggal di kandang mana**. Selama kandangnya
tidak diubah, tidak ada yang perlu direncanakan — jadi wajar kalau halaman
perencana terasa tidak ada gunanya. Ia memang tidak punya pekerjaan.

---

## Tiga hal yang ditemukan saat memeriksanya

### 1. Peringatannya palsu — semuanya, setiap hari

Peringatan *"X belum kawin sejak belum pernah — musim kawin mungkin terlewat"*
membaca kolom `Breeding.mating_date`. Kolom itu **kosong di seluruh sepuluh
catatan** yang pernah dibuat. Akibatnya setiap betina aktif lolos saringan, dan
halaman itu membuka dengan **89 baris peringatan kuning yang semuanya tidak
benar**.

### 2. Peringkatnya memeringkat tebakan sebagai fakta

| | |
|---|---|
| kura dewasa aktif | **120** — 31 jantan, 89 betina, di 16 kandang |
| kandang berisi **tepat satu** jantan | **10** → ayah anaknya pasti |
| kandang berisi **lebih dari satu** | **6** → ayah anaknya tidak bisa dipastikan |
| kandang N sendirian | **11 jantan, 17 betina** |

Untuk **47 dari 89 betina**, menuliskan nama seekor jantan sebagai ayah adalah
tebakan. Dari sepuluh catatan bertelur yang ada:

- **6** ayahnya pasti (kandangnya berisi satu jantan)
- **3** menyebut **A35**, padahal A35 tinggal di kandang N bersama sepuluh
  jantan lain
- **1** menyebut A29 × C14, padahal A29 di kandang E4 dan C14 di E5 — tidak
  sekandang sama sekali

"Ranking Pasangan Terbaik" memeringkat ketiganya seolah-olah fakta.

### 3. Inilah pertanyaan produksinya, dan tidak ada layar yang menanyakannya

**Dari 89 betina dewasa aktif, hanya DELAPAN yang punya catatan bertelur.**

Setelah menyaring yang belum cukup umur, tersisa **82 betina cukup umur**, dan
**74 di antaranya tidak punya satu catatan bertelur pun**.

Entah mereka memang tidak bertelur — dan itu masalah produksi yang besar — atau
bertelur tanpa pernah dicatat, dan itu masalah pencatatan. Keduanya perlu
tindakan yang berbeda, dan tidak ada satu pun layar yang membedakannya.

---

## Batas umur diambil dari kebun ini sendiri, bukan dari buku

Menagih betina berumur dua tahun karena "belum bertelur" hanya akan membuat
daftarnya diabaikan. Tapi batas umur dewasa kawin **tidak diambil dari buku**:
ia dihitung dari umur termuda yang pernah bertelur menurut catatan kebun ini —
**A48, sekitar 6,4 tahun**. Batas itu memperbaiki dirinya sendiri setiap ada
catatan baru.

---

## "Histori kawin" yang ditanyakan itu SUDAH ADA

Pertanyaan pemilik menyebut "fungsi khusus supaya kita tahu histori kawinnya".
Fungsi itu sudah dibangun lengkap:

| Bagian | Keadaan |
|---|---|
| entity `Perkawinan` | ada, dengan tanggal, kandang, foto, dan penghubung ke clutch |
| tombol **Catat Kawin** | ada, di halaman Breeding & Telur |
| **Daftar Pasangan** | ada, di halaman yang sama |
| isinya | **nol catatan** |
| dibaca Breeding Planner? | **tidak, sama sekali** |

Jadi yang kurang bukan fungsinya. Yang kurang adalah sesuatu yang mengingatkan
bahwa ia ada — pola yang sudah berulang di aplikasi ini: alat selesai, data
tidak pernah masuk.

---

## Yang dikerjakan

Isi halaman diganti; **alamatnya tidak**, supaya tautan dan menu tetap bekerja.

1. **Produksi per betina** — satu baris per betina dewasa: umur, kandang,
   terakhir bertelur, sudah berapa lama diam, berapa clutch, berapa telur,
   berapa persen menetas. Yang belum pernah tercatat naik ke atas, karena
   itulah pertanyaan terbesarnya.
2. **Susunan jantan per kandang** — di sistem kandang, inilah satu-satunya
   keputusan perkawinan yang benar-benar diambil manusia. Kandang bertanda
   *tidak terlacak* adalah yang membuat keturunannya tidak bisa ditelusuri.
3. **Catatan bertelur & kepastian ayahnya** — nama yang tercatat dibandingkan
   dengan susunan kandang sekarang, dan halaman ini **tidak pernah mengusulkan
   ayah pengganti**. Riwayat pemindahan baru tercatat sejak 27 September 2026,
   jadi susunan pada saat bertelur tidak bisa direkonstruksi; mengatakan
   "ayahnya C2" pada clutch bulan Maret hanya karena C2 satu-satunya jantan di
   kandang induknya hari ini akan mengulang persis kesalahan yang sedang
   diperbaiki.
4. **Penagih histori kawin** — kartu yang menyebutkan bahwa pencatat kawin
   sudah ada dan isinya nol, dengan tautan langsung ke tempat mencatatnya.
5. **Kalender dipertahankan** — itu bagian yang memang berguna, dan sekarang
   ikut menampilkan catatan `Perkawinan` begitu ada isinya.
6. **Ranking Indukan** tidak dihapus, tetapi berhenti diam: di atasnya kini ada
   keterangan berapa catatan yang ayahnya tidak bisa diperiksa, dengan tautan
   ke kandang penyebabnya.

---

## Jawaban singkat untuk pertanyaan pemilik

**Apakah perlu fungsi khusus untuk histori kawin?** Fungsinya sudah ada dan
belum pernah dipakai. Yang perlu bukan membangunnya lagi, melainkan mengisinya
— dan sekarang ada yang menagih.

**Apa yang benar-benar memaksimalkan produksi?** Dua keputusan, dan keduanya
sekarang punya layarnya:

1. **74 betina cukup umur tanpa catatan bertelur.** Cari tahu mana yang memang
   tidak bertelur dan mana yang cuma tidak tercatat. Itu angka terbesar di
   seluruh aplikasi ini.
2. **Kandang N: 11 jantan untuk 17 betina.** Memindahkan jantan adalah satu-
   satunya keputusan perkawinan yang benar-benar diambil manusia di sistem
   kandang — dan susunan sekarang membuat keturunan 47 betina tidak bisa
   ditelusuri sama sekali.

---

## Yang diuji

22 uji pada pustaka barunya (`lib/produksiBetina.js`) memakai data nyata kebun,
semuanya lulus. Di antaranya:

| Uji | Hasil |
|---|---|
| 89 betina dewasa aktif, 8 punya catatan, 81 tidak | lulus |
| umur termuda pernah bertelur ≈ 6,4 tahun | lulus |
| 47 betina ayahnya tidak pasti, 42 pasti | lulus |
| kandang N terbaca 11 jantan / 17 betina, tidak terlacak | lulus |
| 6 kandang tidak terlacak, 10 terlacak | lulus |
| hatch rate hanya dari clutch yang **sudah selesai** menetas | lulus |
| clutch yang masih dierami → hatch rate `null`, bukan 0 | lulus |
| betina yang belum pernah bertelur → `hariDiam` `null`, bukan angka besar | lulus |
| clutch A29×C14 terbaca "nama tercatat asing di kandang induk" | lulus |

Dua yang terakhir disengaja: kalau "belum pernah" dan "sudah lama" dipaksa jadi
satu angka, keduanya berhenti bisa dibedakan — persis kesalahan yang membuat
peringatan lama menyala 89 kali.
