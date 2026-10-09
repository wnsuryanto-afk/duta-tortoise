# Dipotret, lalu dipangkas: 8.371 huruf jadi 2.516

**9 Oktober 2026** · lanjutan dari *72 betina yang belum bertelur*

Pemilik: *"Harapan saya, tampilannya lebih sederhana dan informatif, dengan
tulisan yang tidak terlalu banyak di modul breeding tadi. Coba cek secara
menyeluruh juga bagian mana yang kira-kira bisa diperbaiki."*

---

## 1. Saya potret dulu, baru menilai

Tab "Naikkan produksi" digambar di peramban sungguhan pada lebar telepon
(390px) dan diukur:

| | Sebelum | Sesudah |
|---|---|---|
| Huruf di layar | **8.371** | **2.516** (−70%) |
| Baris teks | 190 | 96 |
| Tinggi halaman | 5.457px = **6,1 layar** | 2.375px = **2,6 layar** |

Tiga hal yang kelihatan begitu dipotret, dan tidak kelihatan dari membaca kode:

**Satu fakta ditulis tiga sampai empat kali.** Baris C14 berbunyi: lencana
"berhenti bertelur", lalu kalimat "Berhenti — 207 hari sejak terakhir, padahal
jaraknya biasanya 28 hari", lalu angka besar "207 hr", lalu sekali lagi di
ringkasan bawah kartu.

**Angka yang paling besar bukan angka yang paling dibutuhkan.** Yang tercetak
besar adalah tanggal ("21 Okt 2026"), sementara "Perkiraan 19 hari lagi"
disembunyikan di teks abu-abu kecil. Tanggal menjawab *kapan*; sisa hari
menjawab *apakah ini urusan saya hari ini* — dan itu pertanyaan yang lebih
dulu.

**Judul kolom dicetak di setiap baris.** Bagian kandang menulis "betina pernah
bertelur" **enam belas kali** berturut-turut, dan setiap baris antrean membawa
kalimat "Atau bertelur tanpa tercatat…" — **tujuh puluh kali** untuk kalimat
yang sama persis, yang sudah ada juga di kaki kartunya.

## 2. Aturan yang dipakai memangkasnya

**Satu fakta ditulis sekali, di tempat yang paling mudah dipindai.**

- **Angka terbesar = sisa hari.** "19" besar, "hr lagi" kecil; tanggal
  jendelanya di bawahnya dengan huruf kecil, tanpa tahun.
- **Yang berulang naik jadi judul kolom.** Bagian kandang sekarang **tabel**,
  bukan enam belas kartu: `Kandang | Bertelur | Jantan dewasa`. Begitu juga
  usulan susunan jantan, yang tadinya tujuh paragraf.
- **Kalimat yang berlaku untuk semua baris turun ke kaki bagian.** "Mungkin
  bertelur tanpa tercatat" ditulis sekali. Ia tetap melekat pada tiap baris di
  dalam `diagnosaInduk.js` — penjaganya memeriksanya di sana — hanya tidak
  digambar tujuh puluh kali.
- **Kalimat panjang pindah ke tooltip.** Baris hitung mundur menampilkan tag
  pendek "jarak sendiri" / "median kebun"; kalimat lengkapnya muncul saat
  disentuh. Alasannya tidak hilang, hanya tidak lagi memenuhi layar.
- **Yang tersirat tidak ditulis.** Kalau sebuah kandang tidak punya jantan
  dewasa, tentu saja ia belum pernah menghasilkan. Enam baris E1 dulu memuat
  kedua kalimat itu; sekarang satu.

Lencana "menunggu" dibuang seluruhnya — angkanya sudah mengatakannya.

## 3. Dua cacat yang hanya terlihat setelah digambar

**Kalimat yang dipecah jadi kolom-kolom.** Peringatan "14 jantan tanpa tujuan"
dibungkus `<p className="flex items-start gap-1.5">` bersama `<b>` di tengah
kalimat. Flex menjadikan **tiap potongan teks satu item**, jadi kalimatnya
tergambar sebagai kolom sempit bertumpuk: *Sesudah / semua / kandang / tanpa /
jantan / terisi,* ke bawah. Tidak ada yang terpotong, jadi penjaga lebar tidak
melihatnya — tetapi kalimatnya tidak bisa dibaca.

**Tag sumber terpotong.** Versi pertama pemangkasan memberi baris keterangan
`truncate`, dan yang terpotong duluan justru ujungnya: "median ke…", "jarak
sendiri…". Padahal tag itulah yang menjawab seberapa boleh dipercaya angkanya.
`truncate` dilepas dan kata-katanya dipendekkan sampai muat.

## 4. Sapuan menyeluruh: 122 layar diukur satu per satu

