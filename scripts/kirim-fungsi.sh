#!/bin/sh
# Kirim fungsi backend satu per satu, dengan pengulangan.
#
# ── BACA DULU: `git push` TIDAK MEMASANG FUNGSI (10 Okt 2026) ────────────
#
# Mendorong repo, menggabungkannya ke /app, dan membuat checkpoint TIDAK
# memasang satu pun fungsi backend. Keduanya jalur yang terpisah sama sekali.
#
# Akibatnya nyata dan mahal: `bayarInisiatifSurut` ditulis 7 Okt, didorong,
# digabung, dan di-checkpoint — lalu pemiliknya menekan tombolnya dan tidak
# terjadi apa-apa. Tiga hari dan dua ronde perbaikan dihabiskan mencari
# sebabnya di sisi layar (toast yang hilang, laporan kering yang menyesatkan),
# padahal fungsinya memang TIDAK ADA di produksi. 210 catatan Inisiatif
# tertahan selama itu.
#
# Cara MEMERIKSA apakah sebuah fungsi terpasang — TANPA menjalankannya:
#
#   GET /api/apps/{app_id}/backend-functions
#
# Ia mengembalikan setiap fungsi yang terpasang beserta KODE-nya dan otomasi
# yang memanggilnya. Itu satu-satunya cara memeriksa yang tidak menyentuh
# handler mana pun. (Lewat MCP jawabannya terpotong — 80 fungsi dengan
# sumbernya utuh — jadi yang dibaca cukup `functions[].name`.)
#
# ── JANGAN memeriksa dengan memanggil. HEAD pun MENJALANKAN (11 Okt 2026) ──
#
# Catatan di berkas ini sebelumnya menyebut HEAD "aman". ITU SALAH, dan
# dibuktikan salah: HEAD ke `higieneData` menjawab 200, lalu lognya berbunyi
#
#   2026-10-11T03:29:21  info  POST → 200
#
# "POST", untuk permintaan yang dikirim sebagai HEAD. Platformnya meneruskan
# apa pun verb-nya ke handler. Fungsi yang membaca badan permintaan jatuh ke
# `catch` dan menjawab 500 — itu yang membuat HEAD TERLIHAT tidak berbahaya —
# tetapi fungsi yang TIDAK membaca badan permintaan, yaitu semua yang memang
# dipanggil penjadwal, berjalan sampai habis. Tidak ada penjaga `auth.me()`
# di awalnya karena yang memanggilnya bukan orang.
#
# Sapuan POST pada 10 Okt membuat `higieneData` mengirim 4 notifikasi
# "1 alarm tidak bisa berbunyi, 18 kelompok kembar" di luar jadwalnya.
# HEAD pada 11 Okt menjalankannya sekali lagi; kali ini tidak menulis apa-apa
# karena deduplikasinya sendiri menahan, bukan karena HEAD-nya jinak.
#
# 404 memang berarti "tidak terpasang", dan itu benar — tetapi harganya
# adalah satu eksekusi sungguhan. Bayar harga itu hanya untuk SATU fungsi
# yang sudah diketahui aman dipanggil ulang, pernah dibaca kodenya, dan
# memang sedang diselidiki. Tidak pernah untuk mendaftar.
#
# ── Cara MEMASANG tanpa login CLI ───────────────────────────────────────
#
# Skrip ini memakai `base44 functions deploy`, yang butuh `base44 login` —
# alur device-code yang perlu orang menekan konfirmasi di browser selagi
# prosesnya masih hidup (lihat login-dan-kirim.sh; dua kali gagal karena
# sandbox-nya restart duluan).
#
# Ada jalur lain yang TIDAK butuh login itu, lewat API platform:
#
#   POST /api/apps/{app_id}/coding/redeploy-function/{function_name}
#   body: { "code": "<seluruh isi entry.ts>" }
#
# Itu yang dipakai memasang `bayarInisiatifSurut` pada 10 Okt 2026, dan
# `onMaintenanceDone` pada 11 Okt 2026 — perbaikan `tandaLaporan` 7 Okt ikut
# terkubur jalur yang sama, dan baru hidup setelah dipasang lewat endpoint
# ini. Sebelum mengirim, SELALU transkripsikan ke berkas lalu `diff` terhadap
# entry.ts aslinya: badan permintaannya diketik ulang, dan satu tanda `!`
# yang hilang tetap bisa dikompilasi. `md5sum` keduanya harus sama. Ia
# menunggu kompilasinya selesai dan mengembalikan diagnostik kompiler bila
# kodenya tidak bisa dibangun, jadi jawaban sukses berarti benar-benar
# terpasang. Impor `../../shared/*.ts` tetap bekerja seperti biasa.
#
# Platform Base44 hanya mengizinkan satu deployment berjalan pada satu waktu.
# Kalau app sedang membangun ulang situs, semua deploy fungsi ditolak dengan
# "Another deployment is in progress" — bukan galat kode, hanya perlu ditunggu.
# Skrip ini menunggu dan mencoba lagi, bukan menyerah.
#
# Pakai:  sh scripts/kirim-fungsi.sh "nama1 nama2 ..."   > log 2>&1
set -u
export BASE44_APP_ID=6a049ab09b675bf4682f922f
cd /app || exit 1

DAFTAR="$1"
COBA_MAKS=25
JEDA=20

sukses=0
gagal=""
for f in $DAFTAR; do
  n=1
  while [ "$n" -le "$COBA_MAKS" ]; do
    keluaran=$(base44 functions deploy "$f" 2>&1)
    if printf '%s' "$keluaran" | grep -qi "Another deployment is in progress"; then
      printf '%s  tunggu (percobaan %s)\n' "$f" "$n"
      sleep "$JEDA"
      n=$((n + 1))
      continue
    fi
    if printf '%s' "$keluaran" | grep -qiE "error|failed"; then
      printf 'GAGAL %s\n%s\n' "$f" "$keluaran"
      gagal="$gagal $f"
    else
      printf 'OK    %s\n' "$f"
      sukses=$((sukses + 1))
    fi
    break
  done
  if [ "$n" -gt "$COBA_MAKS" ]; then
    printf 'GAGAL %s (habis percobaan)\n' "$f"
    gagal="$gagal $f"
  fi
done

printf '\n=== RINGKAS ===\nsukses=%s\ngagal=%s\n' "$sukses" "$gagal"
printf 'KIRIM_SELESAI\n'
