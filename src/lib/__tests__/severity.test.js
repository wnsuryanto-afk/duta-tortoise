import { describe, it, expect } from 'vitest';
import { SEVERITIES, TRIGGER_SEVERITIES } from '@/lib/severity';

describe('tingkat keparahan', () => {
  it('punya empat tingkat dengan value unik', () => {
    const nilai = SEVERITIES.map((s) => s.value);
    expect(nilai).toEqual(['ringan', 'sedang', 'berat', 'kritis']);
    expect(new Set(nilai).size).toBe(nilai.length);
  });

  it('setiap tingkat punya label yang bisa dibaca', () => {
    for (const s of SEVERITIES) {
      expect(s.label).toBeTruthy();
      expect(s.label.length).toBeGreaterThan(1);
    }
  });

  it('setiap pemicu notifikasi adalah tingkat yang benar-benar ada', () => {
    const nilai = SEVERITIES.map((s) => s.value);
    for (const t of TRIGGER_SEVERITIES) {
      expect(nilai, `pemicu "${t}" tidak ada di SEVERITIES`).toContain(t);
    }
  });

  it('tingkat teringan tidak memicu notifikasi manajer', () => {
    expect(TRIGGER_SEVERITIES).not.toContain('ringan');
  });
});
