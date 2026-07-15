import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getRotasiUkur — Pilih 2 kura aktif untuk rotasi timbang & ukur hari ini.
 *
 * Logika:
 *   - Hanya kura status="aktif" (bukan terjual/mati/diarsipkan).
 *   - Tanggal ukur terakhir = tanggal MeasurementHistory terbaru SEBELUM hari ini
 *     (pengukuran hari ini TIDAK dihitung → stabil sepanjang hari).
 *   - Kura yang diukur < 60 hari lalu DIKECUALIKAN.
 *   - Urut: belum pernah diukur (prioritas tertinggi), lalu paling lama.
 *   - Ambil 2 teratas. Deterministik & idempotent dalam hari yang sama.
 *
 * Read-only. Bisa dipanggil semua user terautentikasi (keeper perlu melihat tugas).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split('T')[0];

    const svc = base44.asServiceRole;

    // 1. Semua kura aktif
    const tortoises = await svc.entities.Tortoise.list('-created_date', 2000);
    const active = tortoises.filter(t =>
      t.status === 'aktif' && !t.is_archived
    );

    // 2. MeasurementHistory — cari tanggal ukur terakhir per kura (sebelum hari ini)
    const measurements = await svc.entities.MeasurementHistory.list('-date', 5000);
    const lastMeas = {};
    for (const m of measurements) {
      if (!m.tortoise_id || !m.date) continue;
      if (m.date >= targetDate) continue; // hari ini tidak dihitung
      if (!lastMeas[m.tortoise_id]) {
        lastMeas[m.tortoise_id] = m.date; // sorted desc → first valid = latest
      }
    }

    // 3. Fallback: Tortoise.last_weighed_date (jika lebih baru dari MeasurementHistory)
    for (const t of active) {
      if (t.last_weighed_date && t.last_weighed_date < targetDate) {
        const cur = lastMeas[t.id];
        if (!cur || t.last_weighed_date > cur) lastMeas[t.id] = t.last_weighed_date;
      }
    }

    // 4. Deteksi baby: age_category='baby' ATAU kode berawalan 'BB-'
    const isBaby = (t) =>
      t.age_category === 'baby' || ((t.code || t.name || '').startsWith('BB-'));

    // 5. Bangun kandidat dengan ambang per kelompok (baby=14 hari, dewasa=60 hari)
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const todayMs = new Date(targetDate + 'T00:00:00').getTime();

    const buildCandidates = (pool, thresholdDays) =>
      pool.map(t => {
        const lastDate = lastMeas[t.id] || null;
        const daysAgo = lastDate
          ? Math.floor((todayMs - new Date(lastDate + 'T00:00:00').getTime()) / MS_PER_DAY)
          : null;
        return {
          id: t.id,
          code: t.code || t.name,
          name: t.name,
          enclosure: t.enclosure || '-',
          species: t.species,
          lastMeasuredDate: lastDate,
          daysAgo,
        };
      })
      .filter(t => t.daysAgo === null || t.daysAgo >= thresholdDays);

    // 6. Urut: belum pernah diukur (null) pertama, lalu paling lama, tiebreak kode
    const sortCandidates = (arr) =>
      arr.sort((a, b) => {
        if (a.daysAgo === null && b.daysAgo !== null) return -1;
        if (a.daysAgo !== null && b.daysAgo === null) return 1;
        if (a.daysAgo !== null && b.daysAgo !== null && a.daysAgo !== b.daysAgo) {
          return b.daysAgo - a.daysAgo;
        }
        return (a.code || '').localeCompare(b.code || '');
      });

    const babyCandidates = sortCandidates(buildCandidates(active.filter(isBaby), 14));
    const dewasaCandidates = sortCandidates(buildCandidates(active.filter(t => !isBaby(t)), 60));

    // 7. Ambil 2 teratas per kelompok (boleh kosong jika tidak ada yang jatuh tempo)
    const babies = babyCandidates.slice(0, 2);
    const dewasa = dewasaCandidates.slice(0, 2);

    return Response.json({
      date: targetDate,
      babies,
      dewasa,
      totalBabyCandidates: babyCandidates.length,
      totalAdultCandidates: dewasaCandidates.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});