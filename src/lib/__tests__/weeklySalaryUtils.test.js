import { describe, it, expect } from 'vitest';
import {
  isValidDate, safeParseDate, safeFormatDate, isMonthPeriod,
  getWeekStart, getWeekEnd, formatWeekLabel, getWeekOptions,
  WEEK_LAUNCH_START,
} from '@/lib/weeklySalaryUtils';

describe('safeParseDate', () => {
  it('menolak nilai kosong dan teks penanda null', () => {
    for (const v of [undefined, null, '', 'null', 'undefined']) {
      expect(safeParseDate(v), `input ${JSON.stringify(v)}`).toBeNull();
    }
  });

  it('menolak teks yang bukan tanggal', () => {
    expect(safeParseDate('bukan tanggal')).toBeNull();
  });

  it('menerima string ISO dan objek Date', () => {
    expect(safeParseDate('2026-07-12')).toBeInstanceOf(Date);
    expect(safeParseDate(new Date('2026-07-12'))).toBeInstanceOf(Date);
  });
});

describe('isValidDate', () => {
  it('membedakan Date valid dari Date invalid', () => {
    expect(isValidDate(new Date('2026-07-12'))).toBe(true);
    expect(isValidDate(new Date('xxx'))).toBe(false);
    expect(isValidDate('2026-07-12')).toBe(false);
  });
});

describe('safeFormatDate', () => {
  it('memakai fallback untuk tanggal invalid, bukan melempar error', () => {
    expect(safeFormatDate(null, 'd MMMM yyyy')).toBe('—');
    expect(safeFormatDate('bukan tanggal', 'd MMMM yyyy', 'n/a')).toBe('n/a');
  });

  it('memformat tanggal valid dalam bahasa Indonesia', () => {
    expect(safeFormatDate('2026-07-12', 'MMMM')).toBe('Juli');
  });
});

describe('isMonthPeriod', () => {
  it('mengenali format YYYY-MM saja', () => {
    expect(isMonthPeriod('2026-07')).toBe(true);
    expect(isMonthPeriod('2026-07-12')).toBe(false);
    expect(isMonthPeriod(null)).toBe(false);
  });
});

describe('batas minggu gaji', () => {
  it('getWeekStart selalu jatuh pada hari Minggu', () => {
    // Sepanjang satu minggu penuh, apa pun harinya, hasilnya Minggu yang sama.
    const hasil = ['2026-07-12', '2026-07-15', '2026-07-18']
      .map((d) => getWeekStart(d).getDay());
    expect(hasil).toEqual([0, 0, 0]);
  });

  it('getWeekEnd adalah Sabtu, enam hari setelah awal minggu', () => {
    const start = getWeekStart('2026-07-15');
    const end = getWeekEnd(start);
    expect(end.getDay()).toBe(6);
    expect((end - start) / 86400000).toBe(6);
  });

  it('getWeekEnd mengembalikan Date invalid untuk masukan invalid', () => {
    expect(isValidDate(getWeekEnd('bukan tanggal'))).toBe(false);
  });

  it('satu minggu gaji tepat tujuh hari, tanpa tumpang tindih', () => {
    const start = getWeekStart('2026-07-15');
    const berikutnya = getWeekStart(new Date(getWeekEnd(start).getTime() + 86400000));
    expect((berikutnya - start) / 86400000).toBe(7);
  });
});

describe('formatWeekLabel', () => {
  it('memakai "—" untuk tanggal invalid, bukan melempar error', () => {
    expect(formatWeekLabel(null)).toBe('—');
    expect(formatWeekLabel('bukan tanggal')).toBe('—');
  });

  it('menampilkan rentang Minggu sampai Sabtu', () => {
    const label = formatWeekLabel(WEEK_LAUNCH_START);
    expect(label).toContain('Minggu,');
    expect(label).toContain('Sabtu,');
  });
});

describe('getWeekOptions', () => {
  it('tidak pernah kosong', () => {
    expect(getWeekOptions().length).toBeGreaterThan(0);
  });

  it('menghormati batas maxWeeks', () => {
    expect(getWeekOptions(3).length).toBeLessThanOrEqual(3);
  });

  it('tidak pernah mundur melewati minggu peluncuran', () => {
    const paling_lama = getWeekOptions(500).at(-1);
    expect(paling_lama.value >= WEEK_LAUNCH_START).toBe(true);
  });

  it('setiap opsi punya value YYYY-MM-DD dan label terbaca', () => {
    for (const o of getWeekOptions(5)) {
      expect(o.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(o.label).not.toBe('—');
    }
  });
});
