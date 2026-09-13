#!/bin/sh
# login-dan-kirim.sh — login sekali, lalu langsung kirim tanpa menunggu siapa pun.
#
# ── KENAPA DIGABUNG JADI SATU SKRIP ──────────────────────────────────
#
# Alur device-code Base44 menukar konfirmasi di browser dengan token LEWAT
# PROSES `base44 login` YANG MASIH HIDUP. Kalau proses itu mati sebelum orang
# menekan konfirmasi, konfirmasinya terbuang — dan sandbox ini sudah restart
# tiga kali di tengah jalan (6 Sep, 10 Sep, 13 Sep), tiap kali menghapus /tmp
# beserta prosesnya.
#
# Dua kali Pak Iwan sudah login dan dua kali tokennya tidak pernah sampai.
# Itu bukan kesalahan beliau; itu jarak antara "login" dan "dipakai" yang
# terlalu panjang karena bergantung pada saya dipanggil kembali di saat yang
# tepat.
#
# Skrip ini menutup jarak itu: login, tunggu, lalu kirim sendiri.
#
# Pakai:  setsid nohup sh scripts/login-dan-kirim.sh > /tmp/kirim.log 2>&1 &
#         lalu baca kodenya:  grep "Verification code" /tmp/kirim.log
set -u
export BASE44_APP_ID=6a049ab09b675bf4682f922f
cd /app || exit 1

FUNGSI="bacaLeadSupplier autoNotifications"
COBA_MAKS=25
JEDA=20

echo "=== 1/3 LOGIN ==="
base44 login 2>&1 &
LOGIN_PID=$!

# Tunggu sampai token benar-benar tersimpan, bukan sampai prosesnya keluar.
n=0
while [ "$n" -lt 90 ]; do
  if [ -f /root/.base44/auth/auth.json ]; then
    echo "TOKEN_TERSIMPAN"
    break
  fi
  sleep 10
  n=$((n + 1))
done

if [ ! -f /root/.base44/auth/auth.json ]; then
  echo "GAGAL: token tidak pernah tersimpan dalam 15 menit."
  kill "$LOGIN_PID" 2>/dev/null
  echo "KIRIM_SELESAI"
  exit 1
fi

echo ""
echo "=== 2/3 KIRIM ENTITAS ==="
# SupplierLead adalah tabel baru; tanpa ini fungsi dan layarnya menulis ke
# tabel yang belum ada.
n=1
while [ "$n" -le "$COBA_MAKS" ]; do
  keluaran=$(base44 entities push 2>&1)
  if printf '%s' "$keluaran" | grep -qi "Another deployment is in progress"; then
    echo "entitas  tunggu ($n)"; sleep "$JEDA"; n=$((n + 1)); continue
  fi
  printf '%s\n' "$keluaran" | tail -5
  break
done

echo ""
echo "=== 3/3 KIRIM FUNGSI ==="
gagal=""
for f in $FUNGSI; do
  n=1
  while [ "$n" -le "$COBA_MAKS" ]; do
    keluaran=$(base44 functions deploy "$f" 2>&1)
    if printf '%s' "$keluaran" | grep -qi "Another deployment is in progress"; then
      echo "$f  tunggu ($n)"; sleep "$JEDA"; n=$((n + 1)); continue
    fi
    if printf '%s' "$keluaran" | grep -qiE "error|failed"; then
      printf 'GAGAL %s\n%s\n' "$f" "$keluaran"; gagal="$gagal $f"
    else
      printf 'OK    %s\n' "$f"
    fi
    break
  done
  [ "$n" -gt "$COBA_MAKS" ] && { echo "GAGAL $f (habis percobaan)"; gagal="$gagal $f"; }
done

printf '\n=== RINGKAS ===\ngagal=%s\n' "${gagal:-tidak ada}"
echo "KIRIM_SELESAI"
