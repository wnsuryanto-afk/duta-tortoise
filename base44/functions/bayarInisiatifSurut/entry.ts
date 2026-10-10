/**
 * bayarInisiatifSurut — sekali pakai: membayar poin Inisiatif yang berhenti
 * dibayar pada 28 Juli 2026.
 *
 * Dokumentasi lengkapnya ada di repo:
 * base44/functions/bayarInisiatifSurut/entry.ts
 *
 * TARIFNYA 5 POIN, bukan penilaian baru — persis yang dibayarkan sistem ini
 * sendiri sampai 27 Juli. BATAS HARIAN TETAP BERLAKU. Pekerjaan yang sudah
 * dibayar lewat checklist tidak dibayar dua kali. Bawaannya KERING: tidak
 * menulis apa pun. Kirim { "kering": false } untuk benar-benar menulis.
 * JENDELANYA BERUJUNG: 28 Juli sampai 6 Oktober 2026.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { BATAS_AMBIL } from "../../shared/batas.ts";
import { kunciTugas } from "../../shared/kunciTugas.ts";
import { JENDELA, pasangKeBaris, rencanaHari, saringSasaran } from "../../shared/bayarSurut.ts";

const POIN_BAWAAN = 5;              // tarif yang dulu benar-benar dibayarkan
const MAKS_HARIAN_BAWAAN = 30;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Perlu masuk' }, { status: 401 });

    const badan = await req.json().catch(() => ({}));
    const kering = badan?.kering !== false;          // bawaan: tidak menulis
    const dari = badan?.dari || JENDELA.dari;
    const sampai = badan?.sampai || JENDELA.sampai;
    const poinSatuan = Number(badan?.poin) > 0 ? Number(badan.poin) : POIN_BAWAAN;

    // Batas harian dibaca dari pengaturan, sama dengan yang dipakai layar.
    const setelan = await base44.asServiceRole.entities.CompanySettings.filter({ setting_key: "main" }, null, 5);
    const maksHarian = Number(setelan?.[0]?.poin_tambahan_maks_harian);
    const maks = Number.isFinite(maksHarian) && maksHarian >= 0 ? maksHarian : MAKS_HARIAN_BAWAAN;

    // ── 1. Catatan Inisiatif yang belum dinilai ──
    const semua = await base44.asServiceRole.entities.MaintenanceLog.filter({ is_extra: true }, "period_key", BATAS_AMBIL);
    const sasaran = saringSasaran(semua || [], { dari, sampai });

    // Poin Inisiatif yang SUDAH disetujui, untuk mengurangi kuota hari itu.
    const terpakai = new Map<string, number>();
    for (const l of semua || []) {
      if (l.is_test_data || l.excluded_from_reports) continue;
      if (l.approval_status !== "approved") continue;
      const k = `${l.done_by_email}__${l.period_key}`;
      terpakai.set(k, (terpakai.get(k) || 0) + (Number(l.poin_earned) || 0));
    }

    // ── 2. Checklist yang terkena, dibaca sekali ──
    const pasangan = [...new Set(sasaran.map((l) => `${l.done_by_email}__${l.period_key}`))];
    const semuaChecklist = await base44.asServiceRole.entities.DailyChecklist.list("-date", BATAS_AMBIL);
    const petaChecklist = new Map<string, Record<string, unknown>>();
    for (const c of semuaChecklist || []) {
      if (!c.employee_email || !c.date) continue;
      const k = `${c.employee_email}__${c.date}`;
      if (!petaChecklist.has(k)) petaChecklist.set(k, c);   // yang terbaru menang
    }

    const laporan = {
      kering,
      dari,
      sampai,
      poinSatuan,
      maksHarian: maks,
      catatan: { diperiksa: sasaran.length, dibayar: 0, nolKarenaSudahDibayar: 0, nolKarenaKuota: 0, terpotongKuota: 0 },
      poinPerOrangPerBulan: {} as Record<string, Record<string, number>>,
      checklist: { diubah: 0, tanpaBaris: 0, tanpaChecklist: 0, approvedDinaikkan: 0 },
      rincianTidakDibayar: [] as Array<Record<string, unknown>>,
      galat: [] as string[],
    };

    const tambahLaporan = (email: string, tanggal: string, poin: number) => {
      const bulan = String(tanggal).slice(0, 7);
      laporan.poinPerOrangPerBulan[email] = laporan.poinPerOrangPerBulan[email] || {};
      laporan.poinPerOrangPerBulan[email][bulan] = (laporan.poinPerOrangPerBulan[email][bulan] || 0) + poin;
    };

    const stempel = new Date().toISOString();
    const catatanPenilaian =
      `Pembayaran surut ${stempel.slice(0, 10)}: poin Inisiatif berhenti dibayar sejak 28 Juli 2026 ` +
      `karena cacat kode, bukan karena keputusan. Dinilai ${poinSatuan} poin — tarif yang berlaku sebelum tanggal itu.`;

    // ── 3. Per pasangan orang+hari, supaya kuota dan baris checklist konsisten ──
    for (const kunci of pasangan) {
      const [email, tanggal] = kunci.split("__");
      const logs = sasaran
        .filter((l) => l.done_by_email === email && l.period_key === tanggal)
        .sort((a, b) => String(a.done_at || "").localeCompare(String(b.done_at || "")));

      const checklist = petaChecklist.get(kunci);
      const barisAwal = Array.isArray(checklist?.completed_tasks)
        ? checklist.completed_tasks as Array<Record<string, unknown>>
        : [];

      const { keputusan, perJudul } = rencanaHari({
        logs,
        baris: barisAwal,
        maks,
        terpakai: terpakai.get(kunci) || 0,
        poinSatuan,
      });

      for (const k of keputusan) {
        if (k.sebab === "dibayar") laporan.catatan.dibayar++;
        else if (k.sebab === "kuota-terpotong") { laporan.catatan.dibayar++; laporan.catatan.terpotongKuota++; }
        else if (k.sebab === "sudah-dibayar") laporan.catatan.nolKarenaSudahDibayar++;
        else if (k.sebab === "kuota-habis") laporan.catatan.nolKarenaKuota++;

        if (k.poin > 0) tambahLaporan(email, tanggal, k.poin);
        else laporan.rincianTidakDibayar.push({ id: k.id, judul: k.judul, email, tanggal, alasan: k.alasan });

        if (!kering) {
          try {
            await base44.asServiceRole.entities.MaintenanceLog.update(k.id, {
              approval_status: k.poin > 0 ? "approved" : "rejected",
              menunggu_penilaian: false,
              poin_earned: k.poin,
              approved_by: "Pemilik (pembayaran surut)",
              poin_dinilai_oleh: user.email || "",
              approved_at: stempel,
              penilaian_note: [catatanPenilaian, k.alasan].filter(Boolean).join(" "),
            });
          } catch (e) {
            laporan.galat.push(`MaintenanceLog ${k.id}: ${e?.message || e}`);
          }
        }
      }

      // ── 4. Baris checklist: poinnya dipasang, totalnya dihitung ulang ──
      if (perJudul.size === 0) continue;
      if (!checklist) { laporan.checklist.tanpaChecklist += perJudul.size; continue; }

      const { baris, selisih, berubah, tanpaBaris, total } = pasangKeBaris(barisAwal, perJudul);
      laporan.checklist.tanpaBaris += tanpaBaris;
      if (berubah === 0) continue;

      const perubahan: Record<string, unknown> = { completed_tasks: baris, total_points_claimed: total };
      if (checklist.status === "approved") {
        perubahan.approved_points = (Number(checklist.approved_points) || 0) + selisih;
        laporan.checklist.approvedDinaikkan++;
      }
      laporan.checklist.diubah++;

      if (!kering) {
        try {
          await base44.asServiceRole.entities.DailyChecklist.update(checklist.id as string, perubahan);
        } catch (e) {
          laporan.galat.push(`DailyChecklist ${checklist.id}: ${e?.message || e}`);
        }
      }
    }

    if (laporan.rincianTidakDibayar.length > 40) {
      laporan.rincianTidakDibayar = laporan.rincianTidakDibayar.slice(0, 40);
    }

    return Response.json({ ok: true, ...laporan });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
});
