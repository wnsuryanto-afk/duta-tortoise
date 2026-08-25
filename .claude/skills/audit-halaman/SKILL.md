---
name: audit-halaman
description: Memeriksa konsistensi sebuah halaman Duta Tortoise — rute, navigasi, hak akses per role, dan penanganan data — tanpa membaca seluruh file besar. Gunakan saat diminta mengecek kenapa halaman tidak muncul, salah hak akses, atau sebelum menyerahkan fitur.
---

# Audit satu halaman

Dipakai saat sebuah halaman "tidak muncul", "keeper masih bisa hapus", atau
sebelum menyatakan sebuah fitur selesai. Jalankan pemeriksaan ini **dengan
grep bertarget**, jangan membaca file 40 KB secara penuh.

## 1. Kumpulkan identitasnya

Diberi nama halaman atau path, cari `section` id-nya:

```bash
grep -n "<path>" src/lib/navigation.js
```

Catat `path`, `section`, dan area tempatnya berada.

## 2. Periksa empat titik sambung

```bash
# a. Rute terdaftar?
grep -n "path=\"<path>\"" src/App.jsx

# b. Ada di navigasi?
grep -n "section: \"<section>\"" src/lib/navigation.js

# c. Role mana yang melihat menunya?
grep -n "\"<section>\"" src/lib/permissions.js

# d. Halaman benar-benar memakai hak aksesnya?
grep -n "getPerms\|perms\." src/pages/<File>.jsx
```

Temuan yang umum:

- Ada di `navigation.js` tapi tidak di `NAV_ACCESS` → menu tidak muncul untuk
  siapa pun.
- Ada di `NAV_ACCESS` tapi tidak di `PAGE_PERMISSIONS` → semua aksi jatuh ke
  fallback semua-`false`, tombol tambah/edit hilang diam-diam.
- Halaman memanggil `getPerms` tapi hasilnya tidak dipakai untuk
  menyembunyikan tombol → user tanpa hak tetap bisa menekan aksi.
- `section` di `navigation.js` berbeda ejaan dengan yang di `permissions.js`.

## 3. Periksa penanganan data

```bash
grep -n "base44.entities\|useQuery\|invalidateQueries" src/pages/<File>.jsx
```

- Setiap `create`/`update`/`delete` harus diikuti `invalidateQueries`,
  kalau tidak layar tidak ikut ter-update.
- `useQuery` sebaiknya punya nilai awal (`data = []`) supaya render pertama
  tidak error.

## 4. Verifikasi

```bash
npm run lint && npm run build
```

## Bentuk laporan

Laporkan ringkas dalam bentuk tabel: untuk tiap role — apakah menu terlihat,
dan aksi apa yang dimiliki. Lalu daftar temuan yang perlu diperbaiki, dari
yang paling berdampak. Sebut file dan nomor barisnya.
