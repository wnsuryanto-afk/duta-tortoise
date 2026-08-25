import { describe, it, expect } from 'vitest';
import { BOBOT_OPTIONS, BOBOT_POINTS, pointsForBobot } from '@/lib/incidentalBobot';

describe('bobot tugas insidentil', () => {
  it('poin naik seiring beratnya pekerjaan', () => {
    const poin = BOBOT_OPTIONS.map((o) => o.points);
    expect(poin).toEqual([...poin].sort((a, b) => a - b));
    expect(new Set(poin).size).toBe(poin.length);
  });

  it('setiap opsi punya label dan penjelasan waktu', () => {
    for (const o of BOBOT_OPTIONS) {
      expect(o.label).toBeTruthy();
      expect(o.desc).toBeTruthy();
      expect(o.points).toBeGreaterThan(0);
    }
  });

  it('BOBOT_POINTS sejalan dengan BOBOT_OPTIONS', () => {
    for (const o of BOBOT_OPTIONS) {
      expect(BOBOT_POINTS[o.value]).toBe(o.points);
    }
  });

  it('pointsForBobot memakai nilai terendah untuk bobot tak dikenal', () => {
    // Keeper tidak boleh mendapat poin lebih tinggi dari sebuah bobot
    // yang salah ketik atau dikirim dari versi lama aplikasi.
    const terendah = Math.min(...BOBOT_OPTIONS.map((o) => o.points));
    expect(pointsForBobot('tidak-ada')).toBe(terendah);
    expect(pointsForBobot(undefined)).toBe(terendah);
  });

  it('mengembalikan poin yang benar untuk setiap bobot sah', () => {
    for (const o of BOBOT_OPTIONS) {
      expect(pointsForBobot(o.value)).toBe(o.points);
    }
  });
});
