import { describe, it, expect } from 'vitest';
import {
  STRUCTURAL, ABSENSI_IDS, CATEGORY_ICON, CATEGORY_BADGE,
  computeLastDueDate, isCompletedPrevCycle,
} from '@/lib/sopJadwal';

// 2026-07-15 adalah hari Rabu (getDay() === 3).
const RABU = '2026-07-15';

describe('konstanta jadwal', () => {
  it('setiap kategori yang punya ikon juga punya warna badge', () => {
    for (const k of Object.keys(CATEGORY_ICON)) {
      expect(CATEGORY_BADGE[k], `badge untuk kategori "${k}"`).toBeTruthy();
    }
    expect(Object.keys(CATEGORY_BADGE).sort()).toEqual(Object.keys(CATEGORY_ICON).sort());
  });

  it('item absensi benar-benar ada di daftar struktural', () => {
    const idStruktural = STRUCTURAL.map((s) => s.id);
    for (const id of ABSENSI_IDS) {
      expect(idStruktural, `"${id}" tidak ada di STRUCTURAL`).toContain(id);
    }
  });

  it('istirahat tidak bisa dicentang dan bukan absensi', () => {
    const istirahat = STRUCTURAL.find((s) => s.id === 'istirahat');
    expect(istirahat.noCheck).toBe(true);
    expect(ABSENSI_IDS.has('istirahat')).toBe(false);
  });
});

describe('computeLastDueDate — tugas harian', () => {
  it('selalu jatuh tempo hari ini', () => {
    expect(computeLastDueDate({ frequency: 'harian' }, RABU)).toBe(RABU);
  });

  it('tidak peduli huruf besar-kecil', () => {
    expect(computeLastDueDate({ frequency: 'HARIAN' }, RABU)).toBe(RABU);
  });
});

describe('computeLastDueDate — tugas mingguan', () => {
  it('jatuh tempo hari ini bila hari ini termasuk jadwalnya', () => {
    // 3 = Rabu
    expect(computeLastDueDate({ frequency: 'mingguan', weekly_days: [3] }, RABU)).toBe(RABU);
  });

  it('mundur ke hari jadwal terakhir yang sudah lewat', () => {
    // 1 = Senin. Senin sebelum Rabu 15 Juli adalah 13 Juli.
    expect(computeLastDueDate({ frequency: 'mingguan', weekly_days: [1] }, RABU)).toBe('2026-07-13');
  });

  it('memilih jadwal terdekat bila ada beberapa hari', () => {
    // Senin(1) dan Selasa(2): yang terdekat sebelum Rabu adalah Selasa 14 Juli.
    expect(computeLastDueDate({ frequency: 'mingguan', weekly_days: [1, 2] }, RABU)).toBe('2026-07-14');
  });

  it('mengembalikan null bila hari jadwalnya belum diisi', () => {
    expect(computeLastDueDate({ frequency: 'mingguan', weekly_days: [] }, RABU)).toBeNull();
    expect(computeLastDueDate({ frequency: 'mingguan' }, RABU)).toBeNull();
  });
});

describe('computeLastDueDate — tugas bulanan', () => {
  it('jatuh tempo hari ini bila tanggalnya cocok', () => {
    expect(computeLastDueDate({ frequency: 'bulanan', monthly_dates: [15] }, RABU)).toBe(RABU);
  });

  it('mundur ke tanggal jadwal terakhir yang sudah lewat', () => {
    expect(computeLastDueDate({ frequency: 'bulanan', monthly_dates: [10] }, RABU)).toBe('2026-07-10');
  });

  it('bisa mundur melewati pergantian bulan', () => {
    // Tanggal 28 terakhir sebelum 15 Juli adalah 28 Juni.
    expect(computeLastDueDate({ frequency: 'bulanan', monthly_dates: [28] }, RABU)).toBe('2026-06-28');
  });

  it('mengembalikan null bila tanggalnya belum diisi', () => {
    expect(computeLastDueDate({ frequency: 'bulanan', monthly_dates: [] }, RABU)).toBeNull();
  });
});

describe('computeLastDueDate — frekuensi tak dikenal', () => {
  it('mengembalikan null, bukan menebak', () => {
    expect(computeLastDueDate({ frequency: 'tahunan' }, RABU)).toBeNull();
    expect(computeLastDueDate({}, RABU)).toBeNull();
  });
});

describe('isCompletedPrevCycle', () => {
  const log = (over = {}) => ({
    item_id: 'task-1', is_done: true, period_key: '2026-07-14',
    done_by_email: 'keeper@duta.id', ...over,
  });

  it('mengenali tugas yang sudah dikerjakan dalam siklus ini', () => {
    expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'x@duta.id', [log()])).toBe(true);
  });

  it('mengabaikan log di luar rentang siklus', () => {
    expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'x@duta.id',
      [log({ period_key: '2026-07-01' })])).toBe(false);
  });

  it('tidak menghitung log hari ini — itu urusan centang hari ini', () => {
    expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'x@duta.id',
      [log({ period_key: RABU })])).toBe(false);
  });

  it('mengabaikan data uji owner supaya tidak memengaruhi keeper asli', () => {
    expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'x@duta.id',
      [log({ is_test_data: true })])).toBe(false);
  });

  it('mengabaikan log yang belum selesai', () => {
    expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'x@duta.id',
      [log({ is_done: false })])).toBe(false);
  });

  it('mengabaikan log milik task lain', () => {
    expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'x@duta.id',
      [log({ item_id: 'task-2' })])).toBe(false);
  });

  describe('lingkup pribadi', () => {
    it('hanya menghitung pekerjaan keeper itu sendiri', () => {
      const logs = [log({ done_by_email: 'orang.lain@duta.id' })];
      expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'pribadi', 'keeper@duta.id', logs)).toBe(false);
      expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'pribadi', 'orang.lain@duta.id', logs)).toBe(true);
    });
  });

  describe('lingkup bersama', () => {
    it('siapa pun yang mengerjakan dianggap selesai', () => {
      const logs = [log({ done_by_email: 'orang.lain@duta.id' })];
      expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'keeper@duta.id', logs)).toBe(true);
    });
  });

  it('aman untuk daftar log kosong atau tidak ada', () => {
    expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'x@duta.id', [])).toBe(false);
    expect(isCompletedPrevCycle('task-1', '2026-07-13', RABU, 'bersama', 'x@duta.id', null)).toBe(false);
  });
});
