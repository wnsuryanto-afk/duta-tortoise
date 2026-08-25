import { describe, it, expect } from 'vitest';
import { poinChecklist, totalPoinChecklist } from '@/lib/poinChecklist';

const tasks = [{ points: 10 }, { points: 15 }]; // total klaim 25

describe('checklist ditolak', () => {
  it('tidak menghasilkan poin walau klaimnya besar', () => {
    expect(poinChecklist({
      status: 'rejected', approved_points: 0,
      total_points_claimed: 100, completed_tasks: tasks,
    })).toBe(0);
  });

  it('tetap nol walau approved_points sempat terisi', () => {
    expect(poinChecklist({ status: 'rejected', approved_points: 80 })).toBe(0);
  });
});

describe('checklist disetujui', () => {
  it('memakai poin yang disetujui owner, bukan yang diklaim keeper', () => {
    expect(poinChecklist({
      status: 'approved', approved_points: 30, total_points_claimed: 100,
    })).toBe(30);
  });

  it('menghormati keputusan owner memberi 0 poin', () => {
    // Inti perbaikannya. Rumus lama `approved_points || total_points_claimed`
    // menganggap 0 sebagai "kosong" lalu membayar penuh 100 poin yang baru
    // saja dinolkan owner.
    expect(poinChecklist({
      status: 'approved', approved_points: 0,
      total_points_claimed: 100, completed_tasks: tasks,
    })).toBe(0);
  });

  it('data lama tanpa approved_points jatuh ke poin klaim', () => {
    expect(poinChecklist({ status: 'approved', total_points_claimed: 25 })).toBe(25);
    expect(poinChecklist({ status: 'approved', completed_tasks: tasks })).toBe(25);
  });

  it('mengabaikan approved_points yang bukan angka', () => {
    expect(poinChecklist({
      status: 'approved', approved_points: 'lima', total_points_claimed: 25,
    })).toBe(25);
  });

  it('tidak pernah mengembalikan nilai negatif', () => {
    expect(poinChecklist({ status: 'approved', approved_points: -50 })).toBe(0);
  });
});

describe('checklist belum ditinjau', () => {
  const belum = { status: 'submitted', total_points_claimed: 25, completed_tasks: tasks };

  it('secara bawaan tidak dihitung', () => {
    expect(poinChecklist(belum)).toBe(0);
  });

  it('dihitung memakai poin klaim bila pemanggil memintanya', () => {
    expect(poinChecklist(belum, { hitungBelumDitinjau: true })).toBe(25);
  });

  it('checklist tanpa status diperlakukan sebagai belum ditinjau', () => {
    const tanpaStatus = { total_points_claimed: 25 };
    expect(poinChecklist(tanpaStatus)).toBe(0);
    expect(poinChecklist(tanpaStatus, { hitungBelumDitinjau: true })).toBe(25);
  });

  it('menghitung ulang dari completed_tasks bila total tidak tersimpan', () => {
    expect(poinChecklist(
      { status: 'submitted', completed_tasks: tasks },
      { hitungBelumDitinjau: true },
    )).toBe(25);
  });
});

describe('masukan cacat', () => {
  it('tidak melempar error dan mengembalikan 0', () => {
    for (const v of [null, undefined, 'teks', 42, []]) {
      expect(poinChecklist(v), `input ${JSON.stringify(v)}`).toBe(0);
    }
  });

  it('mengabaikan task dengan poin bukan angka', () => {
    expect(poinChecklist(
      { status: 'approved', completed_tasks: [{ points: 10 }, { points: null }, {}] },
    )).toBe(10);
  });
});

describe('totalPoinChecklist', () => {
  it('menjumlahkan sesuai aturan yang sama', () => {
    const daftar = [
      { status: 'approved', approved_points: 30 },
      { status: 'approved', approved_points: 0, total_points_claimed: 100 }, // dinolkan owner
      { status: 'rejected', total_points_claimed: 50 },
      { status: 'submitted', total_points_claimed: 20 },
    ];
    expect(totalPoinChecklist(daftar)).toBe(30);
    expect(totalPoinChecklist(daftar, { hitungBelumDitinjau: true })).toBe(50);
  });

  it('aman untuk masukan yang bukan array', () => {
    expect(totalPoinChecklist(null)).toBe(0);
  });
});
