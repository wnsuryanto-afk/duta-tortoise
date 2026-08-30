import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Batasnya ditulis tegas. `Tortoise.list()` tanpa batas mengandalkan
    // bawaan SDK, dan fungsi ini MENULIS hasilnya — kalau daftarnya terpotong,
    // yang tersimpan adalah jumlah penghuni yang lebih kecil dari kenyataan,
    // untuk SETIAP kandang, dan kesalahannya menetap di basis data.
    const BATAS = 2000;
    const enclosures = await base44.asServiceRole.entities.Enclosure.list('name', BATAS);
    const tortoises = await base44.asServiceRole.entities.Tortoise.list('-created_date', BATAS);

    if (tortoises.length >= BATAS) {
      return Response.json({
        error: `Jumlah kura menyentuh batas ${BATAS}. Penghitungan dihentikan supaya tidak menyimpan angka yang terpotong.`,
      }, { status: 500 });
    }

    // Didefinisikan lewat PENGECUALIAN, bukan daftar status yang boleh ikut.
    // Dengan daftar-yang-boleh, status baru yang ditambahkan kelak diam-diam
    // hilang dari hitungan dan kandang tampak lebih longgar dari sebenarnya.
    const statusKeluar = ['mati', 'terjual', 'diarsipkan'];
    const masihAda = (t) => !t.is_archived && !statusKeluar.includes(t.status);

    // Cocokkan lewat NOMOR kandang; nama hanya untuk kura yang nomornya belum
    // terisi. Mencocokkan lewat nama saja membuat seluruh penghuni sebuah
    // kandang lepas begitu kandangnya diganti nama.
    const namaSama = (a, b) =>
      String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

    let diperbarui = 0;
    for (const enclosure of enclosures) {
      const count = tortoises.filter((t) =>
        masihAda(t) &&
        (t.enclosure_id
          ? t.enclosure_id === enclosure.id
          : namaSama(t.enclosure, enclosure.name))
      ).length;

      if (count !== enclosure.current_count) {
        await base44.asServiceRole.entities.Enclosure.update(enclosure.id, {
          current_count: count
        });
        diperbarui++;
      }
    }

    return Response.json({
      success: true,
      message: `Diperiksa ${enclosures.length} kandang dari ${tortoises.length} kura; ${diperbarui} kandang diperbarui.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});