/**
 * onMeasurementSaved — jaga Tortoise.weight_grams / shell_length_cm /
 * last_weighed_date tetap sama dengan penimbangan SAH yang paling akhir.
 *
 * Trigger: entity automation MeasurementHistory, pada create DAN update.
 *
 * ── TIGA CACAT YANG DITUTUP 16-09-2026 ─────────────────────────────
 *
 * Versi lama menyalin begitu saja angka dari baris yang baru masuk.
 * Untuk penimbangan baru itu benar. Untuk dua hal lain, salah:
 *
 * 1. MENGECUALIKAN BARIS YANG SALAH JUSTRU MENYALINNYA.
 *    Koreksi baku di aplikasi ini adalah menandai `excluded_from_reports`,
 *    bukan menghapus. Menandainya adalah sebuah UPDATE, jadi automation ini
 *    ikut jalan — lalu menulis berat yang baru saja dinyatakan salah itu ke
 *    profil kura. Semakin keras dikoreksi, semakin salah hasilnya. Ini bukan
 *    teori: 39 baris timbang yang harus dikecualikan sesi ini semuanya lewat
 *    jalur luar aplikasi, dan hari ini tombolnya dipasang di layar.
 *
 * 2. MENGEDIT CATATAN LAMA MENGUBAH BERAT SEKARANG.
 *    Memperbaiki salah ketik pada timbangan bulan Mei menimpa berat hari ini
 *    dengan angka bulan Mei. Tidak ada error, tidak ada tanda apa pun.
 *
 * 3. FOTO TERDORONG ULANG SETIAP KALI BARIS DISENTUH.
 *    `photos.push()` jalan pada setiap update, jadi satu foto bisa muncul
 *    berkali-kali di galeri profil.
 *
 * 4. SATU PENIMBANGAN TIDAK LENGKAP MENGHAPUS YANG LENGKAP.
 *    Ditemukan saat memeriksa hasil perbaikan ini sendiri: B116 diukur
 *    22 Mei 2026 hanya panjangnya. Menyalin baris terakhir bulat-bulat
 *    mengosongkan beratnya, padahal 19,9 kg tercatat baik di baris
 *    sebelumnya. Aturannya sekarang PER KOLOM — lihat shared/ukuran.ts.
 *
 * Sekarang: sesudah perubahan apa pun, fungsi ini MENGHITUNG ULANG dari
 * seluruh riwayat kura itu. Kolom yang tidak pernah terisi dikosongkan —
 * profil yang kosong jujur, profil yang memuat angka salah tidak.
 *
 * DosisKalkulator membagi dosis obat dengan weight_grams. Itu sebabnya kolom
 * ini tidak boleh salah, bukan sekadar sebaiknya benar.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { masukLaporan } from "../../shared/laporan.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";
import { ukuranDariRiwayat } from "../../shared/ukuran.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const measurement = body?.data;
    if (!measurement || !measurement.tortoise_id) {
      return Response.json({ ok: true, skip: "no tortoise_id" });
    }
    const kuraId = measurement.tortoise_id;

    let riwayat = await base44.asServiceRole.entities.MeasurementHistory.filter(
      { tortoise_id: kuraId }, "-date", BATAS_AMBIL,
    );

    /*
     * ── SATU BARIS PER KURA PER HARI, DIJAGA DI SERVER ─────────────
     *
     * Penjaga sisi layar (lib/ukurSekali.js) memeriksa ke basis data tepat
     * sebelum menulis, dan itu menutup sebagian besar kasus. Tapi ia tetap
     * sebuah LOMBA: 16-09-2026 kiper yang sama mengerjakan dua task berbeda
     * untuk baby yang sama berselang dua menit — "Timbang baby massal" lalu
     * "Rotasi otomatis" — dan pemeriksaannya tidak melihat baris yang baru
     * saja ditulis. Dua baris masuk untuk BB-2026028 dan BB-2026030.
     *
     * Ada juga jalur yang memang tidak lewat penjaga itu sama sekali
     * (formulir data kura menulis MeasurementHistory sendiri saat berat
     * diubah). Pemeriksaan di layar tidak akan pernah bisa menutup jalur
     * yang tidak memanggilnya.
     *
     * Jadi jaminannya dipindah ke sini, tempat yang dilewati SETIAP tulisan.
     * Yang kalah TIDAK dihapus — hanya ditandai keluar dari laporan, dengan
     * alasannya tertulis, dan bisa dikembalikan lewat widget Data
     * Dikecualikan atau tombol di riwayat ukur.
     *
     * Yang dipertahankan: baris yang paling banyak isinya (berfoto menang
     * atas tak berfoto, lalu yang lebih lengkap datanya, lalu yang lebih
     * dulu ditulis). Kiper yang memotret sudah mengerjakan lebih banyak.
     */
    const tanggal = measurement.date;
    if (tanggal) {
      const sehari = (riwayat || []).filter(
        (m: any) => m?.date === tanggal && masukLaporan(m),
      );
      if (sehari.length > 1) {
        const nilai = (m: any) =>
          (m?.photo_url ? 4 : 0) +
          (angka(m?.weight_grams) > 0 ? 2 : 0) +
          (angka(m?.shell_length_cm) > 0 ? 1 : 0);
        const urut = sehari.slice().sort((a: any, b: any) => {
          const d = nilai(b) - nilai(a);
          if (d !== 0) return d;
          return String(a?.created_date || "").localeCompare(String(b?.created_date || ""));
        });
        const menang = urut[0];
        for (const kalah of urut.slice(1)) {
          try {
            await base44.asServiceRole.entities.MeasurementHistory.update(kalah.id, {
              excluded_from_reports: true,
              notes:
                (kalah.notes ? kalah.notes + " — " : "") +
                `Kembar: kura ini sudah ditimbang ${tanggal}` +
                (menang?.measured_by ? ` oleh ${menang.measured_by}` : "") +
                ". Baris ini dikeluarkan otomatis dari laporan.",
            });
            kalah.excluded_from_reports = true;
          } catch { /* gagal menandai satu baris tidak boleh menggagalkan sisanya */ }
        }
        riwayat = (riwayat || []).map(
          (m: any) => (m?.id === menang?.id ? m : sehari.find((x: any) => x.id === m.id) || m),
        );
      }
    }

    const updateData: Record<string, any> = { ...ukuranDariRiwayat(riwayat || []) };

    /*
     * Galeri foto disusun ulang dari riwayat, bukan ditambahi.
     *
     * Foto yang sudah ada di profil TAPI tidak berasal dari penimbangan
     * (diunggah lewat form kura, misalnya) dipertahankan apa adanya — yang
     * dikenali sebagai "berasal dari timbangan" hanyalah URL yang memang
     * muncul di riwayat. Menghapus foto yang bukan urusan fungsi ini akan
     * menghilangkan foto yang tidak pernah bisa dikembalikan.
     */
    try {
      const tor = await base44.asServiceRole.entities.Tortoise.get(kuraId);
      const lama = Array.isArray(tor?.photos) ? tor.photos : [];
      const urlRiwayat = new Set(
        (riwayat || []).map((m: any) => m?.photo_url).filter(Boolean),
      );
      const bukanDariTimbang = lama.filter((p: any) => p?.url && !urlRiwayat.has(p.url));
      const dariTimbang = (riwayat || [])
        .filter((m: any) => m?.photo_url && masukLaporan(m))
        .map((m: any) => ({
          url: m.photo_url,
          date: m.date || "",
          weight_grams: m.weight_grams || undefined,
          shell_length_cm: m.shell_length_cm || undefined,
          notes: m.notes || "",
          is_primary: false,
        }));
      const semua = [...bukanDariTimbang, ...dariTimbang];
      if (semua.length > 0) {
        // Penanda utama dipertahankan kalau fotonya masih ada; kalau tidak,
        // jatuh ke foto pertama supaya profil tidak kehilangan gambar muka.
        const adaUtama = semua.some((p: any) => p?.is_primary);
        if (!adaUtama) semua[0].is_primary = true;
      }
      updateData.photos = semua;
    } catch {
      // Gagal menyusun galeri tidak boleh membatalkan koreksi berat —
      // berat yang salah jauh lebih berbahaya daripada galeri yang berantakan.
      delete updateData.photos;
    }

    await base44.asServiceRole.entities.Tortoise.update(kuraId, updateData);

    return Response.json({
      ok: true,
      total_riwayat: (riwayat || []).length,
      sah: (riwayat || []).filter(masukLaporan).length,
      updated: updateData,
    });
  } catch (error) {
    return Response.json({ error: (error as Error)?.message }, { status: 500 });
  }
});
