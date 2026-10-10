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
# Cara MEMERIKSA apakah sebuah fungsi terpasang — aman, tanpa menjalankannya
# sampai menulis, tetapi tetap MENYENTUH handler-nya:
#
#   curl -s -o /dev/null -w "%{http_code}" -X HEAD \
#     "https://base44.app/api/apps/$BASE44_APP_ID/functions/<nama>"
#
#   404 = tidak terpasang.   Selain itu = terpasang.
#
# JANGAN menyapu seluruh daftar fungsi dengan POST untuk memeriksanya. Banyak
# fungsi tidak punya penjaga `auth.me()` di awal — mereka memang dipanggil
# penjadwal, bukan orang — jadi POST kosong BENAR-BENAR MENJALANKANNYA.
# Sapuan seperti itu pada 10 Okt 2026 membuat `higieneData` mengirim 4
# notifikasi "1 alarm tidak bisa berbunyi, 18 kelompok kembar" di luar
# jadwalnya. Hanya itu yang terjadi — Attendance, IncidentalTask,
# StockMovement, ShoppingList, DailyChecklist, SOPTask, OvertimeLog dan
# WarehouseItem diperiksa, tidak satu pun berubah — tetapi lain kali bisa
# lebih mahal.
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
# Itu yang dipakai memasang `bayarInisiatifSurut` pada 10 Okt 2026. Ia
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