Setiap layar di harness digambar di 390px dan dihitung hurufnya. Yang terbanyak:

| Huruf | Layar telepon | Halaman |
|---|---|---|
| **8.371** | **11,5** | **Otomatisasi** |
| 4.153 | 5,0 | Pengaturan Sistem |
| 3.382 | 3,5 | Panduan Pakan |
| 2.945 | 4,3 | Pengaturan WhatsApp |
| 1.445 | 1,6 | Printer |

Rata-rata seluruh aplikasi 382 huruf per layar — jadi Otomatisasi dua puluh
kali lipatnya, dan itu pada keadaan **tanpa data**; dengan data ia lebih
panjang lagi.

**Dan ia mengidap cacat yang sama persis.** Kalimat *"Memanggil fungsinya
sekali dan menampilkan jawabannya apa adanya"* berdiri di samping **sembilan
belas** tombol "Uji sekarang" — penjelasan tombol yang sama untuk semua tombol.
Ditambah label "Jadwal disarankan:" yang diulang sembilan belas kali di sebelah
ikon jam yang sudah mengatakan hal yang sama.

Keduanya dipangkas: kalimat tombol naik sekali ke kepala halaman, label jadwal
dibuang. **8.371 → 6.857 huruf.** Sisanya keterangan tiap otomatisasi, yang
memang berbeda-beda dan memang perlu ada.

Tiga halaman lain di tabel itu belum saya sentuh — sebutkan kalau mau
dilanjutkan.

## 5. Penjaga: dua pemeriksaan baru di `cek-lebar`

Keduanya objektif, dan keduanya menangkap cacat yang benar-benar terjadi hari
ini.

**Kalimat yang sama berulang.** Satu baris teks identik, panjangnya minimal 25
huruf, muncul empat kali atau lebih di satu layar. Nama kura yang berulang
tidak kena — terlalu pendek. Diuji-merah dengan mengembalikan kalimat tombol ke
tiap kartu Otomatisasi: berbunyi, `19×`.

**Kalimat yang dipecah flex.** Wadah flex mendatar yang memuat **dua potongan
teks telanjang atau lebih**. Diuji-merah dengan mengembalikan bentuk `<p
className="flex">teks <b>…</b> teks</p>`: berbunyi, "dipecah jadi 4 kolom".

**Versi pertama pemeriksaan kedua terlalu longgar dan langsung berbunyi 40-an
kali** untuk `<h3 className="flex items-center gap-2"><Icon/> Judul</h3>` —
ikon di samping label, idiom yang benar dan tergambar persis seperti yang
dimaksud. Satu potongan teks di samping satu ikon memang duduk berdampingan;
itu gunanya flex. Yang merusak kalimat adalah potongan teks **kedua**.
Syaratnya dinaikkan ke dua, dan temuan palsunya hilang tanpa kehilangan yang
asli.

## 6. Yang paling penting dari semuanya

**Tab "Naikkan produksi" sama sekali tidak ada di daftar kasus render.**

Saya membangunnya kemarin dan tidak satu pun penjaga pernah menggambarnya.
Tulisan terpotong, kalimat berulang, kalimat dipecah flex — ketiganya hanya
terlihat sesudah komponennya benar-benar digambar. Cacat flex itu hidup di
cabang ini seharian tanpa satu pun penjaga menyadarinya, dan yang menemukannya
akhirnya bukan penjaga melainkan pemiliknya sendiri yang melihat layarnya.

Sekarang ia dua kasus di daftar: **kosong dan dengan isi**. Yang kosong saja
tidak cukup — kalimat yang berulang hanya muncul kalau barisnya banyak. Isinya
dibuat sebentuk data nyata: kandang satu jantan yang berproduksi, kandang tiga
jantan yang nol, kandang tanpa jantan dewasa, indukan yang berhenti, dan betina
yang baru datang. Daftar kasus naik dari 122 ke 124.

---

**Pemeriksaan akhir:** 27 penjaga lolos, eslint 0 error / 101 peringatan,
`npx vite build` selesai tanpa galat.

## Yang masih menunggu Anda

1. Publish.
2. **Bayar poin Inisiatif surut** — 210 catatan, 28 Juli – 6 Oktober. Lalu
   **Update** pada kedua slip September.
3. Minggu ini: **C22** (3 hari lagi) dan **A47** (sudah di dalam jendela).
4. Periksa **C24** dan **C14** — indukan terbukti yang berhenti 6–7 bulan.
5. Pindahkan satu jantan dewasa ke **E1** (usul: B10).
6. Sembilan tugas mati mana yang dihapus, dan dua transaksi ganda 4 Oktober.
7. Sebutkan kalau tiga halaman panjang lain (Pengaturan Sistem, Panduan Pakan,
   Pengaturan WhatsApp) mau ikut dipangkas.
