# Tombol bayar surut tidak punya ujung atas — sekarang punya

**7 Oktober 2026** · lanjutan dari *Empat pekerjaan masuk checklist, dan 210
catatan dibayarkan surut*

---

## Yang ditemukan sesudah publish

Aplikasinya sudah terpublish; tombolnya belum ditekan. Saya memeriksa datanya
lagi untuk memastikan jumlahnya masih benar, dan jumlahnya **sudah tidak 210**:

```
catatan Inisiatif "pending" sejak 28 Juli  →  212
```

Dua yang baru itu dicatat **hari ini**: "Pakan adabra" pukul 09.05 dan "Cari
rumput" pukul 11.33. Besok akan ada dua lagi, dan seterusnya.

Saringan tombolnya hanya punya **ujung bawah** — 28 Juli. Yang dibayarnya
adalah "semua yang masih pending", dan itu sama dengan 210 **hanya pada hari
tombolnya dibuat**. Ditekan lusa, ia membayar 214. Ditekan minggu depan, 220-an.

## Kenapa itu salah, bukan sekadar lebih banyak

Dua akibatnya terpisah, dan keduanya salah.

**Pertama: ia mendahului penilaian Anda.** Layar penilaian Inisiatif sekarang
berfungsi — itu yang dibetulkan kemarin. Catatan yang masuk mulai hari ini
seharusnya Anda nilai sendiri: 5 poin kalau memang pantas 5, lebih kalau
pekerjaannya besar, nol kalau tidak perlu dibayar. Tombol ini akan menilainya
rata 5 lebih dulu, tanpa Anda pernah melihatnya. Pembayaran surut gunanya
memulihkan masa ketika tidak ada yang bisa menilai; ia tidak ada gunanya untuk
hari ketika Anda bisa.

**Kedua — dan ini yang membuat uangnya keluar dua kali:** keempat pekerjaan itu
**sudah punya barisnya sendiri di checklist sejak pagi ini**. Dua kiper itu
belum memakainya; keduanya masih menekan tombol Inisiatif seperti tiga bulan
terakhir. Jadi pekerjaan yang sama ada di dua tempat pada hari yang sama:

| | |
|---|---|
| baris SOP | "Cari rumput untuk pakan" — 5 poin, begitu dicentang |
| catatan Inisiatif | "Cari rumput" — dibayar 5 oleh tombol surut |

**Uji dobel-bayar yang sudah ada tidak menangkapnya.** Ujinya exact — judul
yang sama persis sesudah dinormalkan — dan itu memang disengaja: untuk uang,
"mirip" bukan bukti. Tetapi "Cari rumput" bukan "Cari rumput untuk pakan".
Penjaga yang satu-satunya mencegah bayar dua kali justru buta pada kasus yang
baru saya buat sendiri kemarin, dengan memberi pekerjaan itu judul yang lebih
lengkap.

## Yang diubah

Jendelanya sekarang **berujung dua-duanya: 28 Juli – 6 Oktober 2026.**

- **28 Juli** — hari `||` menjadi `??` dan nilai Inisiatif menjadi nol.
- **6 Oktober** — hari terakhir sebelum layar penilaian berfungsi dan sebelum
  keempat pekerjaan itu punya barisnya sendiri.

Di dalam jendela itu ada **tepat 210 catatan** — semuanya milik dua kiper, tidak
ada satu pun data uji, tidak ada yang dikecualikan dari laporan. Angka yang
Anda setujui sekarang menjadi angka yang dihitung ulang oleh batasnya, bukan
angka yang kebetulan sama pada hari tertentu. Laporan keringnya akan menyebut
"210 catatan diperiksa, 2026-07-28 sampai 2026-10-06"; kalau nanti ia menyebut
angka lain, ada yang perlu dilihat dulu sebelum ditekan.

Keputusan "siapa yang ikut dibayar" dipindahkan ke `shared/bayarSurut.ts`,
bersebelahan dengan hitungan "berapa". Keduanya setara menentukannya, jadi
keduanya ada di tempat yang bisa diuji tanpa jaringan.

