# `is_complete` yang bisa berisi tanggal

**4 Oktober 2026** · Edit Profil · diperbaiki

---

## Temuan

`EditProfilePage` menghitung penanda "profil sudah lengkap" begini:

```js
const isComplete = formData.is_complete === true || (
  formData.hp_whatsapp && formData.join_date
);
updateMutation.mutate({ ...formData, is_complete: isComplete });
```

Dalam JavaScript `a || b` **tidak** mengembalikan true/false — ia
mengembalikan salah satu operandnya. Bila bagian pertama salah dan dua
sisanya terisi, nilainya adalah `formData.join_date` sendiri: sebuah teks
`"2026-05-01"`, masuk ke kolom yang skemanya `boolean`.

Itu tidak akan pernah muncul sebagai error, karena **semua** pembacanya
memakai perbandingan ketat:

| Berkas | Baris |
|---|---|
| `IncompleteProfileBanner.jsx` | `profile?.is_complete === true` |
| `AppLayout.jsx` | `profile?.is_complete === true` |
| `getBestProfile.js` | `p.is_complete === true` |
| `profilUser.js` | `p.is_complete === true` |
| `userProfileUpsert.js` | `p.is_complete === true` |

`"2026-05-01"` tidak sama dengan `true` di satu pun dari lima tempat itu.
Orangnya menekan Simpan, melihat **"Profil berhasil diperbarui ✅"**, dan
spanduk *"profil belum lengkap"* tetap menempel — tanpa satu pun error, dan
tanpa cara menebak kenapa.

## Siapa yang terkena

**Belum ada.** Kedelapan profil yang ada hari ini sudah `is_complete: true`,
jadi cabang pertama selalu menang dan cabang yang rusak tidak pernah jalan.

Yang akan terkena adalah **karyawan baru** yang melewati layar setup lalu
melengkapi profilnya lewat Edit Profil. Kepala feeder terakhir bergabung
9 September 2026; perekrutan berikutnya akan menempuh jalur itu.

Perbaikannya satu kata: `Boolean(...)`.

## Temuan kecil di layar yang sama

Kotak No. HP membaca `formData.hp_whatsapp || formData.phone`. `phone` bukan
kolom UserProfile — skemanya tidak punya, dan nol dari delapan baris
memilikinya. Cadangan yang tidak pernah berisi apa pun, dibuang.

## Penjaganya, dan dua kali ia harus dibuang

Penjaga baru `cek-boolean.mjs` menolak nilai `&&` / `||` untuk kolom boolean.
Membuatnya tidak langsung jadi, dan prosesnya layak dicatat:

**Versi pertama** hanya memeriksa payload yang ditulis langsung ke
`entities.X.create({...})`. Dijalankan terhadap cacat yang melahirkannya, ia
**hijau** — karena tulisannya lewat dua lompatan: `EditProfilePage` memanggil
`updateMutation.mutate(...)`, dan `userProfileUpsert.js`-lah yang memanggil
`UserProfile.update()`. Nama entity-nya ada di berkas lain. Penjaga yang
tidak menangkap cacat yang melahirkannya bukan penjaga.

**Versi kedua** mencari berdasarkan nama kolom di seluruh objek literal, dan
menghasilkan **26 tuduhan yang 26-nya palsu** — termasuk `t.require_photo ||
false` yang baik-baik saja, dan sebuah kamus label (`is_currently_sick:
"Status Sakit"`) yang bukan payload sama sekali.

**Versi ketiga** memakai skema untuk membedakan keduanya: operand
`t.require_photo` dianggap boolean karena `require_photo` memang kolom
boolean; `formData.join_date` tidak, karena skema menyebutnya tanggal. Dan
penjaganya hanya mengurus satu jebakan — ekspresi tanpa `&&`/`||`/`??` di
tingkat terluar sengaja dilewati, karena memeriksanya berarti menebak tipe
setiap ekspresi JavaScript.

Hasilnya: **313 penulisan diperiksa, nol tuduhan palsu**, 24 nilai dari
variabel yang tidak ketemu deklarasinya dilaporkan apa adanya sebagai *tidak
terperiksa* — bukan disamarkan jadi jaminan. Diuji merah terhadap cacat
aslinya, dan ia menunjuk berkas dan nomor baris yang tepat.

Satu temuan sampingan dari versi kedua yang ternyata **bukan** cacat:
`is_repeat_buyer: (existingBuyer.total_purchases || 0) + 1 > 1` di
`SaleWizard`. `||`-nya ada di dalam kurung; operator terluarnya `>`, jadi
hasilnya memang boolean. Versi ketiga tidak lagi menuduhnya.

## Hasil

23 penjaga hijau (naik satu), `npx vite build` lolos. Tidak ada data
historis yang diubah.
