import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  NAV_SECTIONS, SETTINGS_ITEMS, EXTRA_DESTINATIONS,
  findSectionByPath, findParentArea,
} from '@/lib/navigation';

const ALL_ITEMS = [
  ...NAV_SECTIONS.flatMap((s) => s.items),
  ...SETTINGS_ITEMS,
  ...EXTRA_DESTINATIONS,
];

describe('struktur navigasi', () => {
  it('setiap item punya path, section, dan label', () => {
    for (const i of ALL_ITEMS) {
      expect(i.path, `path untuk "${i.label}"`).toMatch(/^\//);
      expect(i.section, `section untuk "${i.path}"`).toBeTruthy();
      expect(i.label, `label untuk "${i.path}"`).toBeTruthy();
    }
  });

  it('tidak ada path duplikat di dalam NAV_SECTIONS', () => {
    const paths = NAV_SECTIONS.flatMap((s) => s.items).map((i) => i.path);
    const duplikat = paths.filter((p, k) => paths.indexOf(p) !== k);
    expect([...new Set(duplikat)]).toEqual([]);
  });

  it('setiap area punya hub, label, dan minimal satu item', () => {
    for (const s of NAV_SECTIONS) {
      expect(s.hub).toMatch(/^\/area\//);
      expect(s.label).toBeTruthy();
      expect(s.items.length).toBeGreaterThan(0);
    }
  });
});

describe('setiap menu punya rute di App.jsx', () => {
  // Tanpa ini, sebuah entri menu bisa lolos review dan baru ketahuan
  // sebagai 404 setelah dipakai di lapangan.
  const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
  const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

  it('semua path menu terdaftar sebagai rute', () => {
    const hilang = ALL_ITEMS.map((i) => i.path).filter((p) => !routes.includes(p));
    expect(hilang, 'menu tanpa rute').toEqual([]);
  });

  it('semua hub area terdaftar lewat rute /area/:areaId', () => {
    expect(routes).toContain('/area/:areaId');
  });
});

describe('findSectionByPath', () => {
  it('mengembalikan null untuk beranda', () => {
    expect(findSectionByPath('/')).toBeNull();
  });

  it('mengembalikan null untuk path kosong atau tak dikenal', () => {
    expect(findSectionByPath('')).toBeNull();
    expect(findSectionByPath(undefined)).toBeNull();
    // Path yang tidak terdaftar harus tetap terbuka, bukan terkunci diam-diam.
    expect(findSectionByPath('/halaman-yang-belum-ada')).toBeNull();
  });

  it('mencocokkan path menu yang persis sama', () => {
    expect(findSectionByPath('/tortoise')).toBe('tortoise');
    expect(findSectionByPath('/health')).toBe('health');
  });

  it('rute detail mewarisi section induknya', () => {
    expect(findSectionByPath('/breeding/abc123')).toBe('breeding');
    expect(findSectionByPath('/panduan-penyakit/xyz')).toBe('panduan-penyakit');
  });

  it('memilih pencocokan awalan terpanjang, bukan yang pertama ditemukan', () => {
    // "/breeding-calendar" tidak boleh tertangkap sebagai "/breeding".
    expect(findSectionByPath('/breeding-calendar')).toBe('breeding-calendar');
    expect(findSectionByPath('/breeding-planner')).toBe('breeding-planner');
  });

  it('mencakup halaman pengaturan dan halaman di luar menu', () => {
    expect(findSectionByPath('/printer-config')).toBe('printer-config');
    expect(findSectionByPath('/passport')).toBe('tortoise');
  });

  it('setiap section yang dikembalikan benar-benar berasal dari daftar menu', () => {
    const dikenal = new Set(ALL_ITEMS.map((i) => i.section));
    for (const i of ALL_ITEMS) {
      expect(dikenal.has(findSectionByPath(i.path))).toBe(true);
    }
  });
});

describe('findParentArea', () => {
  it('halaman di dalam area mengembalikan hub induknya', () => {
    const area = findParentArea('/tortoise');
    expect(area?.hub).toMatch(/^\/area\//);
    expect(area?.label).toBeTruthy();
  });

  it('beranda dan hub itu sendiri tidak punya induk', () => {
    expect(findParentArea('/')).toBeNull();
    expect(findParentArea(NAV_SECTIONS[0].hub)).toBeNull();
  });
});