## Dua catatan hari ini: jadi bagaimana?

Tidak dibayar oleh tombol, dan itu disengaja — **Anda** yang menilainya, di
layar Inisiatif. Dan di sana Anda akan diberi tahu:

> ⚠ mirip tugas checklist **"Pakan adabra (Aldabra) — pagi"** (5 poin)

Pencocok kemiripan itu sudah ada sejak kemarin; yang saya periksa sekarang
adalah apakah ia benar-benar mengenali keempat tugas baru dari tulisan kiper
yang sebenarnya. Enam bentuk tulisan nyata, keenamnya kena:

| Yang ditulis kiper | Dikenali sebagai | Skor |
|---|---|---|
| Cari rumput | Cari rumput untuk pakan | 0,67 |
| Cari pakan | Cari rumput untuk pakan | 0,67 |
| Pakan adabra | Pakan adabra (Aldabra) — pagi | 1,00 |
| Kasik pakan adabra | Pakan adabra (Aldabra) — pagi | 0,67 |
| Bersihkan tempat cuci rumput | (judulnya sama) | 1,00 |
| Bersihkan tempat tamu | (judulnya sama) | 1,00 |

Jadi bila kiper mencatatnya sebagai Inisiatif padahal barisnya sudah ada, Anda
melihat peringatannya sebelum memberi poin — bukan sesudah slip tercetak.

**Yang perlu Anda katakan ke kedua kiper:** mulai hari ini keempat pekerjaan itu
dicentang di daftar tugas, bukan dicatat lewat tombol Inisiatif. Poinnya sama,
5, tetapi lewat barisnya ia otomatis; lewat Inisiatif ia menunggu penilaian
Anda satu per satu.

## Penjaga

**`cek-ronda` — 14 bentuk catatan, satu-satu diputuskan ikut atau tidak:**
di dalam jendela, hari pertamanya, hari terakhirnya, sehari sebelum cacatnya,
**hari ini**, besok, yang belum punya status, yang sudah disetujui, yang sudah
ditolak, data uji, yang dikecualikan dari laporan, yang tanpa email pelaku,
yang tanpa tanggal, dan tugas SOP biasa yang bukan Inisiatif.

Diuji-merah empat kali:

| Yang dirusak | Yang berbunyi |
|---|---|
| ujung atas jendela dihapus | kasus "hari ini" dan "besok" ikut dibayar |
| `JENDELA.sampai` dikosongkan | keduanya, ditambah dua temuan tentang jendelanya sendiri |
| saringan status dihapus | yang sudah disetujui dan yang sudah ditolak ikut |
| saringan data uji dihapus | data uji dan yang dikecualikan ikut |

**`cek-ronda` — 9 pencocokan judul terhadap keempat tugas baru:** enam tulisan
kiper yang nyata harus kena, tiga pekerjaan lain tidak boleh tertuduh.
Diuji-merah dua kali: pembuangan isi tanda kurung dihapus → "Kasik pakan
adabra" lolos tanpa peringatan; ambang dinaikkan ke 0,7 → tiga dari enam
lolos. Keduanya cacat yang membuat peringatannya **diam**, bukan yang membuatnya
ramai — dan peringatan yang diam adalah uang yang keluar dua kali.

---

## Yang masih menunggu Anda

1. **Pengaturan Sistem → "Bayar poin Inisiatif surut" → Lihat dulu.** Periksa
   bahwa laporannya menyebut **210 catatan, 2026-07-28 sampai 2026-10-06**.
   Lalu **Bayarkan sekarang**.
2. Tekan **Update** pada kedua slip **September** (draft, 5.192 dan 5.275 poin).
3. Nilai **dua catatan hari ini** di layar Inisiatif — peringatan "mirip tugas
   checklist" akan muncul pada keduanya.
4. Sembilan tugas yang tidak pernah dikerjakan dalam 15 hari — mana yang mau
   dimatikan?
5. Dua transaksi ganda 4 Oktober masih perlu Anda hapus lewat `/catat-biaya`.
