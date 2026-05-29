// Haversine formula - menghitung jarak dalam meter antara dua koordinat
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Mendapatkan posisi GPS saat ini — returns Promise<{lat, lng}>
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS tidak didukung di browser ini"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) reject(new Error("Izin GPS ditolak. Aktifkan lokasi di pengaturan browser."));
        else if (err.code === 2) reject(new Error("Lokasi tidak tersedia. Pastikan GPS aktif."));
        else reject(new Error("Gagal mendapatkan lokasi GPS."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Membulatkan jam ke 0.5 terdekat
export function roundToHalfHour(hours) {
  return Math.round(hours * 2) / 2;
}

// Menghitung overtime dalam jam desimal
export function calcOvertimeHours(checkoutTimeStr, shiftEndStr = "16:00") {
  const [coH, coM] = checkoutTimeStr.split(":").map(Number);
  const [seH, seM] = shiftEndStr.split(":").map(Number);
  const checkoutMins = coH * 60 + coM;
  const shiftEndMins = seH * 60 + seM;
  if (checkoutMins <= shiftEndMins) return 0;
  const rawHours = (checkoutMins - shiftEndMins) / 60;
  return roundToHalfHour(rawHours);
}