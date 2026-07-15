import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getKuraDiamReport — Deteksi kura diam (lama tidak tersentuh pencatatan).
 * Read-only aggregation untuk owner/manajer/admin.
 *
 * Sumber aktivitas per-kura:
 *   HealthRecord (pemeriksaan/sakit/obat), MeasurementHistory (timbang/ukur),
 *   TreatmentLog (treatment), Breeding (kawin/bertelur/menetas),
 *   Tortoise.last_weighed_date, Tortoise.photos[].date, Tortoise.last_status_change.
 *
 * Kelompok:
 *   merah  = Diam >90 hari
 *   kuning = Diam 60-90 hari
 *   hijau  = Terpantau (<60 hari)
 *   abu    = Belum pernah tercatat di app (tidak ada catatan sama sekali)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['owner', 'admin', 'manajer'].includes(user.role)) {
      return Response.json({ error: 'Forbidden — hanya owner/manajer/admin' }, { status: 403 });
    }

    // Service role untuk read-only agregasi seluruh data farm (bypass RLS)
    const svc = base44.asServiceRole;

    // 1. Semua kura aktif (bukan mati/terjual/diarsipkan)
    const tortoises = await svc.entities.Tortoise.list('-created_date', 2000);
    const activeTortoises = tortoises.filter(t =>
      !['mati', 'terjual', 'diarsipkan'].includes(t.status) && !t.is_archived
    );

    // 2. Sumber aktivitas per-kura (parallel fetch)
    const [healthRecords, measurements, treatmentLogs, breedings] = await Promise.all([
      svc.entities.HealthRecord.list('-date', 2000),
      svc.entities.MeasurementHistory.list('-date', 2000),
      svc.entities.TreatmentLog.list('-done_date', 2000),
      svc.entities.Breeding.list('-created_date', 500),
    ]);

    // 3. Map aktivitas terakhir per tortoise_id
    const activityMap = {};
    const consider = (tortoiseId, date, type) => {
      if (!tortoiseId || !date) return;
      const cur = activityMap[tortoiseId];
      if (!cur || date > cur.date) {
        activityMap[tortoiseId] = { date, type };
      }
    };

    healthRecords.forEach(r => consider(r.tortoise_id, r.date, 'Pemeriksaan kesehatan'));
    measurements.forEach(m => consider(m.tortoise_id, m.date, 'Timbang/ukur'));
    treatmentLogs.forEach(t => consider(t.tortoise_id, t.done_date, 'Treatment'));

    breedings.forEach(b => {
      if (b.mating_date) {
        consider(b.male_id, b.mating_date, 'Breeding (kawin)');
        consider(b.female_id, b.mating_date, 'Breeding (kawin)');
      }
      if (b.egg_laying_date) {
        consider(b.male_id, b.egg_laying_date, 'Breeding (bertelur)');
        consider(b.female_id, b.egg_laying_date, 'Breeding (bertelur)');
      }
      if (b.hatch_date && b.egg_records) {
        b.egg_records.forEach(e => {
          if (e.tortoise_id) consider(e.tortoise_id, b.hatch_date, 'Menetas');
        });
      }
    });

    // Tortoise — field denormalized + foto progres + perubahan status
    activeTortoises.forEach(t => {
      consider(t.id, t.last_weighed_date, 'Timbang');
      consider(t.id, t.last_status_change, 'Perubahan status');
      if (t.photos) {
        t.photos.forEach(p => consider(t.id, p.date, 'Foto progres'));
      }
    });

    // 4. Kelompokkan
    const today = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const groups = { merah: [], kuning: [], hijau: [], abu: [] };

    // Ambang "diam" lebih ketat untuk baby: merah >30, kuning 15-30, hijau <15.
    // Dewasa tetap: merah >90, kuning 60-90, hijau <60.
    const isBaby = (t) =>
      t.age_category === 'baby' || ((t.code || t.name || '').startsWith('BB-'));

    activeTortoises.forEach(t => {
      const act = activityMap[t.id];
      const daysAgo = act
        ? Math.floor((today.getTime() - new Date(act.date).getTime()) / MS_PER_DAY)
        : null;
      const baby = isBaby(t);
      const item = {
        id: t.id,
        code: t.code || t.name,
        name: t.name,
        enclosure: t.enclosure || '-',
        species: t.species,
        gender: t.gender,
        age_category: t.age_category,
        is_baby: baby,
        lastActivityDate: act ? act.date : null,
        lastActivityType: act ? act.type : null,
        daysAgo,
      };
      if (!act) {
        groups.abu.push(item);
      } else {
        const redThreshold = baby ? 30 : 90;
        const yellowThreshold = baby ? 15 : 60;
        if (daysAgo > redThreshold) {
          groups.merah.push(item);
        } else if (daysAgo >= yellowThreshold) {
          groups.kuning.push(item);
        } else {
          groups.hijau.push(item);
        }
      }
    });

    // Urut: paling lama diam dulu; abu berdasarkan kode
    const byIdle = (a, b) => (b.daysAgo ?? 99999) - (a.daysAgo ?? 99999);
    groups.merah.sort(byIdle);
    groups.kuning.sort(byIdle);
    groups.hijau.sort(byIdle);
    groups.abu.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

    const counts = {
      merah: groups.merah.length,
      kuning: groups.kuning.length,
      hijau: groups.hijau.length,
      abu: groups.abu.length,
    };
    const enclosures = [...new Set(activeTortoises.map(t => t.enclosure).filter(Boolean))].sort();

    return Response.json({ groups, counts, enclosures, total: activeTortoises.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});