/**
 * AksiHarianKiper — dua tindakan harian kiper yang HARUS sama di layar mana pun.
 *
 * KENAPA KOMPONEN INI ADA.
 *
 * Ada dua layar kiper yang hidup berdampingan:
 *
 *   guided/GuidedHariIni    bawaan untuk keeper dan kepala feeder (AppLayout
 *                           mengarahkan kedua peran itu ke Guided Mode)
 *   dashboard/KeeperDashboard  yang muncul bila kiper menekan "mode normal"
 *
 * Pada 01–03 September 2026 tombol "Hari ini saya libur" dan "Ambil sayur di
 * pasar" dipasang HANYA di layar pertama. Akibatnya, kiper yang berpindah ke
 * mode normal kehilangan keduanya — hari liburnya kembali menjadi hari tanpa
 * catatan (memotong Rp 70.000 diam-diam), dan trip sayurnya tidak terbayar
 * Rp 30.000.
 *
 * Menyalin kodenya ke layar kedua akan menyelesaikan hari ini dan gagal lagi
 * di perubahan berikutnya — persis pola yang sudah dua kali menggigit aplikasi
 * ini: aturan mundur racikan yang punya dua salinan, dan perhitungan gaji yang
 * punya dua rumus. Jadi keduanya ditaruh di satu tempat, di sini.
 *
 * Yang TIDAK dipindahkan ke sini: check in / check out beserta logika GPS-nya.
 * Keduanya memang juga terduplikasi, tetapi memindahkannya berarti menyentuh
 * jalur absensi yang sedang berjalan setiap hari — pekerjaan tersendiri, bukan
 * tempelan pada perbaikan ini.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const hariIniStr = () => new Date().toISOString().split("T")[0];

export default function AksiHarianKiper({ user, attendance, hasCheckedIn, onPesan }) {
  const qc = useQueryClient();
  const [sibuk, setSibuk] = useState("");
  const today = hariIniStr();

  const { data: tripSayurHariIni } = useQuery({
    queryKey: ["trip-sayur-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.PakanHarian.filter({
        recorded_by_email: user.email,
        log_date: today,
        feed_source: "sayur_pasar",
      });
      return res[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  const kabari = (jenis, teks) => {
    if (typeof onPesan === "function") onPesan(jenis, teks);
  };

  /*
    Menandai hari ini LIBUR.

    Ini tidak mengubah gaji — gaji dihitung dari hari masuk. Yang berubah:
    hari libur jadi punya catatan, sehingga hari yang TIDAK punya catatan
    berarti absensinya belum diisi, dan itu bisa dikejar sebelum slip terbit.
    Pada Agustus 2026 ada 10 hari tanpa catatan di antara dua kiper.
  */
  const tandaiLibur = async () => {
    if (hasCheckedIn || attendance || sibuk) return;
    setSibuk("libur");
    try {
      await base44.entities.Attendance.create({
        employee_id: user.id,
        employee_name: user.full_name || user.email,
        employee_email: user.email,
        date: today,
        status: "libur",
      });
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      kabari("ok", "Hari ini ditandai libur. Tidak dihitung sebagai hari kerja.");
    } catch (e) {
      kabari("warn", "Gagal menandai libur: " + (e?.message || ""));
    }
    setSibuk("");
  };

  /*
    Mencatat trip ambil sayur di pasar — sekali tekan.

    Menulis satu baris PakanHarian bersumber "sayur_pasar", sumber yang sama
    yang dibaca hooks/useVegTrips.js untuk membayar Rp 30.000 per trip.
    Jumlah keranjang tidak ikut tercatat; untuk upah trip itu tidak
    berpengaruh, karena yang dibayar perjalanannya, bukan isinya.
  */
  const catatTripSayur = async () => {
    if (tripSayurHariIni || sibuk) return;
    setSibuk("sayur");
    try {
      await base44.entities.PakanHarian.create({
        log_date: today,
        session: "pagi",
        basket_count: 0,
        feed_source: "sayur_pasar",
        recorded_by_name: user.full_name || user.email,
        recorded_by_email: user.email,
        notes:
          "Dicatat sekali tekan dari layar harian. Jumlah keranjang tidak diisi — buka Pakan Harian bila perlu mencatat volumenya.",
      });
      qc.invalidateQueries({ queryKey: ["trip-sayur-today"] });
      qc.invalidateQueries({ queryKey: ["veg-trips"] });
      kabari("ok", "Trip sayur tercatat. Upah Rp 30.000 masuk hitungan gaji bulan ini.");
    } catch (e) {
      kabari("warn", "Gagal mencatat trip sayur: " + (e?.message || ""));
    }
    setSibuk("");
  };

  return (
    <>
      {/* Libur hanya ditawarkan pada hari yang belum ada catatannya sama sekali. */}
      {!hasCheckedIn && !attendance && (
        <div className="mt-2">
          <button
            onClick={tandaiLibur}
            disabled={!!sibuk}
            className="w-full border border-border text-muted-foreground font-medium py-2.5 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-60"
          >
            Hari ini saya libur
          </button>
          <p className="text-[11px] text-center text-muted-foreground mt-1">
            Hari libur tidak dihitung hari kerja. Tekan ini supaya tidak tercatat sebagai
            absensi yang lupa diisi.
          </p>
        </div>
      )}

      {!hasCheckedIn && attendance?.status === "libur" && (
        <p className="text-sm text-muted-foreground">Hari ini ditandai libur.</p>
      )}

      {/* Trip sayur terjadi di tengah hari kerja, jadi baru ditawarkan setelah check in. */}
      {hasCheckedIn && (
        <div className="mt-3 pt-3 border-t border-border">
          {tripSayurHariIni ? (
            <p className="text-sm text-green-700 font-medium">
              ✓ Trip sayur pasar tercatat hari ini — Rp 30.000
            </p>
          ) : (
            <>
              <button
                onClick={catatTripSayur}
                disabled={!!sibuk}
                className="w-full border border-green-700 text-green-800 font-semibold py-2.5 rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-60"
              >
                🥬 Hari ini saya ambil sayur di pasar
              </button>
              <p className="text-[11px] text-center text-muted-foreground mt-1">
                Tambahan Rp 30.000. Tekan sekali saja, pada hari Anda benar-benar ke pasar.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
