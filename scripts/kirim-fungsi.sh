#!/bin/sh
# Kirim fungsi backend satu per satu, dengan pengulangan.
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
